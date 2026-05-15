-- ============================================================
-- MIGRATION 003: SUBSCRIPTIONS & INVOICES
-- Hospital subscription lifecycle + invoice history
-- ============================================================

-- ============================================================
-- TABLE: subscriptions
-- One active subscription per hospital at a time
-- ============================================================

CREATE TABLE subscriptions (
  id                        UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id               UUID        REFERENCES hospitals(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan_id                   UUID        REFERENCES plans(id) NOT NULL,
  status                    TEXT        NOT NULL DEFAULT 'trialing'
                              CHECK (status IN (
                                'trialing',     -- in free trial
                                'active',       -- paid and active
                                'past_due',     -- payment failed, grace period
                                'cancelled',    -- cancelled by hospital or us
                                'paused',       -- temporarily paused
                                'unpaid'        -- failed payment, access restricted
                              )),
  billing_cycle             TEXT        CHECK (billing_cycle IN ('monthly', 'yearly')),
  -- Trial
  trial_ends_at             TIMESTAMPTZ,
  -- Current billing period
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  -- Cancellation
  cancelled_at              TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN     NOT NULL DEFAULT FALSE,
  cancellation_reason       TEXT,
  -- Stripe sync
  stripe_subscription_id    TEXT        UNIQUE,
  stripe_latest_invoice_id  TEXT,
  -- Manual overrides (super admin)
  discount_percent          DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_reason           TEXT,
  discount_applied_by       UUID        REFERENCES super_admins(id),
  discount_expires_at       TIMESTAMPTZ,
  -- Notes
  internal_notes            TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_subscriptions_hospital_id          ON subscriptions(hospital_id);
CREATE INDEX idx_subscriptions_plan_id              ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_status               ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_id            ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_current_period_end   ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_trial_ends           ON subscriptions(trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

-- ============================================================
-- TABLE: subscription_invoices
-- Payment history for each subscription period
-- ============================================================

CREATE TABLE subscription_invoices (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  subscription_id       UUID          REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  -- Stripe
  stripe_invoice_id     TEXT          UNIQUE,
  stripe_charge_id      TEXT,
  stripe_payment_intent TEXT,
  -- Invoice details
  invoice_number        TEXT          UNIQUE,
  amount                DECIMAL(10,2) NOT NULL,
  discount_amount       DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_amount            DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount          DECIMAL(10,2) NOT NULL,
  currency              TEXT          NOT NULL DEFAULT 'INR',
  status                TEXT          NOT NULL
                          CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  -- Billing period this invoice covers
  period_start          TIMESTAMPTZ,
  period_end            TIMESTAMPTZ,
  -- URLs
  invoice_pdf_url       TEXT,
  hosted_invoice_url    TEXT,
  -- Payment
  paid_at               TIMESTAMPTZ,
  payment_method        TEXT,         -- 'card', 'upi', 'netbanking', 'manual'
  -- Retry tracking
  attempt_count         INT           NOT NULL DEFAULT 0,
  next_payment_attempt  TIMESTAMPTZ,
  -- Notes
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_subscription_invoices_updated_at
  BEFORE UPDATE ON subscription_invoices
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_sub_invoices_hospital_id      ON subscription_invoices(hospital_id);
CREATE INDEX idx_sub_invoices_subscription_id  ON subscription_invoices(subscription_id);
CREATE INDEX idx_sub_invoices_status           ON subscription_invoices(status);
CREATE INDEX idx_sub_invoices_stripe_id        ON subscription_invoices(stripe_invoice_id);
CREATE INDEX idx_sub_invoices_created_at       ON subscription_invoices(created_at DESC);
CREATE INDEX idx_sub_invoices_paid_at          ON subscription_invoices(paid_at DESC)
  WHERE paid_at IS NOT NULL;

-- ============================================================
-- TABLE: subscription_plan_changes
-- Audit trail of plan upgrades/downgrades
-- ============================================================

CREATE TABLE subscription_plan_changes (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID        REFERENCES subscriptions(id) ON DELETE CASCADE NOT NULL,
  from_plan_id    UUID        REFERENCES plans(id),
  to_plan_id      UUID        REFERENCES plans(id) NOT NULL,
  change_type     TEXT        NOT NULL CHECK (change_type IN ('upgrade', 'downgrade', 'initial', 'reactivation')),
  changed_by      TEXT        NOT NULL CHECK (changed_by IN ('hospital', 'super_admin', 'stripe_webhook', 'system')),
  changed_by_id   UUID,       -- super_admin.id or profile.id depending on changed_by
  effective_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sub_plan_changes_hospital_id ON subscription_plan_changes(hospital_id);
CREATE INDEX idx_sub_plan_changes_sub_id      ON subscription_plan_changes(subscription_id);

-- ============================================================
-- FUNCTION: get current plan for a hospital (with feature flags)
-- ============================================================

CREATE OR REPLACE FUNCTION get_hospital_plan_features(p_hospital_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan plans;
  v_features JSONB;
BEGIN
  SELECT p.* INTO v_plan
  FROM plans p
  JOIN subscriptions s ON s.plan_id = p.id
  WHERE s.hospital_id = p_hospital_id
    AND s.status IN ('trialing', 'active')
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN '{}'::JSONB;
  END IF;

  v_features := jsonb_build_object(
    'plan_name', v_plan.name,
    'plan_slug', v_plan.slug,
    'max_doctors', v_plan.max_doctors,
    'max_staff', v_plan.max_staff,
    'max_patients', v_plan.max_patients,
    'max_beds', v_plan.max_beds,
    'max_storage_gb', v_plan.max_storage_gb,
    'has_emr', v_plan.has_emr,
    'has_pharmacy', v_plan.has_pharmacy,
    'has_lab', v_plan.has_lab,
    'has_radiology', v_plan.has_radiology,
    'has_ot', v_plan.has_ot,
    'has_icu', v_plan.has_icu,
    'has_inventory', v_plan.has_inventory,
    'has_hr', v_plan.has_hr,
    'has_reports', v_plan.has_reports,
    'has_api_access', v_plan.has_api_access,
    'has_white_label', v_plan.has_white_label
  );

  RETURN v_features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- subscriptions: hospital sees own; super admin sees all
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscriptions_tenant_read" ON subscriptions
  FOR SELECT USING (
    hospital_id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "subscriptions_super_admin_write" ON subscriptions
  FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "subscriptions_super_admin_update" ON subscriptions
  FOR UPDATE USING (is_super_admin());

CREATE POLICY "subscriptions_super_admin_delete" ON subscriptions
  FOR DELETE USING (is_super_admin());

-- subscription_invoices: hospital sees own; super admin sees all
ALTER TABLE subscription_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_invoices_tenant_read" ON subscription_invoices
  FOR SELECT USING (
    hospital_id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "sub_invoices_super_admin_write" ON subscription_invoices
  FOR ALL USING (is_super_admin());

-- subscription_plan_changes: hospital sees own; super admin sees all
ALTER TABLE subscription_plan_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_plan_changes_tenant_read" ON subscription_plan_changes
  FOR SELECT USING (
    hospital_id = get_hospital_id()
    OR is_super_admin()
  );

CREATE POLICY "sub_plan_changes_super_admin_write" ON subscription_plan_changes
  FOR ALL USING (is_super_admin());

-- ============================================================
-- FUNCTION: auto-generate invoice number
-- ============================================================

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT := TO_CHAR(NOW(), 'YYYY');
  v_seq  INT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_seq
  FROM subscription_invoices
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW());

  NEW.invoice_number := 'INV-' || v_year || '-' || LPAD(v_seq::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON subscription_invoices
  FOR EACH ROW
  WHEN (NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();
