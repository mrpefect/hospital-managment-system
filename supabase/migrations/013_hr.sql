-- ============================================================
-- MIGRATION 013: HUMAN RESOURCES MODULE
-- Staff management, attendance, leave, payroll
-- ============================================================

-- ============================================================
-- TABLE: designations
-- Job titles within the hospital
-- ============================================================

CREATE TABLE designations (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,
  code            TEXT,
  department_id   UUID        REFERENCES departments(id),
  level           INT         NOT NULL DEFAULT 1,   -- hierarchy level (1=entry, 5=senior)
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TRIGGER set_designations_updated_at
  BEFORE UPDATE ON designations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_designations_hospital_id ON designations(hospital_id);

-- ============================================================
-- TABLE: employee_details
-- Extended HR data for staff members (links to profiles)
-- ============================================================

CREATE TABLE employee_details (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  profile_id            UUID        REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  designation_id        UUID        REFERENCES designations(id),
  -- Employment
  employee_number       TEXT        NOT NULL,
  employment_type       TEXT        NOT NULL DEFAULT 'full_time'
                          CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'consultant', 'intern', 'visiting')),
  joining_date          DATE        NOT NULL,
  probation_end_date    DATE,
  confirmation_date     DATE,
  exit_date             DATE,
  exit_reason           TEXT,
  -- Reporting
  reporting_manager_id  UUID        REFERENCES profiles(id),
  -- Personal details
  date_of_birth         DATE,
  gender                TEXT        CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_group           TEXT,
  marital_status        TEXT        CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed', 'other')),
  nationality           TEXT        NOT NULL DEFAULT 'Indian',
  -- Address
  permanent_address     TEXT,
  current_address       TEXT,
  -- Identity
  aadhaar_number        TEXT,
  pan_number            TEXT,
  passport_number       TEXT,
  passport_expiry       DATE,
  -- Emergency contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_rel  TEXT,
  -- Bank details (for payroll)
  bank_name             TEXT,
  bank_account_number   TEXT,
  bank_ifsc             TEXT,
  bank_branch           TEXT,
  -- Documents
  resume_url            TEXT,
  offer_letter_url      TEXT,
  appointment_letter_url TEXT,
  -- Status
  employment_status     TEXT        NOT NULL DEFAULT 'active'
                          CHECK (employment_status IN ('probation', 'active', 'on_leave', 'notice_period', 'inactive', 'terminated')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, employee_number)
);

CREATE TRIGGER set_employee_details_updated_at
  BEFORE UPDATE ON employee_details
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_employee_details_hospital_id    ON employee_details(hospital_id);
CREATE INDEX idx_employee_details_profile_id     ON employee_details(profile_id);
CREATE INDEX idx_employee_details_status         ON employee_details(hospital_id, employment_status);
CREATE INDEX idx_employee_details_designation    ON employee_details(designation_id);

-- ============================================================
-- TABLE: shifts
-- Work shift definitions
-- ============================================================

CREATE TABLE shifts (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,    -- 'Morning Shift', 'Night Shift'
  code            TEXT,
  start_time      TIME        NOT NULL,
  end_time        TIME        NOT NULL,
  duration_hours  DECIMAL(4,2) GENERATED ALWAYS AS (
                    CASE
                      WHEN end_time >= start_time
                        THEN EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
                      ELSE (EXTRACT(EPOCH FROM (end_time + INTERVAL '24 hours' - start_time)) / 3600)
                    END
                  ) STORED,
  is_night_shift  BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE INDEX idx_shifts_hospital_id ON shifts(hospital_id);

-- ============================================================
-- TABLE: staff_attendance
-- Daily attendance record per employee
-- ============================================================

CREATE TABLE staff_attendance (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  profile_id        UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  shift_id          UUID        REFERENCES shifts(id),
  attendance_date   DATE        NOT NULL,
  -- Check-in/out
  check_in_time     TIMESTAMPTZ,
  check_out_time    TIMESTAMPTZ,
  -- Duration (computed)
  duration_hours    DECIMAL(4,2),
  overtime_hours    DECIMAL(4,2) NOT NULL DEFAULT 0,
  -- Status
  status            TEXT        NOT NULL DEFAULT 'present'
                      CHECK (status IN ('present', 'absent', 'half_day', 'late', 'on_leave', 'holiday', 'week_off', 'work_from_home')),
  -- Source
  attendance_source TEXT        NOT NULL DEFAULT 'manual'
                      CHECK (attendance_source IN ('manual', 'biometric', 'app', 'import')),
  -- Approval
  is_approved       BOOLEAN     NOT NULL DEFAULT FALSE,
  approved_by       UUID        REFERENCES profiles(id),
  approved_at       TIMESTAMPTZ,
  -- Notes
  notes             TEXT,
  late_reason       TEXT,
  marked_by         UUID        REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, profile_id, attendance_date)
);

