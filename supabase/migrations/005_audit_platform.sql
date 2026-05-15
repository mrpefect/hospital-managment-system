-- ============================================================
-- MIGRATION 005: PLATFORM AUDIT LOG & IMPERSONATION
-- Immutable log of all super admin actions + impersonation sessions
-- ============================================================

-- ============================================================
-- TABLE: platform_audit_logs
-- Append-only log of all super admin actions.
-- Never update or delete rows — this is the immutable audit trail.
-- ============================================================

CREATE TABLE platform_audit_logs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Who performed the action
  super_admin_id  UUID        REFERENCES super_admins(id),
  -- For system-generated events (webhooks, cron, etc.)
  actor_type      TEXT        NOT NULL DEFAULT 'super_admin'
                    CHECK (actor_type IN ('super_admin', 'system', 'stripe_webhook', 'hospital_admin')),
  -- What was done
  action          TEXT        NOT NULL,
                              -- e.g., 'hospital.approved', 'hospital.suspended',
                              -- 'hospital.rejected', 'hospital.terminated',
                              -- 'plan.created', 'plan.updated',
                              -- 'subscription.upgraded', 'subscription.downgraded',
                              -- 'feature_flag.enabled', 'feature_flag.disabled',
                              -- 'impersonation.started', 'impersonation.ended'
  -- What was affected
  target_type     TEXT,       -- 'hospital', 'plan', 'subscription', 'feature_flag', 'profile'
  target_id       UUID,
  hospital_id     UUID        REFERENCES hospitals(id),
  -- Human readable description
  description     TEXT,
  -- JSON diff of what changed
  old_values      JSONB,
  new_values      JSONB,
  -- Request context
  ip_address      TEXT,
  user_agent      TEXT,
  -- Severity for filtering
  severity        TEXT        NOT NULL DEFAULT 'info'
                    CHECK (severity IN ('info', 'warning', 'critical')),

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO updated_at — this is append-only
);

-- Partial indexes for common query patterns
CREATE INDEX idx_audit_logs_super_admin_id  ON platform_audit_logs(super_admin_id);
CREATE INDEX idx_audit_logs_hospital_id     ON platform_audit_logs(hospital_id);
CREATE INDEX idx_audit_logs_action          ON platform_audit_logs(action);
CREATE INDEX idx_audit_logs_created_at      ON platform_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_severity        ON platform_audit_logs(severity)
  WHERE severity IN ('warning', 'critical');
CREATE INDEX idx_audit_logs_target          ON platform_audit_logs(target_type, target_id);

-- ============================================================
-- TABLE: impersonation_sessions
-- Records every time a super admin accesses a hospital's panel
-- ============================================================

CREATE TABLE impersonation_sessions (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  super_admin_id          UUID        REFERENCES super_admins(id) NOT NULL,
  hospital_id             UUID        REFERENCES hospitals(id) NOT NULL,
  impersonated_profile_id UUID        REFERENCES profiles(id) NOT NULL,
  -- Why the impersonation was initiated
  reason                  TEXT        NOT NULL,
  -- Token used for the impersonation (hashed, not plaintext)
  session_token_hash      TEXT,
  -- Timing
  started_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at                TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  -- Request context
  ip_address              TEXT,
  user_agent              TEXT,
  -- What was done during this session (from audit log linkage)
  actions_count           INT         NOT NULL DEFAULT 0,
  -- Whether the session ended normally or was force-expired
  end_reason              TEXT        CHECK (end_reason IN ('manual_exit', 'token_expired', 'force_ended_by_admin', 'session_timeout'))
);

CREATE INDEX idx_impersonation_super_admin_id ON impersonation_sessions(super_admin_id);
CREATE INDEX idx_impersonation_hospital_id    ON impersonation_sessions(hospital_id);
CREATE INDEX idx_impersonation_started_at     ON impersonation_sessions(started_at DESC);
CREATE INDEX idx_impersonation_active         ON impersonation_sessions(expires_at)
  WHERE ended_at IS NULL;

-- ============================================================
-- FUNCTION: log_platform_action
-- Convenience function for server actions to write audit logs
-- ============================================================

CREATE OR REPLACE FUNCTION log_platform_action(
  p_action        TEXT,
  p_target_type   TEXT        DEFAULT NULL,
  p_target_id     UUID        DEFAULT NULL,
  p_hospital_id   UUID        DEFAULT NULL,
  p_description   TEXT        DEFAULT NULL,
  p_old_values    JSONB       DEFAULT NULL,
  p_new_values    JSONB       DEFAULT NULL,
  p_severity      TEXT        DEFAULT 'info',
  p_ip_address    TEXT        DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_super_admin_id UUID;
  v_log_id         UUID;
BEGIN
  SELECT id INTO v_super_admin_id
  FROM super_admins
  WHERE auth_user_id = auth.uid()
  LIMIT 1;

  INSERT INTO platform_audit_logs (
    super_admin_id, action, target_type, target_id,
    hospital_id, description, old_values, new_values,
    severity, ip_address, actor_type
  ) VALUES (
    v_super_admin_id, p_action, p_target_type, p_target_id,
    p_hospital_id, p_description, p_old_values, p_new_values,
    p_severity, p_ip_address,
    CASE WHEN v_super_admin_id IS NOT NULL THEN 'super_admin' ELSE 'system' END
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- platform_audit_logs: super admin read only; system inserts only
ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_super_admin_read" ON platform_audit_logs
  FOR SELECT USING (is_super_admin());

CREATE POLICY "audit_logs_hospital_read_own" ON platform_audit_logs
  FOR SELECT USING (
    hospital_id = get_hospital_id()
    AND is_super_admin() = FALSE
  );

CREATE POLICY "audit_logs_system_insert" ON platform_audit_logs
  FOR INSERT WITH CHECK (TRUE);  -- controlled via SECURITY DEFINER function

-- impersonation_sessions: super admin manages; no hospital access
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "impersonation_super_admin_all" ON impersonation_sessions
  FOR ALL USING (is_super_admin());
