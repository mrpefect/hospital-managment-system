-- ============================================================
-- MIGRATION 008: ELECTRONIC MEDICAL RECORDS (EMR)
-- Encounters, vitals, diagnoses, prescriptions, notes
-- ============================================================

-- ============================================================
-- TABLE: medical_records (encounters / visits)
-- One record per patient visit/consultation
-- ============================================================

CREATE TABLE medical_records (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id            UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id        UUID        REFERENCES appointments(id),
  admission_id          UUID        REFERENCES admissions(id),
  doctor_id             UUID        REFERENCES doctor_profiles(id) NOT NULL,
  department_id         UUID        REFERENCES departments(id),
  -- Record metadata
  record_number         TEXT        NOT NULL,
  record_type           TEXT        NOT NULL DEFAULT 'outpatient'
                          CHECK (record_type IN ('outpatient', 'inpatient', 'emergency', 'teleconsult')),
  visit_date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Chief complaint & history
  chief_complaint       TEXT,
  history_of_present_illness TEXT,
  past_medical_history  TEXT,
  family_history        TEXT,
  social_history        TEXT,
  review_of_systems     TEXT,
  -- Examination
  general_examination   TEXT,
  systemic_examination  JSONB       NOT NULL DEFAULT '{}',  -- organ systems
  -- Clinical findings
  clinical_notes        TEXT,
  assessment            TEXT,
  -- Plan
  treatment_plan        TEXT,
  follow_up_date        DATE,
  follow_up_notes       TEXT,
  -- Status
  status                TEXT        NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'final', 'amended', 'cancelled')),
  finalized_at          TIMESTAMPTZ,
  -- Signature
  signed_by             UUID        REFERENCES profiles(id),
  signed_at             TIMESTAMPTZ,
  -- Soft delete
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, record_number)
);

CREATE TRIGGER set_medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_medical_records_hospital_id    ON medical_records(hospital_id);
CREATE INDEX idx_medical_records_patient_id     ON medical_records(patient_id);
CREATE INDEX idx_medical_records_doctor_id      ON medical_records(doctor_id);
CREATE INDEX idx_medical_records_appointment_id ON medical_records(appointment_id);
CREATE INDEX idx_medical_records_visit_date     ON medical_records(patient_id, visit_date DESC);
CREATE INDEX idx_medical_records_status         ON medical_records(hospital_id, status);

-- Auto-generate record number
CREATE OR REPLACE FUNCTION set_medical_record_number()
RETURNS TRIGGER AS $$
DECLARE
  v_seq INT;
BEGIN
  IF NEW.record_number IS NULL OR NEW.record_number = '' THEN
    SELECT COUNT(*) + 1 INTO v_seq
    FROM medical_records
    WHERE hospital_id = NEW.hospital_id
      AND TO_CHAR(created_at, 'YYYYMM') = TO_CHAR(NOW(), 'YYYYMM');
    NEW.record_number := 'EMR-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_medical_record_insert
  BEFORE INSERT ON medical_records
  FOR EACH ROW EXECUTE FUNCTION set_medical_record_number();

-- ============================================================
-- TABLE: vitals
-- Vital signs recorded per visit (can have multiple per encounter)
-- ============================================================