CREATE TRIGGER set_staff_attendance_updated_at
  BEFORE UPDATE ON staff_attendance
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_staff_attendance_hospital_id   ON staff_attendance(hospital_id);
CREATE INDEX idx_staff_attendance_profile_id    ON staff_attendance(profile_id);
CREATE INDEX idx_staff_attendance_date          ON staff_attendance(hospital_id, attendance_date);
CREATE INDEX idx_staff_attendance_status        ON staff_attendance(hospital_id, status);

-- ============================================================
-- TABLE: leave_types
-- Types of leave with accrual rules
-- ============================================================

CREATE TABLE leave_types (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name                  TEXT        NOT NULL,
  code                  TEXT        NOT NULL,
  description           TEXT,
  -- Accrual
  days_per_year         DECIMAL(4,1) NOT NULL DEFAULT 0,
  max_carry_forward     DECIMAL(4,1) NOT NULL DEFAULT 0,
  max_consecutive_days  INT         NOT NULL DEFAULT 30,
  -- Rules
  is_paid               BOOLEAN     NOT NULL DEFAULT TRUE,
  requires_approval     BOOLEAN     NOT NULL DEFAULT TRUE,
  requires_document     BOOLEAN     NOT NULL DEFAULT FALSE,
  notice_days           INT         NOT NULL DEFAULT 1,   -- advance notice required
  -- Applicable to
  applicable_roles      TEXT[]      NOT NULL DEFAULT '{}',  -- empty = all roles
  gender_specific       TEXT        CHECK (gender_specific IN ('all', 'male', 'female')),
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, code)
);

CREATE TRIGGER set_leave_types_updated_at
  BEFORE UPDATE ON leave_types
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_leave_types_hospital_id ON leave_types(hospital_id);

-- Seed default leave types (applied per-hospital via onboarding)
-- These are reference values only; actual per-hospital records are inserted via application logic

-- ============================================================
-- TABLE: leave_balances
-- Annual leave balance per employee per leave type
-- ============================================================

CREATE TABLE leave_balances (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  profile_id        UUID          REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  leave_type_id     UUID          REFERENCES leave_types(id) ON DELETE CASCADE NOT NULL,
  year              INT           NOT NULL,
  -- Balances
  opening_balance   DECIMAL(5,1)  NOT NULL DEFAULT 0,
  accrued           DECIMAL(5,1)  NOT NULL DEFAULT 0,
  taken             DECIMAL(5,1)  NOT NULL DEFAULT 0,
  encashed          DECIMAL(5,1)  NOT NULL DEFAULT 0,
  lapsed            DECIMAL(5,1)  NOT NULL DEFAULT 0,
  closing_balance   DECIMAL(5,1)  GENERATED ALWAYS AS
                      (opening_balance + accrued - taken - encashed - lapsed) STORED,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, profile_id, leave_type_id, year)
);

CREATE TRIGGER set_leave_balances_updated_at
  BEFORE UPDATE ON leave_balances
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_leave_balances_hospital_id   ON leave_balances(hospital_id);
CREATE INDEX idx_leave_balances_profile_id    ON leave_balances(profile_id);
CREATE INDEX idx_leave_balances_year          ON leave_balances(hospital_id, year);

-- ============================================================
-- TABLE: leave_requests
-- Leave application and approval workflow
-- ============================================================

