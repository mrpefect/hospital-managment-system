-- ============================================================
-- MIGRATION 006: PATIENTS MODULE
-- Patient demographics, documents, allergies, emergency contacts
-- ============================================================

-- ============================================================
-- TABLE: patients
-- Core patient demographic record — one per patient per hospital
-- ============================================================

CREATE TABLE patients (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  -- MRN: unique within the hospital
  mrn                   TEXT        NOT NULL,
  -- Personal info
  full_name             TEXT        NOT NULL,
  date_of_birth         DATE,
  gender                TEXT        CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_group           TEXT        CHECK (blood_group IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','unknown')),
  marital_status        TEXT        CHECK (marital_status IN ('single','married','divorced','widowed','other')),
  -- Contact
  phone                 TEXT,
  alternate_phone       TEXT,
  email                 TEXT,
  -- Address
  address_line1         TEXT,
  address_line2         TEXT,
  city                  TEXT,
  state                 TEXT,
  pincode               TEXT,
  country               TEXT        NOT NULL DEFAULT 'IN',
  -- Identity
  aadhaar_number        TEXT,       -- masked in display
  pan_number            TEXT,
  passport_number       TEXT,
  -- Insurance
  insurance_provider    TEXT,
  insurance_policy_no   TEXT,
  insurance_expiry      DATE,
  -- Occupation
  occupation            TEXT,
  employer              TEXT,
  -- Registration
  registered_by         UUID        REFERENCES profiles(id),
  registered_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Status
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  -- Photo
  photo_url             TEXT,
  -- Notes
  notes                 TEXT,
  -- Soft delete
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, mrn)
);

CREATE TRIGGER set_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_patients_hospital_id     ON patients(hospital_id);
CREATE INDEX idx_patients_mrn             ON patients(hospital_id, mrn);
CREATE INDEX idx_patients_phone           ON patients(hospital_id, phone);
CREATE INDEX idx_patients_name_trgm       ON patients USING GIN(full_name gin_trgm_ops);
CREATE INDEX idx_patients_is_active       ON patients(hospital_id, is_active);
CREATE INDEX idx_patients_deleted_at      ON patients(hospital_id, deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_patients_created_at      ON patients(hospital_id, created_at DESC);

-- ============================================================
-- FUNCTION: auto-generate MRN for a new patient
-- Format: HOSPITAL_SLUG-YYYYMM-NNNNNN
-- ============================================================

CREATE OR REPLACE FUNCTION generate_patient_mrn(p_hospital_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_slug        TEXT;
  v_prefix      TEXT;
  v_seq         INT;
  v_mrn         TEXT;
BEGIN
  SELECT UPPER(LEFT(slug, 4)) INTO v_slug
  FROM hospitals
  WHERE id = p_hospital_id;

  v_prefix := v_slug || TO_CHAR(NOW(), 'YYYYMM');

  SELECT COUNT(*) + 1 INTO v_seq
  FROM patients
  WHERE hospital_id = p_hospital_id
    AND TO_CHAR(created_at, 'YYYYMM') = TO_CHAR(NOW(), 'YYYYMM');

  v_mrn := v_prefix || LPAD(v_seq::TEXT, 6, '0');
  RETURN v_mrn;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_patient_mrn()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.mrn IS NULL OR NEW.mrn = '' THEN
    NEW.mrn := generate_patient_mrn(NEW.hospital_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_patient_insert_set_mrn
  BEFORE INSERT ON patients
  FOR EACH ROW EXECUTE FUNCTION set_patient_mrn();

-- ============================================================
-- TABLE: emergency_contacts
-- Each patient can have multiple emergency contacts
-- ============================================================

CREATE TABLE emergency_contacts (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id      UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  full_name       TEXT        NOT NULL,
  relationship    TEXT        NOT NULL,   -- 'spouse', 'parent', 'sibling', 'friend', etc.
  phone           TEXT        NOT NULL,
  alternate_phone TEXT,
  email           TEXT,
  is_primary      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_emergency_contacts_patient_id  ON emergency_contacts(patient_id);
CREATE INDEX idx_emergency_contacts_hospital_id ON emergency_contacts(hospital_id);

-- ============================================================
-- TABLE: patient_allergies
-- Known allergies for a patient
-- ============================================================

CREATE TABLE patient_allergies (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id      UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  allergy_type    TEXT        NOT NULL CHECK (allergy_type IN ('drug', 'food', 'environmental', 'other')),
  allergen        TEXT        NOT NULL,   -- e.g., 'Penicillin', 'Peanuts'
  severity        TEXT        NOT NULL DEFAULT 'moderate'
                    CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
  reaction        TEXT,                   -- description of reaction
  onset_date      DATE,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  recorded_by     UUID        REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_patient_allergies_updated_at
  BEFORE UPDATE ON patient_allergies
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_patient_allergies_patient_id  ON patient_allergies(patient_id);
CREATE INDEX idx_patient_allergies_hospital_id ON patient_allergies(hospital_id);
CREATE INDEX idx_patient_allergies_severity    ON patient_allergies(patient_id, severity);

-- ============================================================
-- TABLE: patient_documents
-- Uploaded files (reports, IDs, insurance cards, etc.)
-- ============================================================

CREATE TABLE patient_documents (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id      UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  document_type   TEXT        NOT NULL
                    CHECK (document_type IN (
                      'id_proof', 'insurance_card', 'lab_report', 'prescription',
                      'discharge_summary', 'radiology', 'consent_form', 'other'
                    )),
  file_name       TEXT        NOT NULL,
  file_url        TEXT        NOT NULL,
  file_size_bytes BIGINT,
  mime_type       TEXT,
  description     TEXT,
  uploaded_by     UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_documents_patient_id  ON patient_documents(patient_id);
CREATE INDEX idx_patient_documents_hospital_id ON patient_documents(hospital_id);
CREATE INDEX idx_patient_documents_type        ON patient_documents(patient_id, document_type);

-- ============================================================
-- TABLE: patient_vital_history
-- Quick log of vitals taken at registration/triage
-- (Full EMR vitals are in 008_emr.sql)
-- ============================================================

CREATE TABLE patient_vitals_summary (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id        UUID          REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  -- Latest known vitals (updated on each visit)
  weight_kg         DECIMAL(5,2),
  height_cm         DECIMAL(5,2),
  bmi               DECIMAL(4,2)  GENERATED ALWAYS AS (
                      CASE WHEN height_cm > 0 AND weight_kg > 0
                        THEN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::NUMERIC, 2)
                        ELSE NULL
                      END
                    ) STORED,
  blood_pressure    TEXT,         -- '120/80'
  pulse_rate        INT,
  temperature_c     DECIMAL(4,1),
  spo2_percent      INT,
  recorded_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  recorded_by       UUID          REFERENCES profiles(id),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_patient_vitals_patient_id  ON patient_vitals_summary(patient_id);
CREATE INDEX idx_patient_vitals_hospital_id ON patient_vitals_summary(hospital_id);
CREATE INDEX idx_patient_vitals_recorded_at ON patient_vitals_summary(patient_id, recorded_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY — all patient tables
-- ============================================================

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patients_tenant_isolation" ON patients
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "emergency_contacts_tenant_isolation" ON emergency_contacts
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE patient_allergies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_allergies_tenant_isolation" ON patient_allergies
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_documents_tenant_isolation" ON patient_documents
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE patient_vitals_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "patient_vitals_tenant_isolation" ON patient_vitals_summary
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());
