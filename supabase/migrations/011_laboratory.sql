-- ============================================================
-- MIGRATION 011: LABORATORY MODULE
-- Test catalog, orders, results, reports
-- ============================================================

-- ============================================================
-- TABLE: lab_test_categories
-- e.g., Haematology, Biochemistry, Microbiology, Radiology
-- ============================================================

CREATE TABLE lab_test_categories (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,
  code            TEXT,
  description     TEXT,
  department_type TEXT        NOT NULL DEFAULT 'lab'
                    CHECK (department_type IN ('lab', 'radiology', 'pathology', 'microbiology', 'other')),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TRIGGER set_lab_test_categories_updated_at
  BEFORE UPDATE ON lab_test_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_lab_test_categories_hospital_id ON lab_test_categories(hospital_id);

-- ============================================================
-- TABLE: lab_test_catalog
-- Master list of all tests available at this hospital
-- ============================================================

CREATE TABLE lab_test_catalog (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id         UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  category_id         UUID          REFERENCES lab_test_categories(id),
  -- Test identity
  name                TEXT          NOT NULL,
  short_name          TEXT,
  code                TEXT,                     -- internal lab code / LOINC code
  -- Sample requirements
  sample_type         TEXT          NOT NULL DEFAULT 'blood'
                        CHECK (sample_type IN ('blood', 'urine', 'stool', 'sputum', 'swab', 'csf', 'tissue', 'other')),
  sample_volume       TEXT,                     -- e.g., '3 mL EDTA'
  container           TEXT,                     -- e.g., 'Red top', 'EDTA tube'
  -- Turnaround
  tat_hours           INT           NOT NULL DEFAULT 24,    -- expected hours to result
  -- Pricing
  price               DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Reference ranges (JSON for flexible structure)
  reference_ranges    JSONB         NOT NULL DEFAULT '[]',
                                    -- [{"gender": "male", "age_min": 0, "age_max": 120, "unit": "g/dL", "min": 13.5, "max": 17.5, "flag_low": "L", "flag_high": "H"}]
  -- Method
  method              TEXT,                     -- e.g., 'Colorimetric', 'ELISA', 'PCR'
  unit                TEXT,
  -- Status
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  requires_fasting    BOOLEAN       NOT NULL DEFAULT FALSE,
  is_profile_test     BOOLEAN       NOT NULL DEFAULT FALSE,   -- part of a panel
  special_instructions TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, code)
);

CREATE TRIGGER set_lab_test_catalog_updated_at
  BEFORE UPDATE ON lab_test_catalog
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_lab_test_catalog_hospital_id  ON lab_test_catalog(hospital_id);
CREATE INDEX idx_lab_test_catalog_category_id  ON lab_test_catalog(category_id);
CREATE INDEX idx_lab_test_catalog_is_active    ON lab_test_catalog(hospital_id, is_active);
CREATE INDEX idx_lab_test_catalog_name_trgm    ON lab_test_catalog USING GIN(name gin_trgm_ops);

-- ============================================================
-- TABLE: lab_test_profiles
-- Bundle of tests ordered together (CBC, LFT, KFT, etc.)
-- ============================================================

