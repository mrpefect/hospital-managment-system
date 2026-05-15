-- ============================================================
-- MIGRATION 001: PLATFORM CORE
-- Super admins, subscription plans, hospitals, profiles
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- UTILITY: auto-update updated_at timestamp
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TABLE: super_admins
-- ============================================================

CREATE TABLE super_admins (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name         TEXT        NOT NULL,
  email             TEXT        NOT NULL UNIQUE,
  role              TEXT        NOT NULL DEFAULT 'super_admin'
                                CHECK (role IN ('super_admin', 'platform_support', 'platform_analyst')),
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_super_admins_updated_at
  BEFORE UPDATE ON super_admins
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_super_admins_auth_user_id ON super_admins(auth_user_id);
CREATE INDEX idx_super_admins_email        ON super_admins(email);

-- ============================================================
-- TABLE: plans
-- ============================================================

CREATE TABLE plans (
  id                        UUID           DEFAULT gen_random_uuid() PRIMARY KEY,
  name                      TEXT           NOT NULL,
  slug                      TEXT           NOT NULL UNIQUE,
  description               TEXT,
  price_monthly             DECIMAL(10,2)  NOT NULL,
  price_yearly              DECIMAL(10,2),
  currency                  TEXT           NOT NULL DEFAULT 'INR',
  stripe_price_id_monthly   TEXT,
  stripe_price_id_yearly    TEXT,
  max_doctors               INT            NOT NULL DEFAULT 5,
  max_staff                 INT            NOT NULL DEFAULT 20,
  max_patients              INT            NOT NULL DEFAULT 500,
  max_beds                  INT            NOT NULL DEFAULT 50,
  max_storage_gb            INT            NOT NULL DEFAULT 5,
  has_emr                   BOOLEAN        NOT NULL DEFAULT TRUE,
  has_pharmacy              BOOLEAN        NOT NULL DEFAULT FALSE,
  has_lab                   BOOLEAN        NOT NULL DEFAULT FALSE,
  has_radiology             BOOLEAN        NOT NULL DEFAULT FALSE,
  has_ot                    BOOLEAN        NOT NULL DEFAULT FALSE,
  has_icu                   BOOLEAN        NOT NULL DEFAULT FALSE,
  has_inventory             BOOLEAN        NOT NULL DEFAULT FALSE,
  has_hr                    BOOLEAN        NOT NULL DEFAULT FALSE,
  has_reports               BOOLEAN        NOT NULL DEFAULT TRUE,
  has_api_access            BOOLEAN        NOT NULL DEFAULT FALSE,
  has_white_label           BOOLEAN        NOT NULL DEFAULT FALSE,
  is_active                 BOOLEAN        NOT NULL DEFAULT TRUE,
  is_public                 BOOLEAN        NOT NULL DEFAULT TRUE,
  sort_order                INT            NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_plans_slug      ON plans(slug);
CREATE INDEX idx_plans_is_active ON plans(is_active);

-- ============================================================
-- TABLE: hospitals
-- ============================================================

CREATE TABLE hospitals (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                      TEXT        NOT NULL UNIQUE,
  name                      TEXT        NOT NULL,
  legal_name                TEXT,
  type                      TEXT        CHECK (type IN (
                              'general', 'specialty', 'multi_specialty',
                              'clinic', 'diagnostic_center', 'nursing_home',
                              'dental', 'eye'
                            )),
  registration_number       TEXT        UNIQUE,
  phone                     TEXT        NOT NULL,
  email                     TEXT        NOT NULL,
  website                   TEXT,
  address_line1             TEXT,
  address_line2             TEXT,
  city                      TEXT        NOT NULL,
  state                     TEXT        NOT NULL,
  pincode                   TEXT,
  country                   TEXT        NOT NULL DEFAULT 'IN',
  logo_url                  TEXT,
  primary_color             TEXT        NOT NULL DEFAULT '#2563eb',
  total_beds                INT         NOT NULL DEFAULT 0,
  onboarding_status         TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (onboarding_status IN (
                                'pending', 'in_review', 'approved',
                                'suspended', 'terminated', 'rejected'
                              )),
  onboarding_step           INT         NOT NULL DEFAULT 1,
  onboarding_completed_at   TIMESTAMPTZ,
  approved_by               UUID        REFERENCES super_admins(id),
  approved_at               TIMESTAMPTZ,
  rejection_reason          TEXT,
  suspension_reason         TEXT,
  suspended_at              TIMESTAMPTZ,
  stripe_customer_id        TEXT        UNIQUE,
  settings                  JSONB       NOT NULL DEFAULT '{}',
  timezone                  TEXT        NOT NULL DEFAULT 'Asia/Kolkata',
  currency                  TEXT        NOT NULL DEFAULT 'INR',
  date_format               TEXT        NOT NULL DEFAULT 'DD/MM/YYYY',
  deleted_at                TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_hospitals_updated_at
  BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_hospitals_slug              ON hospitals(slug);
CREATE INDEX idx_hospitals_onboarding_status ON hospitals(onboarding_status);
CREATE INDEX idx_hospitals_city              ON hospitals(city);
CREATE INDEX idx_hospitals_state             ON hospitals(state);
CREATE INDEX idx_hospitals_deleted_at        ON hospitals(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_hospitals_name_trgm         ON hospitals USING GIN(name gin_trgm_ops);
CREATE INDEX idx_hospitals_created_at        ON hospitals(created_at DESC);

-- ============================================================
-- TABLE: profiles
-- ============================================================

CREATE TABLE profiles (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  full_name       TEXT        NOT NULL,
  email           TEXT        NOT NULL,
  phone           TEXT,
  avatar_url      TEXT,
  role            TEXT        NOT NULL
                  CHECK (role IN (
                    'hospital_admin', 'doctor', 'nurse',
                    'receptionist', 'pharmacist', 'lab_technician',
                    'accountant', 'hr_manager', 'patient'
                  )),
  department_id   UUID,
  designation     TEXT,
  employee_id     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_profiles_hospital_id  ON profiles(hospital_id);
CREATE INDEX idx_profiles_role         ON profiles(hospital_id, role);
CREATE INDEX idx_profiles_email        ON profiles(email);
CREATE INDEX idx_profiles_is_active    ON profiles(hospital_id, is_active);

-- ============================================================
-- HELPER FUNCTIONS (defined AFTER tables exist)
-- ============================================================

CREATE OR REPLACE FUNCTION get_hospital_id()
RETURNS UUID AS $$
  SELECT hospital_id
  FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM super_admins
    WHERE auth_user_id = auth.uid()
      AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role
  FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION has_role(roles TEXT[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE auth_user_id = auth.uid()
      AND role = ANY(roles)
      AND is_active = TRUE
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admins_self_read" ON super_admins
  FOR SELECT USING (auth_user_id = auth.uid() OR is_super_admin());

CREATE POLICY "super_admins_self_update" ON super_admins
  FOR UPDATE USING (auth_user_id = auth.uid() OR is_super_admin());

CREATE POLICY "super_admins_super_admin_insert" ON super_admins
  FOR INSERT WITH CHECK (is_super_admin());

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read" ON plans
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "plans_super_admin_all" ON plans
  FOR ALL USING (is_super_admin());

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospitals_tenant_read" ON hospitals
  FOR SELECT USING (
    id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "hospitals_tenant_update" ON hospitals
  FOR UPDATE USING (
    (id = get_hospital_id() AND has_role(ARRAY['hospital_admin']))
    OR is_super_admin()
  );

CREATE POLICY "hospitals_super_admin_insert" ON hospitals
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "hospitals_super_admin_delete" ON hospitals
  FOR DELETE USING (is_super_admin());

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_own_read" ON profiles
  FOR SELECT USING (
    auth_user_id = auth.uid()
    OR hospital_id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "profiles_own_update" ON profiles
  FOR UPDATE USING (
    auth_user_id = auth.uid()
    OR (hospital_id = get_hospital_id() AND has_role(ARRAY['hospital_admin']))
    OR is_super_admin()
  );

CREATE POLICY "profiles_hospital_admin_insert" ON profiles
  FOR INSERT WITH CHECK (
    (hospital_id = get_hospital_id() AND has_role(ARRAY['hospital_admin']))
    OR is_super_admin()
  );

CREATE POLICY "profiles_hospital_admin_delete" ON profiles
  FOR DELETE USING (
    (hospital_id = get_hospital_id() AND has_role(ARRAY['hospital_admin']))
    OR is_super_admin()
  );

-- ============================================================
-- SEED DATA: Default subscription plans
-- ============================================================

INSERT INTO plans (
  name, slug, description,
  price_monthly, price_yearly, currency,
  max_doctors, max_staff, max_patients, max_beds, max_storage_gb,
  has_emr, has_pharmacy, has_lab, has_radiology, has_ot,
  has_icu, has_inventory, has_hr, has_reports, has_api_access, has_white_label,
  is_active, is_public, sort_order
) VALUES
(
  'Starter', 'starter',
  'Perfect for small clinics and single-specialty centers.',
  2999.00, 29999.00, 'INR',
  3, 10, 200, 20, 2,
  TRUE, FALSE, FALSE, FALSE, FALSE,
  FALSE, FALSE, FALSE, TRUE, FALSE, FALSE,
  TRUE, TRUE, 1
),
(
  'Growth', 'growth',
  'Ideal for mid-size hospitals and multi-specialty clinics.',
  7999.00, 79999.00, 'INR',
  15, 50, 2000, 100, 20,
  TRUE, TRUE, TRUE, FALSE, FALSE,
  FALSE, TRUE, FALSE, TRUE, FALSE, FALSE,
  TRUE, TRUE, 2
),
(
  'Enterprise', 'enterprise',
  'Full-featured platform for large hospitals with all modules.',
  19999.00, 199999.00, 'INR',
  100, 500, 50000, 1000, 100,
  TRUE, TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, 3
),
(
  'Custom', 'custom',
  'Tailored plan for hospital groups and chains. Contact us for pricing.',
  0.00, NULL, 'INR',
  9999, 9999, 9999999, 9999, 9999,
  TRUE, TRUE, TRUE, TRUE, TRUE,
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE,
  TRUE, FALSE, 4
);
