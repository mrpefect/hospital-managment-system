-- ============================================================
-- MIGRATION 012: INVENTORY MODULE
-- Non-pharmaceutical items: consumables, equipment, supplies
-- ============================================================

-- ============================================================
-- TABLE: vendors / suppliers
-- ============================================================

CREATE TABLE vendors (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,
  code            TEXT,
  vendor_type     TEXT        NOT NULL DEFAULT 'supplier'
                    CHECK (vendor_type IN ('supplier', 'manufacturer', 'distributor', 'service_provider')),
  -- Contact
  contact_person  TEXT,
  phone           TEXT,
  email           TEXT,
  website         TEXT,
  -- Address
  address_line1   TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  country         TEXT        NOT NULL DEFAULT 'IN',
  -- Tax
  gstin           TEXT,
  pan             TEXT,
  -- Payment terms
  payment_terms   INT         NOT NULL DEFAULT 30,  -- days
  credit_limit    DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Banking
  bank_name       TEXT,
  bank_account    TEXT,
  bank_ifsc       TEXT,
  -- Rating
  rating          INT         CHECK (rating BETWEEN 1 AND 5),
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TRIGGER set_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_vendors_hospital_id ON vendors(hospital_id);
CREATE INDEX idx_vendors_is_active   ON vendors(hospital_id, is_active);

-- ============================================================
-- TABLE: inventory_categories
-- Hierarchical categories for non-pharma items
-- ============================================================

CREATE TABLE inventory_categories (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id     UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  name            TEXT        NOT NULL,
  code            TEXT,
  parent_id       UUID        REFERENCES inventory_categories(id),
  description     TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, name)
);

CREATE TRIGGER set_inventory_categories_updated_at
  BEFORE UPDATE ON inventory_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_inventory_categories_hospital_id ON inventory_categories(hospital_id);

-- ============================================================
-- TABLE: inventory_items
-- Master catalog of non-pharmaceutical items
-- e.g., surgical gloves, syringes, linen, equipment
-- ============================================================

CREATE TABLE inventory_items (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  category_id       UUID          REFERENCES inventory_categories(id),
  -- Item identity
  name              TEXT          NOT NULL,
  code              TEXT,
  barcode           TEXT,
  description       TEXT,
  item_type         TEXT          NOT NULL DEFAULT 'consumable'
                      CHECK (item_type IN ('consumable', 'equipment', 'instrument', 'linen', 'it_asset', 'furniture', 'medicine_accessory', 'other')),
  -- Units
  unit_of_measure   TEXT          NOT NULL DEFAULT 'piece',
  unit_per_pack     INT           NOT NULL DEFAULT 1,
  -- Pricing
  purchase_price    DECIMAL(10,2) NOT NULL DEFAULT 0,
  selling_price     DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_percent       DECIMAL(5,2)  NOT NULL DEFAULT 0,
  -- Stock thresholds
  reorder_level     INT           NOT NULL DEFAULT 10,
  reorder_quantity  INT           NOT NULL DEFAULT 50,
  minimum_stock     INT           NOT NULL DEFAULT 5,
  maximum_stock     INT           NOT NULL DEFAULT 1000,
  -- Specifications
  specifications    JSONB         NOT NULL DEFAULT '{}',
  -- Storage
  storage_location  TEXT,
  storage_conditions TEXT,
  -- Status
  is_active         BOOLEAN       NOT NULL DEFAULT TRUE,
  is_consumable     BOOLEAN       NOT NULL DEFAULT TRUE,
  is_tracked        BOOLEAN       NOT NULL DEFAULT TRUE,   -- track individual units (for equipment)
  notes             TEXT,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, code)
);

CREATE TRIGGER set_inventory_items_updated_at
  BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_inventory_items_hospital_id  ON inventory_items(hospital_id);
CREATE INDEX idx_inventory_items_category_id  ON inventory_items(category_id);
CREATE INDEX idx_inventory_items_is_active    ON inventory_items(hospital_id, is_active);
CREATE INDEX idx_inventory_items_name_trgm    ON inventory_items USING GIN(name gin_trgm_ops);

-- ============================================================
-- TABLE: inventory_stock
-- Current stock per item per location (warehouse / dept)
-- ============================================================

CREATE TABLE inventory_stock (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id         UUID        REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  item_id             UUID        REFERENCES inventory_items(id) ON DELETE CASCADE NOT NULL,
  location_id         UUID        REFERENCES departments(id),   -- NULL = main store
  location_name       TEXT        NOT NULL DEFAULT 'Main Store',
  quantity_on_hand    INT         NOT NULL DEFAULT 0,
  quantity_reserved   INT         NOT NULL DEFAULT 0,
  quantity_available  INT         GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  last_counted_at     TIMESTAMPTZ,
  last_counted_by     UUID        REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_inventory_stock_updated_at
  BEFORE UPDATE ON inventory_stock
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_inventory_stock_hospital_id ON inventory_stock(hospital_id);
CREATE INDEX idx_inventory_stock_item_id     ON inventory_stock(item_id);
CREATE INDEX idx_inventory_stock_location_id ON inventory_stock(location_id);
-- Expression-based unique index handles NULL location_id correctly
CREATE UNIQUE INDEX idx_inventory_stock_unique
  ON inventory_stock(hospital_id, item_id, COALESCE(location_id::TEXT, 'main'));

-- ============================================================
-- TABLE: purchase_orders
-- Orders raised for procuring inventory items
-- ============================================================

CREATE TABLE purchase_orders (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id       UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  vendor_id         UUID          REFERENCES vendors(id) NOT NULL,
  -- PO details
  po_number         TEXT          NOT NULL,
  po_date           DATE          NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  -- Amounts
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount        DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount      DECIMAL(12,2) NOT NULL DEFAULT 0,
  -- Status
  status            TEXT          NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'submitted', 'approved', 'partially_received', 'received', 'cancelled')),
  -- Approval
  approved_by       UUID          REFERENCES profiles(id),
  approved_at       TIMESTAMPTZ,
  approval_notes    TEXT,
  -- Delivery
  received_at       TIMESTAMPTZ,
  received_by       UUID          REFERENCES profiles(id),
  delivery_notes    TEXT,
  -- Payment
  payment_status    TEXT          NOT NULL DEFAULT 'pending'
                      CHECK (payment_status IN ('pending', 'partial', 'paid')),
  payment_due_date  DATE,
  -- Notes
  terms_conditions  TEXT,
  notes             TEXT,
  created_by        UUID          REFERENCES profiles(id),
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  UNIQUE (hospital_id, po_number)
);

