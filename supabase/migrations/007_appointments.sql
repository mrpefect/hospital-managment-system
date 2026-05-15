-- ============================================================
-- MIGRATION 007: APPOINTMENTS MODULE
-- Departments, doctor schedules, appointment booking
-- ============================================================

-- ============================================================
-- TABLE: departments
-- Hospital departments (shared across appointments & HR)
-- ============================================================

CREATE TABLE departments (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,
  code            TEXT,                   -- e.g., 'CARDIO', 'OPD', 'ICU'
  description     TEXT,
  department_type TEXT        NOT NULL DEFAULT 'clinical'
                    CHECK (department_type IN ('clinical', 'diagnostic', 'administrative', 'support')),
  head_profile_id UUID        REFERENCES profiles(id),
  location        TEXT,                   -- e.g., 'Block A, Floor 2'
  phone_extension TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TRIGGER set_departments_updated_at
  BEFORE UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_departments_hospital_id ON departments(hospital_id);
CREATE INDEX idx_departments_is_active   ON departments(hospital_id, is_active);

-- Wire up profiles.department_id FK now that departments exists
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_department
  FOREIGN KEY (department_id) REFERENCES departments(id);

-- ============================================================
-- TABLE: doctor_profiles
-- Extended profile for doctors (linked to profiles table)
-- ============================================================

CREATE TABLE doctor_profiles (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id             UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  profile_id              UUID        REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  specialization          TEXT        NOT NULL,   -- 'Cardiology', 'General Medicine', etc.
  qualification           TEXT,                   -- 'MBBS, MD (Medicine)'
  registration_number     TEXT,                   -- Medical Council registration
  years_of_experience     INT         NOT NULL DEFAULT 0,
  consultation_fee        DECIMAL(10,2) NOT NULL DEFAULT 0,
  consultation_duration_min INT       NOT NULL DEFAULT 20,  -- slot duration in minutes
  bio                     TEXT,
  languages               TEXT[],
  is_available_today      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_doctor_profiles_updated_at
  BEFORE UPDATE ON doctor_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_doctor_profiles_hospital_id  ON doctor_profiles(hospital_id);
CREATE INDEX idx_doctor_profiles_profile_id   ON doctor_profiles(profile_id);
CREATE INDEX idx_doctor_profiles_specialization ON doctor_profiles(hospital_id, specialization);

-- ============================================================
-- TABLE: doctor_schedules
-- Weekly recurring schedule for each doctor
-- ============================================================

CREATE TABLE doctor_schedules (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  doctor_id       UUID        REFERENCES doctor_profiles(id) ON DELETE CASCADE NOT NULL,
  day_of_week     INT         NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun, 6=Sat
  start_time      TIME        NOT NULL,
  end_time        TIME        NOT NULL,
  max_slots       INT         NOT NULL DEFAULT 20,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  effective_from  DATE        NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (start_time < end_time)
);

CREATE TRIGGER set_doctor_schedules_updated_at
  BEFORE UPDATE ON doctor_schedules
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_doctor_schedules_doctor_id     ON doctor_schedules(doctor_id);
CREATE INDEX idx_doctor_schedules_hospital_id   ON doctor_schedules(hospital_id);
CREATE INDEX idx_doctor_schedules_day           ON doctor_schedules(doctor_id, day_of_week);

-- ============================================================
-- TABLE: doctor_leaves
-- Track doctor unavailability (vacation, conference, sick)
-- ============================================================

CREATE TABLE doctor_leaves (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  doctor_id       UUID        REFERENCES doctor_profiles(id) ON DELETE CASCADE NOT NULL,
  leave_date      DATE        NOT NULL,
  leave_type      TEXT        NOT NULL DEFAULT 'other'
                    CHECK (leave_type IN ('vacation', 'sick', 'conference', 'emergency', 'other')),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (doctor_id, leave_date)
);

CREATE INDEX idx_doctor_leaves_doctor_id    ON doctor_leaves(doctor_id);
CREATE INDEX idx_doctor_leaves_leave_date   ON doctor_leaves(hospital_id, leave_date);

-- ============================================================
-- TABLE: appointments
-- Core appointment booking record
-- ============================================================

CREATE TABLE appointments (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id         UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id          UUID        REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  doctor_id           UUID        REFERENCES doctor_profiles(id) NOT NULL,
  department_id       UUID        REFERENCES departments(id),
  -- Scheduling
  appointment_date    DATE        NOT NULL,
  start_time          TIME        NOT NULL,
  end_time            TIME        NOT NULL,
  -- Type
  appointment_type    TEXT        NOT NULL DEFAULT 'opd'
                        CHECK (appointment_type IN ('opd', 'ipd', 'emergency', 'follow_up', 'teleconsult')),
  visit_type          TEXT        NOT NULL DEFAULT 'new'
                        CHECK (visit_type IN ('new', 'follow_up', 'review')),
  -- Status lifecycle
  status              TEXT        NOT NULL DEFAULT 'scheduled'
                        CHECK (status IN (
                          'scheduled',    -- booked
                          'confirmed',    -- doctor confirmed
                          'checked_in',   -- patient arrived
                          'in_progress',  -- being seen by doctor
                          'completed',    -- visit done
                          'cancelled',    -- cancelled before visit
                          'no_show',      -- patient didn't come
                          'rescheduled'   -- rescheduled (points to new appointment)
                        )),
  -- Token / queue
  token_number        INT,
  queue_position      INT,
  -- Booking details
  booking_source      TEXT        NOT NULL DEFAULT 'reception'
                        CHECK (booking_source IN ('reception', 'online', 'phone', 'walk_in', 'referral')),
  booked_by           UUID        REFERENCES profiles(id),
  -- Chief complaint (reason for visit)
  chief_complaint     TEXT,
  notes               TEXT,
  -- Fees
  consultation_fee    DECIMAL(10,2),
  is_paid             BOOLEAN     NOT NULL DEFAULT FALSE,
  -- Rescheduling
  rescheduled_from    UUID        REFERENCES appointments(id),
  cancellation_reason TEXT,
  cancelled_by        UUID        REFERENCES profiles(id),
  cancelled_at        TIMESTAMPTZ,
  -- Timing
  checked_in_at       TIMESTAMPTZ,
  consultation_start  TIMESTAMPTZ,
  consultation_end    TIMESTAMPTZ,
  -- Reminders
  reminder_sent       BOOLEAN     NOT NULL DEFAULT FALSE,
  reminder_sent_at    TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_appointments_hospital_id       ON appointments(hospital_id);
CREATE INDEX idx_appointments_patient_id        ON appointments(patient_id);
CREATE INDEX idx_appointments_doctor_id         ON appointments(doctor_id);
CREATE INDEX idx_appointments_department_id     ON appointments(department_id);
CREATE INDEX idx_appointments_date              ON appointments(hospital_id, appointment_date);
CREATE INDEX idx_appointments_status            ON appointments(hospital_id, status);
CREATE INDEX idx_appointments_doctor_date       ON appointments(doctor_id, appointment_date, status);
CREATE INDEX idx_appointments_patient_history   ON appointments(patient_id, appointment_date DESC);

-- ============================================================
-- TABLE: appointment_status_history
-- Immutable log of every status transition
-- ============================================================

CREATE TABLE appointment_status_history (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  appointment_id  UUID        REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  from_status     TEXT,
  to_status       TEXT        NOT NULL,
  changed_by      UUID        REFERENCES profiles(id),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appt_status_history_appt_id ON appointment_status_history(appointment_id);

-- Trigger to auto-log status changes
CREATE OR REPLACE FUNCTION log_appointment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO appointment_status_history (
      hospital_id, appointment_id, from_status, to_status
    ) VALUES (
      NEW.hospital_id, NEW.id, OLD.status, NEW.status
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_appointment_status_change
  AFTER UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION log_appointment_status_change();

-- Auto-assign token numbers per doctor per day
CREATE OR REPLACE FUNCTION assign_appointment_token()
RETURNS TRIGGER AS $$
DECLARE
  v_token INT;
BEGIN
  IF NEW.token_number IS NULL THEN
    SELECT COALESCE(MAX(token_number), 0) + 1 INTO v_token
    FROM appointments
    WHERE doctor_id = NEW.doctor_id
      AND appointment_date = NEW.appointment_date
      AND status NOT IN ('cancelled', 'no_show');

    NEW.token_number := v_token;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_appointment_insert_set_token
  BEFORE INSERT ON appointments
  FOR EACH ROW EXECUTE FUNCTION assign_appointment_token();

-- ============================================================
-- TABLE: beds
-- Track inpatient beds (IPD module)
-- ============================================================

CREATE TABLE wards (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,
  ward_type       TEXT        NOT NULL DEFAULT 'general'
                    CHECK (ward_type IN ('general', 'icu', 'nicu', 'picu', 'maternity', 'surgery', 'private', 'semi_private')),
  floor           TEXT,
  total_beds      INT         NOT NULL DEFAULT 0,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TRIGGER set_wards_updated_at
  BEFORE UPDATE ON wards
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TABLE beds (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  ward_id         UUID        REFERENCES wards(id) ON DELETE CASCADE NOT NULL,
  bed_number      TEXT        NOT NULL,
  bed_type        TEXT        NOT NULL DEFAULT 'general'
                    CHECK (bed_type IN ('general', 'icu', 'isolation', 'maternity', 'pediatric', 'private')),
  status          TEXT        NOT NULL DEFAULT 'available'
                    CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance', 'blocked')),
  -- Currently occupied by
  current_patient_id UUID     REFERENCES patients(id),
  admitted_at        TIMESTAMPTZ,
  is_active          BOOLEAN  NOT NULL DEFAULT TRUE,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, ward_id, bed_number)
);

CREATE TRIGGER set_beds_updated_at
  BEFORE UPDATE ON beds
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_beds_hospital_id  ON beds(hospital_id);
CREATE INDEX idx_beds_ward_id      ON beds(ward_id);
CREATE INDEX idx_beds_status       ON beds(hospital_id, status);

-- ============================================================
-- TABLE: admissions
-- IPD admission records
-- ============================================================

CREATE TABLE admissions (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id         UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  patient_id          UUID        REFERENCES patients(id) NOT NULL,
  doctor_id           UUID        REFERENCES doctor_profiles(id) NOT NULL,
  department_id       UUID        REFERENCES departments(id),
  bed_id              UUID        REFERENCES beds(id),
  appointment_id      UUID        REFERENCES appointments(id),
  -- Admission details
  admission_number    TEXT        NOT NULL,
  admission_type      TEXT        NOT NULL DEFAULT 'elective'
                        CHECK (admission_type IN ('elective', 'emergency', 'maternity', 'day_care', 'transfer')),
  admission_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_discharge  DATE,
  actual_discharge    TIMESTAMPTZ,
  -- Diagnosis at admission
  presenting_complaint TEXT,
  diagnosis_at_admission TEXT,
  -- Status
  status              TEXT        NOT NULL DEFAULT 'admitted'
                        CHECK (status IN ('admitted', 'discharged', 'transferred', 'absconded', 'death')),
  discharge_type      TEXT        CHECK (discharge_type IN ('regular', 'lama', 'transfer', 'death', 'absconded')),
  discharge_notes     TEXT,
  -- Admitting staff
  admitted_by         UUID        REFERENCES profiles(id),
  discharged_by       UUID        REFERENCES profiles(id),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, admission_number)
);

CREATE TRIGGER set_admissions_updated_at
  BEFORE UPDATE ON admissions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_admissions_hospital_id  ON admissions(hospital_id);
CREATE INDEX idx_admissions_patient_id   ON admissions(patient_id);
CREATE INDEX idx_admissions_doctor_id    ON admissions(doctor_id);
CREATE INDEX idx_admissions_status       ON admissions(hospital_id, status);
CREATE INDEX idx_admissions_date         ON admissions(hospital_id, admission_date DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "departments_tenant_isolation" ON departments
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctor_profiles_tenant_isolation" ON doctor_profiles
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctor_schedules_tenant_isolation" ON doctor_schedules
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE doctor_leaves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "doctor_leaves_tenant_isolation" ON doctor_leaves
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_tenant_isolation" ON appointments
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE appointment_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appt_status_history_tenant_isolation" ON appointment_status_history
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wards_tenant_isolation" ON wards
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "beds_tenant_isolation" ON beds
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admissions_tenant_isolation" ON admissions
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());
