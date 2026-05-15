-- ============================================================
-- MIGRATION 009: HOSPITAL BILLING MODULE
-- Patient invoices, line items, payments, insurance claims
-- ============================================================

-- ============================================================
-- TABLE: billing_categories
-- Categories for billing line items (OPD, Lab, Pharmacy, etc.)
-- ============================================================

CREATE TABLE billing_categories (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,
  code            TEXT,
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TRIGGER set_billing_categories_updated_at
  BEFORE UPDATE ON billing_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_billing_categories_hospital_id ON billing_categories(hospital_id);

-- ============================================================
-- TABLE: service_catalog
-- Hospital's fee schedule (consultation, procedures, tests, etc.)
-- ============================================================

CREATE TABLE service_catalog (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  category_id     UUID          REFERENCES billing_categories(id),
  name            TEXT          NOT NULL,
  code            TEXT,                   -- internal service code
  description     TEXT,
  rate            DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_percent     DECIMAL(5,2)  NOT NULL DEFAULT 0,
  is_taxable      BOOLEAN       NOT NULL DEFAULT FALSE,
  unit            TEXT          NOT NULL DEFAULT 'per_visit',  -- 'per_visit', 'per_day', 'per_unit'
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TRIGGER set_service_catalog_updated_at
  BEFORE UPDATE ON service_catalog
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_service_catalog_hospital_id   ON service_catalog(hospital_id);
CREATE INDEX idx_service_catalog_category_id   ON service_catalog(category_id);
CREATE INDEX idx_service_catalog_is_active      ON service_catalog(hospital_id, is_active);

-- ============================================================
-- TABLE: hospital_invoices
-- Main billing invoice for a patient visit
-- ============================================================

CREATE TABLE hospital_invoices (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id            UUID          REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id        UUID          REFERENCES appointments(id),
  admission_id          UUID          REFERENCES admissions(id),
  medical_record_id     UUID          REFERENCES medical_records(id),
  -- Invoice metadata
  invoice_number        TEXT          NOT NULL,
  invoice_date          DATE          NOT NULL DEFAULT CURRENT_DATE,
  invoice_type          TEXT          NOT NULL DEFAULT 'opd'
                          CHECK (invoice_type IN ('opd', 'ipd', 'pharmacy', 'lab', 'radiology', 'procedure', 'misc')),
  -- Amounts (all in hospital's currency)
  subtotal              DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_percent      DECIMAL(5,2)  NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_reason       TEXT,
  tax_amount            DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount           DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_due           DECIMAL(10,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  currency              TEXT          NOT NULL DEFAULT 'INR',
  -- Status
  status                TEXT          NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'pending', 'partial', 'paid', 'void', 'refunded')),
  -- Due date
  due_date              DATE,
  -- Insurance
  insurance_claim_id    UUID,         -- references insurance_claims(id)
  insurance_covered     DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Notes
  notes                 TEXT,
  terms                 TEXT,
  -- Staff
  created_by            UUID          REFERENCES profiles(id),
  -- Void/refund
  voided_at             TIMESTAMPTZ,
  voided_by             UUID          REFERENCES profiles(id),
  void_reason           TEXT,
  -- Soft delete
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, invoice_number)
);

CREATE TRIGGER set_hospital_invoices_updated_at
  BEFORE UPDATE ON hospital_invoices
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_hospital_invoices_hospital_id    ON hospital_invoices(hospital_id);
CREATE INDEX idx_hospital_invoices_patient_id     ON hospital_invoices(patient_id);
CREATE INDEX idx_hospital_invoices_appointment_id ON hospital_invoices(appointment_id);
CREATE INDEX idx_hospital_invoices_status         ON hospital_invoices(hospital_id, status);
CREATE INDEX idx_hospital_invoices_invoice_date   ON hospital_invoices(hospital_id, invoice_date DESC);
CREATE INDEX idx_hospital_invoices_deleted_at     ON hospital_invoices(hospital_id, deleted_at)
  WHERE deleted_at IS NULL;

-- Auto-generate invoice number
CREATE OR REPLACE FUNCTION set_hospital_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  v_slug  TEXT;
  v_seq   INT;
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    SELECT UPPER(LEFT(slug, 4)) INTO v_slug FROM hospitals WHERE id = NEW.hospital_id;
    SELECT COUNT(*) + 1 INTO v_seq
    FROM hospital_invoices
    WHERE hospital_id = NEW.hospital_id
      AND TO_CHAR(created_at, 'YYYYMM') = TO_CHAR(NOW(), 'YYYYMM');
    NEW.invoice_number := v_slug || '-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_hospital_invoice_insert
  BEFORE INSERT ON hospital_invoices
  FOR EACH ROW EXECUTE FUNCTION set_hospital_invoice_number();

-- ============================================================
-- TABLE: invoice_items
-- Line items on a hospital invoice
-- ============================================================

CREATE TABLE invoice_items (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  invoice_id      UUID          REFERENCES hospital_invoices(id) ON DELETE CASCADE NOT NULL,
  service_id      UUID          REFERENCES service_catalog(id),
  -- Item details
  item_name       TEXT          NOT NULL,
  item_code       TEXT,
  description     TEXT,
  category        TEXT,
  -- Pricing
  quantity        DECIMAL(8,2)  NOT NULL DEFAULT 1,
  unit            TEXT          NOT NULL DEFAULT 'unit',
  unit_price      DECIMAL(10,2) NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_percent     DECIMAL(5,2)  NOT NULL DEFAULT 0,
  tax_amount      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount    DECIMAL(10,2) NOT NULL,
  -- Optional links
  doctor_id       UUID          REFERENCES doctor_profiles(id),
  sort_order      INT           NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice_id   ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_hospital_id  ON invoice_items(hospital_id);

-- ============================================================
-- TABLE: payments
-- Each payment made toward a hospital invoice
-- ============================================================

CREATE TABLE payments (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id            UUID          REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  invoice_id            UUID          REFERENCES hospital_invoices(id) ON DELETE CASCADE NOT NULL,
  -- Payment details
  payment_number        TEXT          NOT NULL,
  amount                DECIMAL(10,2) NOT NULL,
  currency              TEXT          NOT NULL DEFAULT 'INR',
  payment_method        TEXT          NOT NULL
                          CHECK (payment_method IN ('cash', 'card', 'upi', 'netbanking', 'cheque', 'dd', 'insurance', 'wallet', 'credit', 'other')),
  -- Method-specific details
  reference_number      TEXT,         -- transaction ID, cheque no, etc.
  bank_name             TEXT,
  card_last4            TEXT,
  upi_id                TEXT,
  -- Status
  status                TEXT          NOT NULL DEFAULT 'completed'
                          CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'reversed')),
  -- Refund
  refunded_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  refund_reason         TEXT,
  refunded_at           TIMESTAMPTZ,
  refunded_by           UUID          REFERENCES profiles(id),
  -- Timing
  paid_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  collected_by          UUID          REFERENCES profiles(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, payment_number)
);