CREATE TABLE vitals (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id        UUID          REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  medical_record_id UUID          REFERENCES medical_records(id) ON DELETE CASCADE,
  admission_id      UUID          REFERENCES admissions(id),
  -- Measurements
  weight_kg         DECIMAL(6,2),
  height_cm         DECIMAL(5,2),
  bmi               DECIMAL(4,2)  GENERATED ALWAYS AS (
                      CASE WHEN height_cm > 0 AND weight_kg > 0
                        THEN ROUND((weight_kg / POWER(height_cm / 100.0, 2))::NUMERIC, 2)
                        ELSE NULL
                      END
                    ) STORED,
  -- Cardiovascular
  systolic_bp       INT,
  diastolic_bp      INT,
  heart_rate        INT,          -- bpm
  -- Respiratory
  respiratory_rate  INT,
  spo2_percent      INT,          -- oxygen saturation
  -- Temperature
  temperature_c     DECIMAL(4,1),
  temperature_site  TEXT          CHECK (temperature_site IN ('oral', 'axillary', 'rectal', 'tympanic', 'forehead')),
  -- Blood sugar
  blood_glucose     DECIMAL(6,2), -- mg/dL
  glucose_type      TEXT          CHECK (glucose_type IN ('fasting', 'post_prandial', 'random', 'hba1c')),
  -- Pain
  pain_score        INT           CHECK (pain_score BETWEEN 0 AND 10),
  -- Recorded by
  recorded_by       UUID          REFERENCES profiles(id),
  recorded_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vitals_patient_id        ON vitals(patient_id);
CREATE INDEX idx_vitals_hospital_id       ON vitals(hospital_id);
CREATE INDEX idx_vitals_medical_record_id ON vitals(medical_record_id);
CREATE INDEX idx_vitals_recorded_at       ON vitals(patient_id, recorded_at DESC);

-- ============================================================
-- TABLE: diagnoses
-- ICD-10 diagnoses linked to a medical record
-- ============================================================

CREATE TABLE diagnoses (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id        UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  medical_record_id UUID        REFERENCES medical_records(id) ON DELETE CASCADE NOT NULL,
  -- ICD-10
  icd_code          TEXT,               -- e.g., 'J00', 'I10'
  icd_description   TEXT,               -- e.g., 'Acute nasopharyngitis', 'Essential hypertension'
  diagnosis_type    TEXT        NOT NULL DEFAULT 'primary'
                      CHECK (diagnosis_type IN ('primary', 'secondary', 'differential', 'rule_out')),
  diagnosis_status  TEXT        NOT NULL DEFAULT 'confirmed'
                      CHECK (diagnosis_status IN ('confirmed', 'provisional', 'ruled_out', 'resolved')),
  onset_date        DATE,
  is_chronic        BOOLEAN     NOT NULL DEFAULT FALSE,
  severity          TEXT        CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
  notes             TEXT,
  diagnosed_by      UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_diagnoses_updated_at
  BEFORE UPDATE ON diagnoses
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_diagnoses_patient_id       ON diagnoses(patient_id);
CREATE INDEX idx_diagnoses_medical_record   ON diagnoses(medical_record_id);
CREATE INDEX idx_diagnoses_icd_code         ON diagnoses(hospital_id, icd_code);
CREATE INDEX idx_diagnoses_hospital_id      ON diagnoses(hospital_id);

-- ============================================================
-- TABLE: prescriptions
-- Header record for a prescription
-- ============================================================

CREATE TABLE prescriptions (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id            UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  medical_record_id     UUID        REFERENCES medical_records(id),
  doctor_id             UUID        REFERENCES doctor_profiles(id) NOT NULL,
  -- Prescription metadata
  prescription_number   TEXT        NOT NULL,
  prescribed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until           DATE,
  -- Status
  status                TEXT        NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'dispensed', 'partially_dispensed', 'cancelled', 'expired')),
  -- Notes
  advice                TEXT,       -- general advice to patient
  diet_instructions     TEXT,
  activity_restrictions TEXT,
  follow_up_instructions TEXT,
  -- Pharmacy
  dispensed_at          TIMESTAMPTZ,
  dispensed_by          UUID        REFERENCES profiles(id),
  pharmacy_notes        TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, prescription_number)
);

CREATE TRIGGER set_prescriptions_updated_at
  BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_prescriptions_patient_id       ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_hospital_id      ON prescriptions(hospital_id);
CREATE INDEX idx_prescriptions_medical_record   ON prescriptions(medical_record_id);
CREATE INDEX idx_prescriptions_doctor_id        ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_status           ON prescriptions(hospital_id, status);