CREATE TABLE leave_requests (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  profile_id        UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  leave_type_id     UUID        REFERENCES leave_types(id) NOT NULL,
  -- Leave period
  from_date         DATE        NOT NULL,
  to_date           DATE        NOT NULL,
  total_days        DECIMAL(4,1) NOT NULL,
  is_half_day       BOOLEAN     NOT NULL DEFAULT FALSE,
  half_day_type     TEXT        CHECK (half_day_type IN ('first_half', 'second_half')),
  -- Reason
  reason            TEXT        NOT NULL,
  document_url      TEXT,
  -- Status
  status            TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'withdrawn')),
  -- Approval chain
  reviewed_by       UUID        REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  review_comments   TEXT,
  -- Cancel
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  -- Cover arrangement
  cover_by          UUID        REFERENCES profiles(id),  -- who covers during leave
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_leave_requests_hospital_id  ON leave_requests(hospital_id);
CREATE INDEX idx_leave_requests_profile_id   ON leave_requests(profile_id);
CREATE INDEX idx_leave_requests_status       ON leave_requests(hospital_id, status);
CREATE INDEX idx_leave_requests_dates        ON leave_requests(from_date, to_date);

-- ============================================================
-- TABLE: salary_structures
-- Base salary template per designation/employee
-- ============================================================

CREATE TABLE salary_structures (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  profile_id            UUID          REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  -- Validity
  effective_from        DATE          NOT NULL,
  effective_until       DATE,
  -- Earnings (monthly)
  basic_salary          DECIMAL(10,2) NOT NULL DEFAULT 0,
  hra                   DECIMAL(10,2) NOT NULL DEFAULT 0,     -- house rent allowance
  transport_allowance   DECIMAL(10,2) NOT NULL DEFAULT 0,
  medical_allowance     DECIMAL(10,2) NOT NULL DEFAULT 0,
  special_allowance     DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_allowances      DECIMAL(10,2) NOT NULL DEFAULT 0,
  gross_salary          DECIMAL(10,2) NOT NULL DEFAULT 0,     -- sum of all earnings
  -- Deductions
  pf_employee           DECIMAL(10,2) NOT NULL DEFAULT 0,     -- Provident Fund (employee)
  pf_employer           DECIMAL(10,2) NOT NULL DEFAULT 0,     -- Provident Fund (employer)
  esi_employee          DECIMAL(10,2) NOT NULL DEFAULT 0,     -- ESI (employee)
  esi_employer          DECIMAL(10,2) NOT NULL DEFAULT 0,     -- ESI (employer)
  professional_tax      DECIMAL(10,2) NOT NULL DEFAULT 0,
  tds                   DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_deductions      DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Net
  net_salary            DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Payment
  payment_mode          TEXT          NOT NULL DEFAULT 'bank_transfer'
                          CHECK (payment_mode IN ('cash', 'bank_transfer', 'cheque')),
  is_active             BOOLEAN       NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_by            UUID          REFERENCES profiles(id),
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_salary_structures_updated_at
  BEFORE UPDATE ON salary_structures
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_salary_structures_hospital_id  ON salary_structures(hospital_id);
CREATE INDEX idx_salary_structures_profile_id   ON salary_structures(profile_id);
CREATE INDEX idx_salary_structures_is_active    ON salary_structures(profile_id, is_active);

-- ============================================================
-- TABLE: payroll_runs
-- Monthly payroll processing runs
-- ============================================================

CREATE TABLE payroll_runs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  pay_month       INT         NOT NULL CHECK (pay_month BETWEEN 1 AND 12),
  pay_year        INT         NOT NULL,
  run_number      TEXT        NOT NULL,
  -- Summary
  total_employees INT         NOT NULL DEFAULT 0,
  total_gross     DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_deductions DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_net       DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Status
  status          TEXT        NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'processing', 'review', 'approved', 'paid', 'cancelled')),
  approved_by     UUID        REFERENCES profiles(id),
  approved_at     TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  payment_date    DATE,
  notes           TEXT,
  created_by      UUID        REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, pay_year, pay_month),
  UNIQUE (hospital_id, run_number)
);

CREATE TRIGGER set_payroll_runs_updated_at
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_payroll_runs_hospital_id ON payroll_runs(hospital_id);
CREATE INDEX idx_payroll_runs_status      ON payroll_runs(hospital_id, status);

-- ============================================================
-- TABLE: payroll_items
-- Individual payslip per employee per payroll run
-- ============================================================