CREATE TABLE lab_test_profiles (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT          NOT NULL,
  code            TEXT,
  description     TEXT,
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TABLE lab_profile_tests (
  profile_id      UUID          REFERENCES lab_test_profiles(id) ON DELETE CASCADE NOT NULL,
  test_id         UUID          REFERENCES lab_test_catalog(id) ON DELETE CASCADE NOT NULL,
  sort_order      INT           NOT NULL DEFAULT 1,
  PRIMARY KEY (profile_id, test_id)
);

-- ============================================================
-- TABLE: lab_orders
-- A lab order is created by a doctor for a patient
-- ============================================================

CREATE TABLE lab_orders (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id            UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id             UUID        REFERENCES doctor_profiles(id) NOT NULL,
  medical_record_id     UUID        REFERENCES medical_records(id),
  admission_id          UUID        REFERENCES admissions(id),
  invoice_id            UUID        REFERENCES hospital_invoices(id),
  -- Order details
  order_number          TEXT        NOT NULL,
  ordered_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  urgency               TEXT        NOT NULL DEFAULT 'routine'
                          CHECK (urgency IN ('routine', 'urgent', 'stat', 'asap')),
  -- Sample collection
  sample_collected_at   TIMESTAMPTZ,
  sample_collected_by   UUID        REFERENCES profiles(id),
  barcode               TEXT,
  -- Status lifecycle
  status                TEXT        NOT NULL DEFAULT 'ordered'
                          CHECK (status IN (
                            'ordered',          -- doctor placed order
                            'sample_pending',   -- awaiting sample collection
                            'sample_collected', -- sample in lab
                            'processing',       -- tests being run
                            'partial_results',  -- some results ready
                            'results_ready',    -- all results done
                            'reported',         -- doctor reviewed and signed
                            'cancelled'
                          )),
  -- Reporting
  reported_at           TIMESTAMPTZ,
  reported_by           UUID        REFERENCES profiles(id),
  verified_by           UUID        REFERENCES profiles(id),
  verified_at           TIMESTAMPTZ,
  -- Delivery
  report_sent           BOOLEAN     NOT NULL DEFAULT FALSE,
  report_sent_at        TIMESTAMPTZ,
  report_url            TEXT,
  -- Clinical info
  clinical_notes        TEXT,
  fasting               BOOLEAN     NOT NULL DEFAULT FALSE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, order_number)
);

CREATE TRIGGER set_lab_orders_updated_at
  BEFORE UPDATE ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_lab_orders_hospital_id    ON lab_orders(hospital_id);
CREATE INDEX idx_lab_orders_patient_id     ON lab_orders(patient_id);
CREATE INDEX idx_lab_orders_doctor_id      ON lab_orders(doctor_id);
CREATE INDEX idx_lab_orders_status         ON lab_orders(hospital_id, status);
CREATE INDEX idx_lab_orders_ordered_at     ON lab_orders(hospital_id, ordered_at DESC);
CREATE INDEX idx_lab_orders_barcode        ON lab_orders(barcode) WHERE barcode IS NOT NULL;

-- Auto-generate lab order number
CREATE OR REPLACE FUNCTION set_lab_order_number()
RETURNS TRIGGER AS $$
DECLARE v_seq INT;
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    SELECT COUNT(*) + 1 INTO v_seq
    FROM lab_orders
    WHERE hospital_id = NEW.hospital_id
      AND TO_CHAR(created_at, 'YYYYMMDD') = TO_CHAR(NOW(), 'YYYYMMDD');
    NEW.order_number := 'LAB-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_lab_order_insert
  BEFORE INSERT ON lab_orders
  FOR EACH ROW EXECUTE FUNCTION set_lab_order_number();

-- ============================================================
-- TABLE: lab_order_items
-- Individual tests within a lab order
-- ============================================================