-- Auto-generate prescription number
CREATE OR REPLACE FUNCTION set_prescription_number()
RETURNS TRIGGER AS $$
DECLARE v_seq INT;
BEGIN
  IF NEW.prescription_number IS NULL OR NEW.prescription_number = '' THEN
    SELECT COUNT(*) + 1 INTO v_seq
    FROM prescriptions
    WHERE hospital_id = NEW.hospital_id
      AND TO_CHAR(created_at, 'YYYYMMDD') = TO_CHAR(NOW(), 'YYYYMMDD');
    NEW.prescription_number := 'RX-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_seq::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_prescription_insert
  BEFORE INSERT ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION set_prescription_number();

-- ============================================================
-- TABLE: prescription_items
-- Individual drug line items on a prescription
-- ============================================================

CREATE TABLE prescription_items (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  prescription_id       UUID          REFERENCES prescriptions(id) ON DELETE CASCADE NOT NULL,
  -- Drug details (may reference pharmacy.drugs if available)
  drug_id               UUID,         -- references drugs(id) in 010_pharmacy.sql
  drug_name             TEXT          NOT NULL,
  generic_name          TEXT,
  drug_form             TEXT          CHECK (drug_form IN ('tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'patch', 'suppository', 'powder', 'other')),
  strength              TEXT,                 -- e.g., '500mg', '5mg/5ml'
  -- Dosage
  dosage_instructions   TEXT          NOT NULL, -- e.g., '1 tablet twice daily after meals'
  frequency             TEXT,                 -- e.g., 'BID', 'TID', 'OD', 'SOS'
  route                 TEXT          DEFAULT 'oral'
                          CHECK (route IN ('oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'sublingual', 'rectal', 'nasal', 'ophthalmic', 'otic')),
  -- Duration
  duration_days         INT,
  quantity              DECIMAL(8,2),
  unit                  TEXT,                 -- 'tablets', 'ml', 'vials'
  -- Special instructions
  instructions          TEXT,                 -- e.g., 'Take with food', 'Avoid sunlight'
  is_sos                BOOLEAN       NOT NULL DEFAULT FALSE,  -- as-needed
  -- Substitution
  allow_substitution    BOOLEAN       NOT NULL DEFAULT TRUE,
  -- Sort order on prescription
  sort_order            INT           NOT NULL DEFAULT 1,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prescription_items_prescription_id ON prescription_items(prescription_id);
CREATE INDEX idx_prescription_items_hospital_id     ON prescription_items(hospital_id);
CREATE INDEX idx_prescription_items_drug_id         ON prescription_items(drug_id) WHERE drug_id IS NOT NULL;

-- ============================================================
-- TABLE: lab_orders (from EMR side)
-- Doctor orders a lab test during a consultation
-- (Full lab result tracking in 011_laboratory.sql)
-- ============================================================

CREATE TABLE lab_referrals (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id        UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  medical_record_id UUID        REFERENCES medical_records(id),
  doctor_id         UUID        REFERENCES doctor_profiles(id) NOT NULL,
  referral_type     TEXT        NOT NULL CHECK (referral_type IN ('lab', 'radiology', 'specialist', 'physio', 'other')),
  referred_to       TEXT,               -- department name or doctor name
  referred_to_id    UUID,               -- references doctor_profiles.id if internal
  reason            TEXT,
  urgency           TEXT        NOT NULL DEFAULT 'routine'
                      CHECK (urgency IN ('routine', 'urgent', 'stat')),
  notes             TEXT,
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'acknowledged', 'completed', 'cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_lab_referrals_updated_at
  BEFORE UPDATE ON lab_referrals
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_lab_referrals_patient_id ON lab_referrals(patient_id);
CREATE INDEX idx_lab_referrals_hospital_id ON lab_referrals(hospital_id);
CREATE INDEX idx_lab_referrals_status     ON lab_referrals(hospital_id, status);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "medical_records_tenant_isolation" ON medical_records
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vitals_tenant_isolation" ON vitals
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diagnoses_tenant_isolation" ON diagnoses
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescriptions_tenant_isolation" ON prescriptions
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prescription_items_tenant_isolation" ON prescription_items
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE lab_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lab_referrals_tenant_isolation" ON lab_referrals
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());
