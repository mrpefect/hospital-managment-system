-- ============================================================
-- MIGRATION 010: PHARMACY MODULE
-- Drug catalog, stock management, dispensing
-- ============================================================

-- ============================================================
-- TABLE: drug_categories
-- Therapeutic categories / drug classifications
-- ============================================================

CREATE TABLE drug_categories (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,
  description     TEXT,
  parent_id       UUID        REFERENCES drug_categories(id),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TRIGGER set_drug_categories_updated_at
  BEFORE UPDATE ON drug_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_drug_categories_hospital_id ON drug_categories(hospital_id);

-- ============================================================
-- TABLE: drugs
-- Master catalog of drugs stocked by the pharmacy
-- ============================================================

CREATE TABLE drugs (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  category_id           UUID          REFERENCES drug_categories(id),
  -- Drug identity
  name                  TEXT          NOT NULL,       -- brand name
  generic_name          TEXT          NOT NULL,       -- INN generic name
  drug_code             TEXT,                         -- internal code
  -- Formulation
  form                  TEXT          NOT NULL
                          CHECK (form IN ('tablet', 'capsule', 'syrup', 'suspension', 'injection', 'cream', 'ointment', 'drops', 'inhaler', 'patch', 'suppository', 'powder', 'solution', 'lotion', 'gel', 'other')),
  strength              TEXT,                         -- e.g., '500mg', '5mg/5ml'
  unit                  TEXT          NOT NULL DEFAULT 'tablet',
  -- Classification
  drug_class            TEXT,                         -- e.g., 'Antibiotic', 'Analgesic'
  schedule              TEXT          CHECK (schedule IN ('otc', 'h', 'h1', 'x', 'rx', 'not_scheduled')),
  is_narcotic           BOOLEAN       NOT NULL DEFAULT FALSE,
  requires_prescription BOOLEAN       NOT NULL DEFAULT TRUE,
  -- Manufacturer
  manufacturer          TEXT,
  -- Pricing
  purchase_price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price         DECIMAL(10,2) NOT NULL DEFAULT 0,
  mrp                   DECIMAL(10,2),
  tax_percent           DECIMAL(5,2)  NOT NULL DEFAULT 0,
  -- Stock thresholds
  reorder_level         INT           NOT NULL DEFAULT 10,
  reorder_quantity      INT           NOT NULL DEFAULT 50,
  -- Status
  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
  is_formulary          BOOLEAN       NOT NULL DEFAULT TRUE,   -- in hospital formulary
  -- Notes
  storage_instructions  TEXT,         -- e.g., 'Store below 25°C'
  contraindications     TEXT,
  side_effects          TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, drug_code)
);

CREATE TRIGGER set_drugs_updated_at
  BEFORE UPDATE ON drugs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_drugs_hospital_id      ON drugs(hospital_id);
CREATE INDEX idx_drugs_category_id      ON drugs(category_id);
CREATE INDEX idx_drugs_is_active        ON drugs(hospital_id, is_active);
CREATE INDEX idx_drugs_name_trgm        ON drugs USING GIN(name gin_trgm_ops);
CREATE INDEX idx_drugs_generic_trgm     ON drugs USING GIN(generic_name gin_trgm_ops);

-- ============================================================
-- TABLE: drug_batches
-- Each stock entry for a drug (batch/lot tracking)
-- ============================================================

CREATE TABLE drug_batches (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  drug_id           UUID          REFERENCES drugs(id) ON DELETE CASCADE NOT NULL,
  -- Batch details
  batch_number      TEXT          NOT NULL,
  barcode           TEXT,
  -- Dates
  manufacture_date  DATE,
  expiry_date       DATE          NOT NULL,
  -- Purchase
  purchase_date     DATE          NOT NULL DEFAULT CURRENT_DATE,
  supplier_name     TEXT,
  supplier_invoice  TEXT,
  purchase_price    DECIMAL(10,2) NOT NULL,
  mrp               DECIMAL(10,2),
  -- Stock
  quantity_received INT           NOT NULL,
  quantity_current  INT           NOT NULL,
  quantity_reserved INT           NOT NULL DEFAULT 0,  -- reserved for pending orders
  -- Status
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  is_quarantined    BOOLEAN       NOT NULL DEFAULT FALSE,
  quarantine_reason TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, drug_id, batch_number)
);

