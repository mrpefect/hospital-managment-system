-- ============================================================
-- MIGRATION 002: HOSPITAL ONBOARDING FLOW
-- Tracks each step of hospital signup wizard + review notes
-- ============================================================

-- ============================================================
-- TABLE: hospital_onboarding
-- One row per hospital — tracks wizard completion per step
-- ============================================================

CREATE TABLE hospital_onboarding (
  id                          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id                 UUID        REFERENCES hospitals(id) ON DELETE CASCADE UNIQUE NOT NULL,

  -- Step 1: Hospital Information
  step1_completed             BOOLEAN     NOT NULL DEFAULT FALSE,
  step1_completed_at          TIMESTAMPTZ,

  -- Step 2: Plan Selection
  step2_completed             BOOLEAN     NOT NULL DEFAULT FALSE,
  step2_completed_at          TIMESTAMPTZ,
  selected_plan_id            UUID        REFERENCES plans(id),
  billing_cycle               TEXT        CHECK (billing_cycle IN ('monthly', 'yearly')),

  -- Step 3: Admin Account Setup
  step3_completed             BOOLEAN     NOT NULL DEFAULT FALSE,
  step3_completed_at          TIMESTAMPTZ,
  admin_profile_id            UUID        REFERENCES profiles(id),

  -- Step 4: Document Upload (optional)
  step4_completed             BOOLEAN     NOT NULL DEFAULT FALSE,
  step4_completed_at          TIMESTAMPTZ,
  registration_doc_url        TEXT,
  tax_doc_url                 TEXT,
  other_doc_urls              JSONB       NOT NULL DEFAULT '[]',

  -- Review & Approval
  submitted_for_review_at     TIMESTAMPTZ,
  reviewed_by                 UUID        REFERENCES super_admins(id),
  reviewed_at                 TIMESTAMPTZ,
  review_notes                TEXT,

  -- Checklist flags (updated programmatically)
  email_verified              BOOLEAN     NOT NULL DEFAULT FALSE,
  email_verified_at           TIMESTAMPTZ,
  payment_setup               BOOLEAN     NOT NULL DEFAULT FALSE,
  payment_setup_at            TIMESTAMPTZ,
  first_login_done            BOOLEAN     NOT NULL DEFAULT FALSE,
  first_login_at              TIMESTAMPTZ,

  -- Welcome sequence
  welcome_email_sent          BOOLEAN     NOT NULL DEFAULT FALSE,
  welcome_email_sent_at       TIMESTAMPTZ,
  approval_email_sent         BOOLEAN     NOT NULL DEFAULT FALSE,
  approval_email_sent_at      TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_hospital_onboarding_updated_at
  BEFORE UPDATE ON hospital_onboarding
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_hospital_onboarding_hospital_id       ON hospital_onboarding(hospital_id);
CREATE INDEX idx_hospital_onboarding_submitted_review  ON hospital_onboarding(submitted_for_review_at)
  WHERE submitted_for_review_at IS NOT NULL;
CREATE INDEX idx_hospital_onboarding_plan              ON hospital_onboarding(selected_plan_id);

-- ============================================================
-- TABLE: onboarding_notes
-- Internal/external notes added by super admin during review
-- ============================================================

CREATE TABLE onboarding_notes (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  super_admin_id  UUID        REFERENCES super_admins(id) NOT NULL,
  note            TEXT        NOT NULL,
  is_internal     BOOLEAN     NOT NULL DEFAULT TRUE,   -- FALSE = visible to hospital admin
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_onboarding_notes_hospital_id     ON onboarding_notes(hospital_id);
CREATE INDEX idx_onboarding_notes_super_admin_id  ON onboarding_notes(super_admin_id);
CREATE INDEX idx_onboarding_notes_created_at      ON onboarding_notes(hospital_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- hospital_onboarding: hospital admin reads own; super admin reads all
ALTER TABLE hospital_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_onboarding_tenant_read" ON hospital_onboarding
  FOR SELECT USING (
    hospital_id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "hospital_onboarding_tenant_update" ON hospital_onboarding
  FOR UPDATE USING (
    hospital_id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "hospital_onboarding_insert" ON hospital_onboarding
  FOR INSERT WITH CHECK (
    hospital_id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "hospital_onboarding_super_admin_delete" ON hospital_onboarding
  FOR DELETE USING (is_super_admin());

-- onboarding_notes: super admin all; hospital admin sees only non-internal
ALTER TABLE onboarding_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_notes_hospital_read" ON onboarding_notes
  FOR SELECT USING (
    (hospital_id = get_hospital_id() AND is_internal = FALSE)
    OR is_super_admin()
  );

CREATE POLICY "onboarding_notes_super_admin_write" ON onboarding_notes
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "onboarding_notes_super_admin_update" ON onboarding_notes
  FOR UPDATE USING (is_super_admin());

CREATE POLICY "onboarding_notes_super_admin_delete" ON onboarding_notes
  FOR DELETE USING (is_super_admin());

-- ============================================================
-- FUNCTION: auto-create onboarding record when hospital is created
-- ============================================================

CREATE OR REPLACE FUNCTION create_hospital_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO hospital_onboarding (hospital_id, step1_completed, step1_completed_at)
  VALUES (NEW.id, TRUE, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_hospital_created_create_onboarding
  AFTER INSERT ON hospitals
  FOR EACH ROW EXECUTE FUNCTION create_hospital_onboarding();
