-- ============================================================
-- MIGRATION 004: FEATURE FLAGS & USAGE METRICS
-- Per-hospital feature overrides + daily usage snapshots
-- ============================================================

-- ============================================================
-- TABLE: feature_flags
-- Super admin can override plan features per hospital
-- e.g., give a Starter hospital access to Pharmacy for 30 days
-- ============================================================

CREATE TABLE feature_flags (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  flag_name       TEXT        NOT NULL,
                              -- Module flags
                              -- 'pharmacy', 'lab', 'radiology', 'ot', 'icu',
                              -- 'inventory', 'hr', 'emr', 'reports', 'api_access',
                              -- 'white_label'
                              -- Limit override flags
                              -- 'max_doctors_override', 'max_staff_override',
                              -- 'max_patients_override', 'max_beds_override',
                              -- 'max_storage_gb_override'
                              -- Beta flags
                              -- 'beta_telemedicine', 'beta_ai_diagnosis'
  is_enabled      BOOLEAN     NOT NULL DEFAULT FALSE,
  -- For limit overrides, store the new value here
  override_value  JSONB,      -- e.g., {"limit": 100} for max_doctors_override
  -- Who set it and when
  enabled_by      UUID        REFERENCES super_admins(id),
  enabled_at      TIMESTAMPTZ,
  -- Expiry (NULL = permanent)
  expires_at      TIMESTAMPTZ,
  -- Audit
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, flag_name)
);

CREATE TRIGGER set_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_feature_flags_hospital_id  ON feature_flags(hospital_id);
CREATE INDEX idx_feature_flags_flag_name    ON feature_flags(flag_name);
CREATE INDEX idx_feature_flags_expires_at   ON feature_flags(expires_at)
  WHERE expires_at IS NOT NULL;
CREATE INDEX idx_feature_flags_is_enabled   ON feature_flags(hospital_id, is_enabled)
  WHERE is_enabled = TRUE;

-- ============================================================
-- TABLE: usage_metrics
-- Daily snapshot of each hospital's resource consumption
-- Used for billing overages, analytics, and limit enforcement
-- ============================================================

CREATE TABLE usage_metrics (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  metric_date           DATE          NOT NULL,
  -- Staff counts
  active_doctors        INT           NOT NULL DEFAULT 0,
  active_staff          INT           NOT NULL DEFAULT 0,
  -- Patient counts
  total_patients        INT           NOT NULL DEFAULT 0,
  new_patients_today    INT           NOT NULL DEFAULT 0,
  -- Activity
  appointments_count    INT           NOT NULL DEFAULT 0,
  invoices_generated    INT           NOT NULL DEFAULT 0,
  prescriptions_count   INT           NOT NULL DEFAULT 0,
  lab_orders_count      INT           NOT NULL DEFAULT 0,
  -- Storage
  storage_used_mb       DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- API
  api_calls             INT           NOT NULL DEFAULT 0,
  -- Beds
  beds_occupied         INT           NOT NULL DEFAULT 0,
  total_beds            INT           NOT NULL DEFAULT 0,
  -- Revenue (from hospital's own billing module)
  daily_revenue         DECIMAL(10,2) NOT NULL DEFAULT 0,

  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, metric_date)
);

CREATE TRIGGER set_usage_metrics_updated_at
  BEFORE UPDATE ON usage_metrics
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_usage_metrics_hospital_id   ON usage_metrics(hospital_id);
CREATE INDEX idx_usage_metrics_metric_date   ON usage_metrics(metric_date DESC);
CREATE INDEX idx_usage_metrics_hospital_date ON usage_metrics(hospital_id, metric_date DESC);

-- ============================================================
-- FUNCTION: check if a hospital has access to a feature
-- Checks plan features first, then per-hospital overrides
-- ============================================================

CREATE OR REPLACE FUNCTION hospital_has_feature(p_hospital_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_plan_has_feature  BOOLEAN;
  v_flag_enabled      BOOLEAN;
  v_flag_expires      TIMESTAMPTZ;
BEGIN
  -- Check plan-level feature
  SELECT
    CASE p_feature
      WHEN 'emr'          THEN pl.has_emr
      WHEN 'pharmacy'     THEN pl.has_pharmacy
      WHEN 'lab'          THEN pl.has_lab
      WHEN 'radiology'    THEN pl.has_radiology
      WHEN 'ot'           THEN pl.has_ot
      WHEN 'icu'          THEN pl.has_icu
      WHEN 'inventory'    THEN pl.has_inventory
      WHEN 'hr'           THEN pl.has_hr
      WHEN 'reports'      THEN pl.has_reports
      WHEN 'api_access'   THEN pl.has_api_access
      WHEN 'white_label'  THEN pl.has_white_label
      ELSE FALSE
    END
  INTO v_plan_has_feature
  FROM plans pl
  JOIN subscriptions s ON s.plan_id = pl.id
  WHERE s.hospital_id = p_hospital_id
    AND s.status IN ('trialing', 'active')
  LIMIT 1;

  -- If plan already includes feature, return true
  IF v_plan_has_feature = TRUE THEN
    RETURN TRUE;
  END IF;

  -- Check per-hospital feature flag override
  SELECT is_enabled, expires_at
  INTO v_flag_enabled, v_flag_expires
  FROM feature_flags
  WHERE hospital_id = p_hospital_id
    AND flag_name = p_feature
  LIMIT 1;

  -- Flag exists, is enabled, and not expired
  IF v_flag_enabled = TRUE AND (v_flag_expires IS NULL OR v_flag_expires > NOW()) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- feature_flags: hospital reads own flags; super admin manages all
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags_tenant_read" ON feature_flags
  FOR SELECT USING (
    hospital_id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "feature_flags_super_admin_write" ON feature_flags
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "feature_flags_super_admin_update" ON feature_flags
  FOR UPDATE USING (is_super_admin());

CREATE POLICY "feature_flags_super_admin_delete" ON feature_flags
  FOR DELETE USING (is_super_admin());

-- usage_metrics: hospital reads own; super admin reads all; system writes
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_metrics_tenant_read" ON usage_metrics
  FOR SELECT USING (
    hospital_id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "usage_metrics_system_write" ON usage_metrics
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "usage_metrics_system_update" ON usage_metrics
  FOR UPDATE USING (is_super_admin());