CREATE TRIGGER set_drug_batches_updated_at
  BEFORE UPDATE ON drug_batches
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_drug_batches_hospital_id   ON drug_batches(hospital_id);
CREATE INDEX idx_drug_batches_drug_id       ON drug_batches(drug_id);
CREATE INDEX idx_drug_batches_expiry_date   ON drug_batches(hospital_id, expiry_date);
CREATE INDEX idx_drug_batches_is_active     ON drug_batches(drug_id, is_active);

-- View for current stock levels per drug
CREATE OR REPLACE VIEW drug_stock_levels AS
SELECT
  d.id             AS drug_id,
  d.hospital_id,
  d.name,
  d.generic_name,
  d.form,
  d.strength,
  d.unit,
  d.reorder_level,
  COALESCE(SUM(b.quantity_current), 0)  AS total_stock,
  COALESCE(SUM(b.quantity_reserved), 0) AS reserved_stock,
  COALESCE(SUM(b.quantity_current) - SUM(b.quantity_reserved), 0) AS available_stock,
  MIN(CASE WHEN b.quantity_current > 0 THEN b.expiry_date ELSE NULL END) AS nearest_expiry,
  COUNT(CASE WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '90 days' AND b.quantity_current > 0 THEN 1 END) AS expiring_soon_batches
FROM drugs d
LEFT JOIN drug_batches b ON b.drug_id = d.id
  AND b.is_active = TRUE
  AND b.is_quarantined = FALSE
  AND b.expiry_date > CURRENT_DATE
WHERE d.is_active = TRUE
GROUP BY d.id, d.hospital_id, d.name, d.generic_name, d.form, d.strength, d.unit, d.reorder_level;

-- ============================================================
-- TABLE: pharmacy_orders
-- Dispensing orders (from prescriptions or direct counter sales)
-- ============================================================

CREATE TABLE pharmacy_orders (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id            UUID          REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  prescription_id       UUID          REFERENCES prescriptions(id),
  invoice_id            UUID          REFERENCES hospital_invoices(id),
  -- Order details
  order_number          TEXT          NOT NULL,
  order_type            TEXT          NOT NULL DEFAULT 'outpatient'
                          CHECK (order_type IN ('outpatient', 'inpatient', 'emergency', 'counter')),
  -- Amounts
  subtotal              DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount            DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount          DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Status
  status                TEXT          NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'processing', 'dispensed', 'partially_dispensed', 'cancelled', 'returned')),
  -- Staff
  ordered_by            UUID          REFERENCES profiles(id),
  dispensed_by          UUID          REFERENCES profiles(id),
  dispensed_at          TIMESTAMPTZ,
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, order_number)
);

CREATE TRIGGER set_pharmacy_orders_updated_at
  BEFORE UPDATE ON pharmacy_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_pharmacy_orders_hospital_id    ON pharmacy_orders(hospital_id);
CREATE INDEX idx_pharmacy_orders_patient_id     ON pharmacy_orders(patient_id);
CREATE INDEX idx_pharmacy_orders_prescription_id ON pharmacy_orders(prescription_id);
CREATE INDEX idx_pharmacy_orders_status         ON pharmacy_orders(hospital_id, status);
CREATE INDEX idx_pharmacy_orders_created_at     ON pharmacy_orders(hospital_id, created_at DESC);

-- ============================================================
-- TABLE: pharmacy_order_items
-- Individual drugs in a pharmacy order
-- ============================================================