CREATE TRIGGER set_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_purchase_orders_hospital_id  ON purchase_orders(hospital_id);
CREATE INDEX idx_purchase_orders_vendor_id    ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status       ON purchase_orders(hospital_id, status);
CREATE INDEX idx_purchase_orders_po_date      ON purchase_orders(hospital_id, po_date DESC);

-- ============================================================
-- TABLE: purchase_order_items
-- Line items on a purchase order
-- ============================================================

CREATE TABLE purchase_order_items (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id         UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  po_id               UUID          REFERENCES purchase_orders(id) ON DELETE CASCADE NOT NULL,
  item_id             UUID          REFERENCES inventory_items(id) NOT NULL,
  -- Order quantities
  quantity_ordered    INT           NOT NULL,
  quantity_received   INT           NOT NULL DEFAULT 0,
  -- Pricing
  unit_price          DECIMAL(10,2) NOT NULL,
  tax_percent         DECIMAL(5,2)  NOT NULL DEFAULT 0,
  discount_percent    DECIMAL(5,2)  NOT NULL DEFAULT 0,
  total_amount        DECIMAL(10,2) NOT NULL,
  -- Status
  status              TEXT          NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'partial', 'received', 'cancelled')),
  notes               TEXT,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_po_items_updated_at
  BEFORE UPDATE ON purchase_order_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE INDEX idx_po_items_po_id      ON purchase_order_items(po_id);
CREATE INDEX idx_po_items_item_id    ON purchase_order_items(item_id);
CREATE INDEX idx_po_items_hospital   ON purchase_order_items(hospital_id);

-- ============================================================
-- TABLE: inventory_transactions
-- Full audit trail of all stock movements
-- ============================================================

CREATE TABLE inventory_transactions (
  id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id           UUID          REFERENCES hospitals(id) ON DELETE CASCADE NOT NULL,
  item_id               UUID          REFERENCES inventory_items(id) NOT NULL,
  location_id           UUID          REFERENCES departments(id),
  -- Transaction
  transaction_type      TEXT          NOT NULL
                          CHECK (transaction_type IN (
                            'receive',          -- received from PO
                            'issue',            -- issued to department
                            'return',           -- returned from department
                            'transfer',         -- moved between locations
                            'adjustment',       -- manual count adjustment
                            'write_off',        -- damaged/expired
                            'opening_stock'     -- initial stock entry
                          )),
  quantity              INT           NOT NULL,       -- positive = in, negative = out
  balance_after         INT           NOT NULL,       -- stock after this transaction
  unit_cost             DECIMAL(10,2),
  -- References
  reference_type        TEXT,                         -- 'purchase_order', 'issue_slip', etc.
  reference_id          UUID,
  reference_number      TEXT,
  -- Destination/source
  from_location_id      UUID          REFERENCES departments(id),
  to_location_id        UUID          REFERENCES departments(id),
  -- Staff
  performed_by          UUID          REFERENCES profiles(id),
  approved_by           UUID          REFERENCES profiles(id),
  notes                 TEXT,
  created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_tx_hospital_id  ON inventory_transactions(hospital_id);
CREATE INDEX idx_inventory_tx_item_id      ON inventory_transactions(item_id);
CREATE INDEX idx_inventory_tx_type         ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_tx_created_at   ON inventory_transactions(hospital_id, created_at DESC);

-- Update stock on transaction
CREATE OR REPLACE FUNCTION update_inventory_stock_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO inventory_stock (hospital_id, item_id, location_id, location_name, quantity_on_hand)
  VALUES (NEW.hospital_id, NEW.item_id, NEW.location_id, COALESCE(
    (SELECT name FROM departments WHERE id = NEW.location_id), 'Main Store'
  ), 0)
  ON CONFLICT (hospital_id, item_id, COALESCE(location_id::TEXT, 'main'))
  DO NOTHING;

  UPDATE inventory_stock
  SET quantity_on_hand = quantity_on_hand + NEW.quantity
  WHERE hospital_id = NEW.hospital_id
    AND item_id = NEW.item_id
    AND (location_id = NEW.location_id OR (location_id IS NULL AND NEW.location_id IS NULL));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_inventory_transaction_insert
  AFTER INSERT ON inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION update_inventory_stock_on_transaction();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_tenant_isolation" ON vendors
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_categories_tenant_isolation" ON inventory_categories
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_items_tenant_isolation" ON inventory_items
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_stock_tenant_isolation" ON inventory_stock
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_orders_tenant_isolation" ON purchase_orders
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purchase_order_items_tenant_isolation" ON purchase_order_items
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());

ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inventory_transactions_tenant_isolation" ON inventory_transactions
  FOR ALL USING (hospital_id = get_hospital_id() OR is_super_admin());