CREATE TRIGGER set_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_payments_hospital_id  ON payments(hospital_id);
CREATE INDEX idx_payments_patient_id   ON payments(patient_id);
CREATE INDEX idx_payments_invoice_id   ON payments(invoice_id);
CREATE INDEX idx_payments_paid_at      ON payments(hospital_id, paid_at DESC);
CREATE INDEX idx_payments_status       ON payments(hospital_id, status);
CREATE INDEX idx_payments_method       ON payments(hospital_id, payment_method);

-- Auto-generate payment number
CREATE OR REPLACE FUNCTION set_payment_number()
RETURNS TRIGGER AS $$
DECLARE v_seq INT;
BEGIN
  IF NEW.payment_number IS NULL OR NEW.payment_number = '' THEN
    SELECT COUNT(*) + 1 INTO v_seq
    FROM payments
    WHERE hospital_id = NEW.hospital_id
      AND TO_CHAR(created_at, 'YYYYMMDD') = TO_CHAR(NOW(), 'YYYYMMDD');
    NEW.payment_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_payment_insert
  BEFORE INSERT ON payments
  FOR EACH ROW EXECUTE FUNCTION set_payment_number();

-- Update invoice paid_amount when a payment is recorded
CREATE OR REPLACE FUNCTION update_invoice_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE hospital_invoices
  SET
    paid_amount = (
      SELECT COALESCE(SUM(amount), 0)
      FROM payments
      WHERE invoice_id = NEW.invoice_id
        AND status = 'completed'
    ),
    status = CASE
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'completed') >= total_amount THEN 'paid'
      WHEN (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = NEW.invoice_id AND status = 'completed') > 0 THEN 'partial'
      ELSE 'pending'
    END
  WHERE id = NEW.invoice_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_payment_insert_update_invoice
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_invoice_paid_amount();

-- ============================================================
-- TABLE: insurance_claims
-- Insurance claims filed for patient bills
-- ============================================================

CREATE TABLE insurance_claims (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id            UUID          REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  invoice_id            UUID          REFERENCES hospital_invoices(id),
  -- Claim details
  claim_number          TEXT          NOT NULL,
  insurance_provider    TEXT          NOT NULL,
  policy_number         TEXT          NOT NULL,
  member_id             TEXT,
  -- Amounts
  claimed_amount        DECIMAL(10,2) NOT NULL,
  approved_amount       DECIMAL(10,2),
  settled_amount        DECIMAL(10,2),
  -- Status
  status                TEXT          NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'settled', 'appealed')),
  -- Dates
  submitted_at          TIMESTAMPTZ,
  approved_at           TIMESTAMPTZ,
  settled_at            TIMESTAMPTZ,
  rejection_reason      TEXT,
  notes                 TEXT,
  created_by            UUID          REFERENCES profiles(id),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, claim_number)
);

CREATE TRIGGER set_insurance_claims_updated_at
  BEFORE UPDATE ON insurance_claims
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_insurance_claims_hospital_id ON insurance_claims(hospital_id);
CREATE INDEX idx_insurance_claims_patient_id  ON insurance_claims(patient_id);
CREATE INDEX idx_insurance_claims_status      ON insurance_claims(hospital_id, status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE billing_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "billing_categories_tenant_isolation" ON billing_categories
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE service_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_catalog_tenant_isolation" ON service_catalog
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE hospital_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospital_invoices_tenant_isolation" ON hospital_invoices
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_tenant_isolation" ON invoice_items
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments_tenant_isolation" ON payments
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insurance_claims_tenant_isolation" ON insurance_claims
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());