CREATE TABLE pharmacy_order_items (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  order_id          UUID          REFERENCES pharmacy_orders(id) ON DELETE CASCADE NOT NULL,
  drug_id           UUID          REFERENCES drugs(id) NOT NULL,
  batch_id          UUID          REFERENCES drug_batches(id),
  -- Prescription link
  prescription_item_id UUID       REFERENCES prescription_items(id),
  -- Dispensing details
  quantity_ordered  DECIMAL(8,2)  NOT NULL,
  quantity_dispensed DECIMAL(8,2) NOT NULL DEFAULT 0,
  unit_price        DECIMAL(10,2) NOT NULL,
  discount_percent  DECIMAL(5,2)  NOT NULL DEFAULT 0,
  tax_percent       DECIMAL(5,2)  NOT NULL DEFAULT 0,
  total_amount      DECIMAL(10,2) NOT NULL,
  -- Status
  is_dispensed      BOOLEAN       NOT NULL DEFAULT FALSE,
  dispensed_at      TIMESTAMPTZ,
  substitution_done BOOLEAN       NOT NULL DEFAULT FALSE,
  substituted_drug_id UUID        REFERENCES drugs(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_pharmacy_order_items_updated_at
  BEFORE UPDATE ON pharmacy_order_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_pharmacy_order_items_order_id  ON pharmacy_order_items(order_id);
CREATE INDEX idx_pharmacy_order_items_drug_id   ON pharmacy_order_items(drug_id);
CREATE INDEX idx_pharmacy_order_items_hospital  ON pharmacy_order_items(hospital_id);

-- Deduct stock when item is dispensed
CREATE OR REPLACE FUNCTION deduct_drug_stock_on_dispense()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_dispensed = TRUE AND OLD.is_dispensed = FALSE AND NEW.batch_id IS NOT NULL THEN
    UPDATE drug_batches
    SET quantity_current = quantity_current - NEW.quantity_dispensed
    WHERE id = NEW.batch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_pharmacy_item_dispensed
  AFTER UPDATE ON pharmacy_order_items
  FOR EACH ROW EXECUTE FUNCTION deduct_drug_stock_on_dispense();

-- ============================================================
-- TABLE: drug_stock_transactions
-- Full audit trail of all stock movements
-- ============================================================

CREATE TABLE drug_stock_transactions (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  drug_id           UUID          REFERENCES drugs(id) NOT NULL,
  batch_id          UUID          REFERENCES drug_batches(id),
  transaction_type  TEXT          NOT NULL
                      CHECK (transaction_type IN (
                        'purchase',       -- stock received
                        'dispense',       -- dispensed to patient
                        'return',         -- returned by patient
                        'adjustment',     -- manual stock adjustment
                        'transfer',       -- transferred between wards
                        'expiry_write_off', -- expired stock removed
                        'damage_write_off'  -- damaged stock removed
                      )),
  quantity          DECIMAL(8,2)  NOT NULL,     -- positive = in, negative = out
  balance_after     INT,                          -- stock after transaction
  reference_type    TEXT,         -- 'pharmacy_order', 'adjustment', etc.
  reference_id      UUID,
  unit_cost         DECIMAL(10,2),
  notes             TEXT,
  performed_by      UUID          REFERENCES profiles(id),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drug_stock_tx_hospital_id  ON drug_stock_transactions(hospital_id);
CREATE INDEX idx_drug_stock_tx_drug_id      ON drug_stock_transactions(drug_id);
CREATE INDEX idx_drug_stock_tx_batch_id     ON drug_stock_transactions(batch_id);
CREATE INDEX idx_drug_stock_tx_created_at   ON drug_stock_transactions(hospital_id, created_at DESC);
CREATE INDEX idx_drug_stock_tx_type         ON drug_stock_transactions(transaction_type);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE drug_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drug_categories_tenant_isolation" ON drug_categories
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drugs_tenant_isolation" ON drugs
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE drug_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drug_batches_tenant_isolation" ON drug_batches
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE pharmacy_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_orders_tenant_isolation" ON pharmacy_orders
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE pharmacy_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pharmacy_order_items_tenant_isolation" ON pharmacy_order_items
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE drug_stock_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "drug_stock_tx_tenant_isolation" ON drug_stock_transactions
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());