CREATE TABLE payroll_items (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  payroll_run_id        UUID          REFERENCES payroll_runs(id) ON DELETE CASCADE NOT NULL,
  profile_id            UUID          REFERENCES profiles(id) NOT NULL,
  salary_structure_id   UUID          REFERENCES salary_structures(id),
  -- Working days
  total_working_days    INT           NOT NULL DEFAULT 26,
  days_present          DECIMAL(4,1)  NOT NULL DEFAULT 0,
  days_absent           DECIMAL(4,1)  NOT NULL DEFAULT 0,
  days_on_leave         DECIMAL(4,1)  NOT NULL DEFAULT 0,
  overtime_hours        DECIMAL(5,2)  NOT NULL DEFAULT 0,
  -- Earnings
  basic_salary          DECIMAL(10,2) NOT NULL DEFAULT 0,
  hra                   DECIMAL(10,2) NOT NULL DEFAULT 0,
  transport_allowance   DECIMAL(10,2) NOT NULL DEFAULT 0,
  medical_allowance     DECIMAL(10,2) NOT NULL DEFAULT 0,
  special_allowance     DECIMAL(10,2) NOT NULL DEFAULT 0,
  overtime_pay          DECIMAL(10,2) NOT NULL DEFAULT 0,
  bonus                 DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_earnings        DECIMAL(10,2) NOT NULL DEFAULT 0,
  gross_earnings        DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Deductions
  pf_employee           DECIMAL(10,2) NOT NULL DEFAULT 0,
  pf_employer           DECIMAL(10,2) NOT NULL DEFAULT 0,
  esi_employee          DECIMAL(10,2) NOT NULL DEFAULT 0,
  professional_tax      DECIMAL(10,2) NOT NULL DEFAULT 0,
  tds                   DECIMAL(10,2) NOT NULL DEFAULT 0,
  loan_deduction        DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_deductions      DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_deductions      DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Net
  net_salary            DECIMAL(10,2) NOT NULL DEFAULT 0,
  -- Payment
  payment_status        TEXT          NOT NULL DEFAULT 'pending'
                          CHECK (payment_status IN ('pending', 'paid', 'on_hold', 'cancelled')),
  payment_date          DATE,
  payment_reference     TEXT,
  -- Payslip
  payslip_url           TEXT,
  payslip_sent          BOOLEAN       NOT NULL DEFAULT FALSE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (payroll_run_id, profile_id)
);

CREATE TRIGGER set_payroll_items_updated_at
  BEFORE UPDATE ON payroll_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_payroll_items_hospital_id   ON payroll_items(hospital_id);
CREATE INDEX idx_payroll_items_run_id        ON payroll_items(payroll_run_id);
CREATE INDEX idx_payroll_items_profile_id    ON payroll_items(profile_id);
CREATE INDEX idx_payroll_items_status        ON payroll_items(payment_status);

-- ============================================================
-- TABLE: holidays
-- Public & hospital-specific holidays
-- ============================================================

CREATE TABLE holidays (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,
  holiday_date    DATE        NOT NULL,
  holiday_type    TEXT        NOT NULL DEFAULT 'public'
                    CHECK (holiday_type IN ('public', 'optional', 'restricted', 'hospital')),
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, holiday_date, name)
);

CREATE INDEX idx_holidays_hospital_id ON holidays(hospital_id);
CREATE INDEX idx_holidays_date        ON holidays(hospital_id, holiday_date);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "designations_tenant_isolation" ON designations
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE employee_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employee_details_tenant_isolation" ON employee_details
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shifts_tenant_isolation" ON shifts
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_attendance_tenant_isolation" ON staff_attendance
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_types_tenant_isolation" ON leave_types
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_balances_tenant_isolation" ON leave_balances
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leave_requests_tenant_isolation" ON leave_requests
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "salary_structures_hr_only" ON salary_structures
  FOR ALL USING (
    (hospital_id = get_hospital_id() AND has_role(ARRAY['hospital_admin', 'hr_manager']))
    OR (hospital_id = get_hospital_id() AND profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
    OR is_super_admin()
  );

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_runs_hr_only" ON payroll_runs
  FOR ALL USING (
    (hospital_id = get_hospital_id() AND has_role(ARRAY['hospital_admin', 'hr_manager', 'accountant']))
    OR is_super_admin()
  );

ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payroll_items_hr_self" ON payroll_items
  FOR ALL USING (
    (hospital_id = get_hospital_id() AND has_role(ARRAY['hospital_admin', 'hr_manager', 'accountant']))
    OR (hospital_id = get_hospital_id() AND profile_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid()))
    OR is_super_admin()
  );

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays_tenant_isolation" ON holidays
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());