CREATE TABLE lab_order_items (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  order_id        UUID          REFERENCES lab_orders(id) ON DELETE CASCADE NOT NULL,
  test_id         UUID          REFERENCES lab_test_catalog(id) NOT NULL,
  profile_id      UUID          REFERENCES lab_test_profiles(id),
  -- Pricing
  price           DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Status per test
  status          TEXT          NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  -- Sample
  sample_type     TEXT,
  -- Result
  result_entered  BOOLEAN       NOT NULL DEFAULT FALSE,
  result_at       TIMESTAMPTZ,
  notes           TEXT,
  sort_order      INT           NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_lab_order_items_updated_at
  BEFORE UPDATE ON lab_order_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_lab_order_items_order_id   ON lab_order_items(order_id);
CREATE INDEX idx_lab_order_items_test_id    ON lab_order_items(test_id);
CREATE INDEX idx_lab_order_items_hospital   ON lab_order_items(hospital_id);

-- ============================================================
-- TABLE: lab_results
-- Result values for each test ordered
-- ============================================================

CREATE TABLE lab_results (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  order_item_id         UUID          REFERENCES lab_order_items(id) ON DELETE CASCADE NOT NULL,
  test_id               UUID          REFERENCES lab_test_catalog(id) NOT NULL,
  -- Result
  result_value          TEXT,                   -- the measured value (TEXT to handle all types)
  result_numeric        DECIMAL(12,4),          -- numeric copy for trending
  unit                  TEXT,
  reference_range       TEXT,                   -- e.g., '13.5-17.5'
  -- Interpretation
  flag                  TEXT          CHECK (flag IN ('normal', 'low', 'high', 'critical_low', 'critical_high', 'abnormal', 'pending')),
  is_critical           BOOLEAN       NOT NULL DEFAULT FALSE,
  -- Notes
  interpretation        TEXT,
  comments              TEXT,
  -- Sub-tests (for panels like CBC with components)
  component_name        TEXT,         -- e.g., 'Haemoglobin', 'WBC' within CBC
  parent_result_id      UUID          REFERENCES lab_results(id),
  -- Entry
  entered_by            UUID          REFERENCES profiles(id),
  entered_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  verified_by           UUID          REFERENCES profiles(id),
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_lab_results_updated_at
  BEFORE UPDATE ON lab_results
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_lab_results_order_item_id  ON lab_results(order_item_id);
CREATE INDEX idx_lab_results_test_id        ON lab_results(test_id);
CREATE INDEX idx_lab_results_hospital_id    ON lab_results(hospital_id);
CREATE INDEX idx_lab_results_is_critical    ON lab_results(hospital_id, is_critical)
  WHERE is_critical = TRUE;

-- ============================================================
-- TABLE: radiology_orders
-- Imaging orders (X-ray, CT, MRI, Ultrasound)
-- ============================================================

CREATE TABLE radiology_orders (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id            UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id             UUID        REFERENCES doctor_profiles(id) NOT NULL,
  medical_record_id     UUID        REFERENCES medical_records(id),
  admission_id          UUID        REFERENCES admissions(id),
  -- Order details
  order_number          TEXT        NOT NULL,
  modality              TEXT        NOT NULL
                          CHECK (modality IN ('xray', 'ct', 'mri', 'ultrasound', 'mammography', 'fluoroscopy', 'nuclear_medicine', 'pet', 'other')),
  body_part             TEXT        NOT NULL,
  laterality            TEXT        CHECK (laterality IN ('left', 'right', 'bilateral', 'midline', 'na')),
  clinical_indication   TEXT,
  contrast_required     BOOLEAN     NOT NULL DEFAULT FALSE,
  urgency               TEXT        NOT NULL DEFAULT 'routine'
                          CHECK (urgency IN ('routine', 'urgent', 'stat')),
  -- Status
  status                TEXT        NOT NULL DEFAULT 'ordered'
                          CHECK (status IN ('ordered', 'scheduled', 'in_progress', 'images_acquired', 'reported', 'cancelled')),
  scheduled_at          TIMESTAMPTZ,
  performed_at          TIMESTAMPTZ,
  performed_by          UUID        REFERENCES profiles(id),
  -- Report
  impression            TEXT,
  findings              TEXT,
  report_url            TEXT,
  reported_by           UUID        REFERENCES profiles(id),
  reported_at           TIMESTAMPTZ,
  -- Billing
  price                 DECIMAL(10,2) NOT NULL DEFAULT 0,
  invoice_id            UUID        REFERENCES hospital_invoices(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, order_number)
);

CREATE TRIGGER set_radiology_orders_updated_at
  BEFORE UPDATE ON radiology_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_radiology_orders_hospital_id ON radiology_orders(hospital_id);
CREATE INDEX idx_radiology_orders_patient_id  ON radiology_orders(patient_id);
CREATE INDEX idx_radiology_orders_status      ON radiology_orders(hospital_id, status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE lab_test_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_test_categories_tenant_isolation" ON lab_test_categories
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE lab_test_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_test_catalog_tenant_isolation" ON lab_test_catalog
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE lab_test_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_test_profiles_tenant_isolation" ON lab_test_profiles
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE lab_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_orders_tenant_isolation" ON lab_orders
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE lab_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_order_items_tenant_isolation" ON lab_order_items
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_results_tenant_isolation" ON lab_results
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE radiology_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "radiology_orders_tenant_isolation" ON radiology_orders
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());
