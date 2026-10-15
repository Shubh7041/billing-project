-- Store-scoped suppliers, full-receipt purchasing, and inventory ledger schema.
-- Draft purchases do not affect inventory. Posting is intentionally deferred to
-- a later authorized database function; this migration grants no client access.

CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  tax_registration_id text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT suppliers_name_not_blank
    CHECK (name = pg_catalog.btrim(name) AND name <> ''),
  CONSTRAINT suppliers_contact_person_not_blank
    CHECK (contact_person IS NULL OR
      (contact_person = pg_catalog.btrim(contact_person) AND contact_person <> '')),
  CONSTRAINT suppliers_phone_not_blank
    CHECK (phone IS NULL OR (phone = pg_catalog.btrim(phone) AND phone <> '')),
  CONSTRAINT suppliers_email_not_blank
    CHECK (email IS NULL OR (email = pg_catalog.btrim(email) AND email <> '')),
  CONSTRAINT suppliers_tax_registration_id_not_blank
    CHECK (tax_registration_id IS NULL OR
      (tax_registration_id = pg_catalog.btrim(tax_registration_id)
       AND tax_registration_id <> '')),
  CONSTRAINT suppliers_store_id_id_key UNIQUE (store_id, id)
);

-- Supplier names are intentionally not unique: the same supplier may be
-- represented by multiple branches, contacts, or purchasing arrangements.
CREATE INDEX suppliers_store_name_search_idx
  ON public.suppliers (store_id, pg_catalog.lower(pg_catalog.btrim(name)));

-- A supplier is required for each purchase; the supplier's invoice reference
-- is optional and is not assumed unique without a confirmed numbering scope.
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL,
  purchase_number text NOT NULL,
  supplier_invoice_ref text,
  purchase_status text NOT NULL DEFAULT 'draft',
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  line_revision bigint NOT NULL DEFAULT 0,
  reversal_of_purchase_id uuid,
  reversal_reason text,
  subtotal numeric(14, 2),
  total numeric(14, 2),
  created_by_user_id uuid NOT NULL,
  posted_by_user_id uuid,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT purchases_supplier_store_fkey
    FOREIGN KEY (store_id, supplier_id)
    REFERENCES public.suppliers (store_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT purchases_creator_membership_fkey
    FOREIGN KEY (store_id, created_by_user_id)
    REFERENCES public.store_memberships (store_id, user_id)
    ON DELETE RESTRICT,
  CONSTRAINT purchases_poster_membership_fkey
    FOREIGN KEY (store_id, posted_by_user_id)
    REFERENCES public.store_memberships (store_id, user_id)
    ON DELETE RESTRICT,
  CONSTRAINT purchases_reversal_store_fkey
    FOREIGN KEY (store_id, reversal_of_purchase_id)
    REFERENCES public.purchases (store_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT purchases_number_normalized
    CHECK (
      purchase_number = pg_catalog.upper(pg_catalog.btrim(purchase_number))
      AND purchase_number <> ''
    ),
  CONSTRAINT purchases_supplier_invoice_ref_not_blank
    CHECK (supplier_invoice_ref IS NULL OR
      (supplier_invoice_ref = pg_catalog.btrim(supplier_invoice_ref)
       AND supplier_invoice_ref <> '')),
  CONSTRAINT purchases_status_valid
    CHECK (purchase_status IN ('draft', 'posted')),
  CONSTRAINT purchases_line_revision_nonnegative
    CHECK (line_revision >= 0),
  CONSTRAINT purchases_reversal_fields_match
    CHECK (
      (reversal_of_purchase_id IS NULL AND reversal_reason IS NULL)
      OR
      (reversal_of_purchase_id IS NOT NULL
       AND reversal_of_purchase_id <> id
        AND reversal_reason IS NOT NULL
       AND reversal_reason = pg_catalog.btrim(reversal_reason)
       AND reversal_reason <> '')
    ),
  CONSTRAINT purchases_status_fields_match
    CHECK (
      (
        purchase_status = 'draft'
        AND posted_at IS NULL
        AND posted_by_user_id IS NULL
        AND subtotal IS NULL
        AND total IS NULL
      )
      OR
      (
        purchase_status = 'posted'
        AND posted_at IS NOT NULL
        AND posted_by_user_id IS NOT NULL
        AND subtotal IS NOT NULL
        AND subtotal >= 0
        AND subtotal <> 'NaN'::numeric
        AND total IS NOT NULL
        AND total >= 0
        AND total <> 'NaN'::numeric
        AND total = subtotal
      )
    ),
  CONSTRAINT purchases_store_id_id_key UNIQUE (store_id, id),
  CONSTRAINT purchases_store_purchase_number_key UNIQUE (store_id, purchase_number)
);

-- At most one full reversal document may be recorded for an original purchase.
CREATE UNIQUE INDEX purchases_one_reversal_per_purchase_key
  ON public.purchases (store_id, reversal_of_purchase_id)
  WHERE reversal_of_purchase_id IS NOT NULL;

-- Supplier invoice references are searchable but not assumed globally unique:
-- supplier numbering scopes and reuse rules have not been confirmed.
CREATE INDEX purchases_supplier_invoice_search_idx
  ON public.purchases (store_id, supplier_id, supplier_invoice_ref)
  WHERE supplier_invoice_ref IS NOT NULL;

CREATE INDEX purchases_supplier_date_idx
  ON public.purchases (store_id, supplier_id, purchase_date DESC);

CREATE INDEX purchases_creator_idx
  ON public.purchases (store_id, created_by_user_id);

CREATE INDEX purchases_poster_idx
  ON public.purchases (store_id, posted_by_user_id)
  WHERE posted_by_user_id IS NOT NULL;

CREATE TABLE public.purchase_items (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL,
  purchase_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_unit_id uuid NOT NULL,
  reverses_purchase_item_id uuid,
  product_name_snapshot text NOT NULL,
  sku_snapshot text NOT NULL,
  unit_name_snapshot text NOT NULL,
  unit_code_snapshot text NOT NULL,
  base_quantity_per_unit_snapshot numeric NOT NULL,
  quantity numeric NOT NULL,
  unit_cost numeric(14, 2) NOT NULL,
  received_base_quantity numeric GENERATED ALWAYS AS
    (quantity * base_quantity_per_unit_snapshot) STORED,
  line_subtotal numeric(14, 2) GENERATED ALWAYS AS
    (pg_catalog.round(quantity * unit_cost, 2)) STORED,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT purchase_items_purchase_store_fkey
    FOREIGN KEY (store_id, purchase_id)
    REFERENCES public.purchases (store_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT purchase_items_product_store_fkey
    FOREIGN KEY (store_id, product_id)
    REFERENCES public.products (store_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT purchase_items_product_unit_store_fkey
    FOREIGN KEY (store_id, product_id, product_unit_id)
    REFERENCES public.product_units (store_id, product_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT purchase_items_reversed_item_store_fkey
    FOREIGN KEY (store_id, reverses_purchase_item_id)
    REFERENCES public.purchase_items (store_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT purchase_items_quantity_positive_integer
    CHECK (
      quantity > 0
      AND quantity = pg_catalog.trunc(quantity)
      AND quantity <= 999999999999999999
    ),
  CONSTRAINT purchase_items_unit_cost_nonnegative
    CHECK (unit_cost >= 0 AND unit_cost <> 'NaN'::numeric),
  CONSTRAINT purchase_items_base_conversion_snapshot_valid
    CHECK (
      base_quantity_per_unit_snapshot IS NULL
      OR (
        base_quantity_per_unit_snapshot > 0
        AND base_quantity_per_unit_snapshot =
          pg_catalog.trunc(base_quantity_per_unit_snapshot)
        AND base_quantity_per_unit_snapshot <= 999999999999999999
      )
    ),
  CONSTRAINT purchase_items_product_snapshot_not_blank
    CHECK (product_name_snapshot = pg_catalog.btrim(product_name_snapshot)
      AND product_name_snapshot <> ''),
  CONSTRAINT purchase_items_sku_snapshot_not_blank
    CHECK (sku_snapshot = pg_catalog.btrim(sku_snapshot) AND sku_snapshot <> ''),
  CONSTRAINT purchase_items_unit_name_snapshot_not_blank
    CHECK (unit_name_snapshot = pg_catalog.btrim(unit_name_snapshot)
      AND unit_name_snapshot <> ''),
  CONSTRAINT purchase_items_unit_code_snapshot_not_blank
    CHECK (unit_code_snapshot = pg_catalog.btrim(unit_code_snapshot)
      AND unit_code_snapshot <> ''),
  CONSTRAINT purchase_items_store_purchase_id_key
    UNIQUE (store_id, purchase_id, id),
  CONSTRAINT purchase_items_store_id_key UNIQUE (store_id, id)
);

-- Supports product/unit foreign-key checks and product-scoped purchase history.
CREATE INDEX purchase_items_product_unit_idx
  ON public.purchase_items (store_id, product_id, product_unit_id);

CREATE UNIQUE INDEX purchase_items_reverse_once_key
  ON public.purchase_items (store_id, reverses_purchase_item_id)
  WHERE reverses_purchase_item_id IS NOT NULL;

CREATE TABLE public.inventory_balances (
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  on_hand_base_quantity numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT inventory_balances_pkey PRIMARY KEY (store_id, product_id),
  CONSTRAINT inventory_balances_product_store_fkey
    FOREIGN KEY (store_id, product_id)
    REFERENCES public.products (store_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT inventory_balances_quantity_valid
    CHECK (
      on_hand_base_quantity >= 0
      AND on_hand_base_quantity <> 'NaN'::numeric
      AND on_hand_base_quantity = pg_catalog.trunc(on_hand_base_quantity)
      AND on_hand_base_quantity <=
        999999999999999999999999999999999999
    )
);

-- A missing balance row means zero stock before the first posted receipt.

CREATE TABLE public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  movement_type text NOT NULL,
  quantity_delta_base numeric NOT NULL,
  balance_after_base_quantity numeric NOT NULL,
  source_type text NOT NULL,
  source_id uuid NOT NULL,
  source_line_id uuid,
  actor_user_id uuid,
  reason text,
  recorded_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT inventory_movements_product_store_fkey
    FOREIGN KEY (store_id, product_id)
    REFERENCES public.products (store_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT inventory_movements_actor_membership_fkey
    FOREIGN KEY (store_id, actor_user_id)
    REFERENCES public.store_memberships (store_id, user_id)
    ON DELETE RESTRICT,
  CONSTRAINT inventory_movements_type_format
    CHECK (movement_type ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT inventory_movements_delta_valid
    CHECK (
      quantity_delta_base <> 0
      AND quantity_delta_base <> 'NaN'::numeric
      AND quantity_delta_base = pg_catalog.trunc(quantity_delta_base)
      AND pg_catalog.abs(quantity_delta_base) <=
        999999999999999999999999999999999999
    ),
  CONSTRAINT inventory_movements_balance_valid
    CHECK (
      balance_after_base_quantity >= 0
      AND balance_after_base_quantity <> 'NaN'::numeric
      AND balance_after_base_quantity =
        pg_catalog.trunc(balance_after_base_quantity)
      AND balance_after_base_quantity <=
        999999999999999999999999999999999999
    ),
  CONSTRAINT inventory_movements_source_type_format
    CHECK (source_type ~ '^[a-z][a-z0-9_]*$'),
  CONSTRAINT inventory_movements_reason_not_blank
    CHECK (reason IS NULL OR
      (reason = pg_catalog.btrim(reason) AND reason <> ''))
);

-- Polymorphic source references intentionally have no FK: later sales, returns,
-- adjustments, and purchase reversals can identify their document and line
-- without rewriting existing movement rows. The posting functions validate them.
CREATE UNIQUE INDEX inventory_movements_source_once_idx
  ON public.inventory_movements
    (store_id, source_type, source_id, source_line_id, movement_type)
  WHERE source_line_id IS NOT NULL;

CREATE INDEX inventory_movements_product_recorded_idx
  ON public.inventory_movements (store_id, product_id, recorded_at DESC);

CREATE INDEX inventory_movements_source_idx
  ON public.inventory_movements (store_id, source_type, source_id);

CREATE INDEX inventory_movements_actor_idx
  ON public.inventory_movements (store_id, actor_user_id)
  WHERE actor_user_id IS NOT NULL;

-- SECURITY DEFINER helpers in this migration are owned by the role executing
-- the DDL, which also owns the tables created here. Keep them owned by a
-- trusted schema/table owner with the required RLS bypass; never transfer them
-- to an application login. Their public references are qualified, search_path
-- is fixed below, and direct execution is revoked from client roles.
CREATE FUNCTION public.guard_purchase_header_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.purchase_status <> 'draft' THEN
      RAISE EXCEPTION 'posted purchases cannot be deleted';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.purchase_status <> 'draft' THEN
    RAISE EXCEPTION 'posted purchases are immutable';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.store_id IS DISTINCT FROM OLD.store_id
    OR NEW.created_by_user_id IS DISTINCT FROM OLD.created_by_user_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
    OR (
      NEW.line_revision IS DISTINCT FROM OLD.line_revision
      AND pg_catalog.pg_trigger_depth() <= 1
    ) THEN
    RAISE EXCEPTION 'purchase identity and creation attribution are immutable';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_purchase_header_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.guard_purchase_item_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_old_store_id uuid;
  v_old_purchase_id uuid;
  v_new_store_id uuid;
  v_new_purchase_id uuid;
  v_parent record;
  v_purchase_status text;
  v_reversal_of_purchase_id uuid;
  v_original_status text;
  v_original_reversal_id uuid;
  v_product_name text;
  v_sku text;
  v_unit_name text;
  v_unit_code text;
  v_base_quantity numeric;
  v_product_active boolean;
  v_unit_purchasable boolean;
  v_original_product_id uuid;
  v_original_product_unit_id uuid;
  v_original_quantity numeric;
  v_original_unit_cost numeric(14, 2);
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old_store_id := OLD.store_id;
    v_old_purchase_id := OLD.purchase_id;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old_store_id := OLD.store_id;
    v_old_purchase_id := OLD.purchase_id;
    v_new_store_id := NEW.store_id;
    v_new_purchase_id := NEW.purchase_id;
  ELSE
    v_new_store_id := NEW.store_id;
    v_new_purchase_id := NEW.purchase_id;
  END IF;

  -- The row itself may already be tuple-locked by UPDATE/DELETE. The posting
  -- operation therefore must never lock or update line rows after locking the
  -- parent; it locks the header, reads lines without row locks, and changes only
  -- the header. Parent locks for a moved line are acquired in a stable order.
  FOR v_parent IN
    SELECT lock_targets.store_id, lock_targets.purchase_id
    FROM (
      SELECT v_old_store_id AS store_id, v_old_purchase_id AS purchase_id
      UNION
      SELECT v_new_store_id AS store_id, v_new_purchase_id AS purchase_id
    ) AS lock_targets
    WHERE lock_targets.store_id IS NOT NULL
      AND lock_targets.purchase_id IS NOT NULL
    ORDER BY lock_targets.store_id, lock_targets.purchase_id
  LOOP
    SELECT purchase.purchase_status
    INTO v_purchase_status
    FROM public.purchases AS purchase
    WHERE purchase.store_id = v_parent.store_id
      AND purchase.id = v_parent.purchase_id
    FOR UPDATE;

    IF NOT FOUND OR v_purchase_status <> 'draft' THEN
      RAISE EXCEPTION 'purchase lines may only be changed while the purchase is a draft';
    END IF;

    -- Change the parent row version as well as locking it. A poster using a
    -- repeatable-read snapshot will then fail serialization instead of posting
    -- a stale line set.
    UPDATE public.purchases AS purchase
    SET line_revision = purchase.line_revision + 1
    WHERE purchase.store_id = v_parent.store_id
      AND purchase.id = v_parent.purchase_id;
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT purchase.reversal_of_purchase_id
  INTO v_reversal_of_purchase_id
  FROM public.purchases AS purchase
  WHERE purchase.store_id = NEW.store_id
    AND purchase.id = NEW.purchase_id;

  IF v_reversal_of_purchase_id IS NULL THEN
    IF NEW.reverses_purchase_item_id IS NOT NULL THEN
      RAISE EXCEPTION 'receipt lines cannot reference a reversed purchase item';
    END IF;

    SELECT product.name,
           product.sku,
           product.is_active,
           product_unit.unit_name,
           product_unit.unit_code,
           product_unit.base_quantity,
           product_unit.is_purchasable
    INTO v_product_name,
         v_sku,
         v_product_active,
         v_unit_name,
         v_unit_code,
         v_base_quantity,
         v_unit_purchasable
    FROM public.products AS product
    JOIN public.product_units AS product_unit
      ON product_unit.store_id = product.store_id
     AND product_unit.product_id = product.id
    WHERE product.store_id = NEW.store_id
      AND product.id = NEW.product_id
      AND product_unit.id = NEW.product_unit_id;

    IF NOT FOUND OR NOT v_product_active OR NOT v_unit_purchasable THEN
      RAISE EXCEPTION 'purchase lines require an active product and purchasable unit';
    END IF;

    NEW.product_name_snapshot := v_product_name;
    NEW.sku_snapshot := v_sku;
    NEW.unit_name_snapshot := v_unit_name;
    NEW.unit_code_snapshot := v_unit_code;
    NEW.base_quantity_per_unit_snapshot := v_base_quantity;
  ELSE
    IF NEW.reverses_purchase_item_id IS NULL THEN
      RAISE EXCEPTION 'reversal lines must identify their original purchase line';
    END IF;

    SELECT original.purchase_status,
           original.reversal_of_purchase_id,
           original_item.product_id,
           original_item.product_unit_id,
           original_item.product_name_snapshot,
           original_item.sku_snapshot,
           original_item.unit_name_snapshot,
           original_item.unit_code_snapshot,
           original_item.base_quantity_per_unit_snapshot,
           original_item.quantity,
           original_item.unit_cost
    INTO v_original_status,
         v_original_reversal_id,
         v_original_product_id,
         v_original_product_unit_id,
         v_product_name,
         v_sku,
         v_unit_name,
         v_unit_code,
         v_base_quantity,
         v_original_quantity,
         v_original_unit_cost
    FROM public.purchase_items AS original_item
    JOIN public.purchases AS original
      ON original.store_id = original_item.store_id
     AND original.id = original_item.purchase_id
    WHERE original_item.store_id = NEW.store_id
      AND original_item.id = NEW.reverses_purchase_item_id
      AND original.id = v_reversal_of_purchase_id;

    IF NOT FOUND
      OR v_original_status <> 'posted'
      OR v_original_reversal_id IS NOT NULL THEN
      RAISE EXCEPTION 'reversal lines must reference a posted original receipt';
    END IF;

    NEW.product_id := v_original_product_id;
    NEW.product_unit_id := v_original_product_unit_id;
    NEW.product_name_snapshot := v_product_name;
    NEW.sku_snapshot := v_sku;
    NEW.unit_name_snapshot := v_unit_name;
    NEW.unit_code_snapshot := v_unit_code;
    NEW.base_quantity_per_unit_snapshot := v_base_quantity;
    NEW.quantity := v_original_quantity;
    NEW.unit_cost := v_original_unit_cost;
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_purchase_item_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.assert_posted_purchase_integrity(
  p_store_id uuid,
  p_purchase_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_status text;
  v_supplier_id uuid;
  v_reversal_of_purchase_id uuid;
  v_subtotal numeric(14, 2);
  v_total numeric(14, 2);
  v_supplier_active boolean;
  v_line_count bigint;
  v_line_subtotal numeric;
  v_original_status text;
  v_original_reversal_id uuid;
  v_original_supplier_id uuid;
  v_original_subtotal numeric(14, 2);
  v_original_total numeric(14, 2);
  v_original_line_count bigint;
  v_reversal_line_count bigint;
BEGIN
  SELECT purchase.purchase_status,
         purchase.supplier_id,
         purchase.reversal_of_purchase_id,
         purchase.subtotal,
         purchase.total
  INTO v_status,
       v_supplier_id,
       v_reversal_of_purchase_id,
       v_subtotal,
       v_total
  FROM public.purchases AS purchase
  WHERE purchase.store_id = p_store_id
    AND purchase.id = p_purchase_id;

  IF NOT FOUND OR v_status <> 'posted' THEN
    RETURN;
  END IF;

  SELECT pg_catalog.count(*),
         COALESCE(pg_catalog.sum(item.line_subtotal), 0)
  INTO v_line_count, v_line_subtotal
  FROM public.purchase_items AS item
  WHERE item.store_id = p_store_id
    AND item.purchase_id = p_purchase_id;

  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'a posted purchase must contain at least one line'
      USING ERRCODE = '23514';
  END IF;

  IF v_line_subtotal <> v_subtotal OR v_total <> v_subtotal THEN
    RAISE EXCEPTION 'posted purchase totals must equal the sum of rounded line subtotals'
      USING ERRCODE = '23514';
  END IF;

  IF v_reversal_of_purchase_id IS NULL THEN
    SELECT supplier.is_active
    INTO v_supplier_active
    FROM public.suppliers AS supplier
    WHERE supplier.store_id = p_store_id
      AND supplier.id = v_supplier_id;

    IF v_supplier_active IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'a purchase can only be posted for an active supplier'
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.purchase_items AS item
      WHERE item.store_id = p_store_id
        AND item.purchase_id = p_purchase_id
        AND item.reverses_purchase_item_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'a receipt purchase cannot contain reversal lines'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT original.purchase_status,
           original.reversal_of_purchase_id,
           original.supplier_id,
           original.subtotal,
           original.total
    INTO v_original_status,
         v_original_reversal_id,
         v_original_supplier_id,
         v_original_subtotal,
         v_original_total
    FROM public.purchases AS original
    WHERE original.store_id = p_store_id
      AND original.id = v_reversal_of_purchase_id;

    IF v_original_status IS DISTINCT FROM 'posted'
      OR v_original_reversal_id IS NOT NULL
      OR v_original_supplier_id IS DISTINCT FROM v_supplier_id
      OR v_original_subtotal IS DISTINCT FROM v_subtotal
      OR v_original_total IS DISTINCT FROM v_total THEN
      RAISE EXCEPTION 'a reversal must reference a posted original receipt for the same supplier and amount'
        USING ERRCODE = '23514';
    END IF;

    SELECT pg_catalog.count(*)
    INTO v_original_line_count
    FROM public.purchase_items AS original_item
    WHERE original_item.store_id = p_store_id
      AND original_item.purchase_id = v_reversal_of_purchase_id;

    SELECT pg_catalog.count(*)
    INTO v_reversal_line_count
    FROM public.purchase_items AS reversal_item
    JOIN public.purchase_items AS original_item
      ON original_item.store_id = reversal_item.store_id
     AND original_item.id = reversal_item.reverses_purchase_item_id
     AND original_item.purchase_id = v_reversal_of_purchase_id
    WHERE reversal_item.store_id = p_store_id
      AND reversal_item.purchase_id = p_purchase_id;

    IF v_original_line_count = 0
      OR v_reversal_line_count <> v_original_line_count THEN
      RAISE EXCEPTION 'a full purchase reversal must map every original line exactly once'
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.purchase_items AS reversal_item
      LEFT JOIN public.purchase_items AS original_item
        ON original_item.store_id = reversal_item.store_id
       AND original_item.id = reversal_item.reverses_purchase_item_id
       AND original_item.purchase_id = v_reversal_of_purchase_id
      WHERE reversal_item.store_id = p_store_id
        AND reversal_item.purchase_id = p_purchase_id
        AND (
          original_item.id IS NULL
          OR reversal_item.product_id IS DISTINCT FROM original_item.product_id
          OR reversal_item.product_unit_id IS DISTINCT FROM original_item.product_unit_id
          OR reversal_item.quantity IS DISTINCT FROM original_item.quantity
          OR reversal_item.unit_cost IS DISTINCT FROM original_item.unit_cost
          OR reversal_item.product_name_snapshot IS DISTINCT FROM original_item.product_name_snapshot
          OR reversal_item.sku_snapshot IS DISTINCT FROM original_item.sku_snapshot
          OR reversal_item.unit_name_snapshot IS DISTINCT FROM original_item.unit_name_snapshot
          OR reversal_item.unit_code_snapshot IS DISTINCT FROM original_item.unit_code_snapshot
          OR reversal_item.base_quantity_per_unit_snapshot
             IS DISTINCT FROM original_item.base_quantity_per_unit_snapshot
          OR reversal_item.reverses_purchase_item_id IS NULL
        )
    ) THEN
      RAISE EXCEPTION 'reversal lines must exactly snapshot their original purchase lines'
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.purchase_items AS reversal_item
      WHERE reversal_item.store_id = p_store_id
        AND reversal_item.purchase_id = p_purchase_id
        AND reversal_item.reverses_purchase_item_id IS NULL
    ) THEN
      RAISE EXCEPTION 'every reversal line must identify its original purchase line'
        USING ERRCODE = '23514';
    END IF;
  END IF;
END;
$function$;

CREATE FUNCTION public.check_purchase_commit_integrity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'purchases' THEN
    PERFORM public.assert_posted_purchase_integrity(NEW.store_id, NEW.id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.assert_posted_purchase_integrity(OLD.store_id, OLD.purchase_id);
  ELSE
    PERFORM public.assert_posted_purchase_integrity(NEW.store_id, NEW.purchase_id);
    IF TG_OP = 'UPDATE'
      AND (OLD.store_id, OLD.purchase_id)
          IS DISTINCT FROM (NEW.store_id, NEW.purchase_id) THEN
      PERFORM public.assert_posted_purchase_integrity(OLD.store_id, OLD.purchase_id);
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_posted_purchase_integrity(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_purchase_commit_integrity()
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.prevent_inventory_movement_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
BEGIN
  RAISE EXCEPTION 'inventory movements are append-only';
END;
$function$;

REVOKE ALL ON FUNCTION public.prevent_inventory_movement_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE TRIGGER suppliers_set_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER purchases_set_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER purchases_guard_mutation
  BEFORE UPDATE OR DELETE ON public.purchases
  FOR EACH ROW EXECUTE FUNCTION public.guard_purchase_header_mutation();

CREATE TRIGGER purchase_items_set_updated_at
  BEFORE UPDATE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER purchase_items_guard_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_purchase_item_mutation();

CREATE CONSTRAINT TRIGGER purchases_check_posted_integrity
  AFTER INSERT OR UPDATE ON public.purchases
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_purchase_commit_integrity();

CREATE CONSTRAINT TRIGGER purchase_items_check_posted_integrity
  AFTER INSERT OR UPDATE OR DELETE ON public.purchase_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_purchase_commit_integrity();

CREATE TRIGGER inventory_balances_set_updated_at
  BEFORE UPDATE ON public.inventory_balances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_movements_append_only
  BEFORE UPDATE OR DELETE ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.prevent_inventory_movement_mutation();

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.suppliers,
  public.purchases,
  public.purchase_items,
  public.inventory_balances,
  public.inventory_movements
FROM PUBLIC, anon, authenticated;

-- Security boundary and posting plan:
-- 1. This migration intentionally creates no policies, client grants, or RPCs.
-- 2. A later reviewed authorization migration must grant only selected reads
--    and EXECUTE on a restricted posting function; clients must never write
--    balances or movements directly, nor set posted purchase totals/snapshots.
-- 3. The line guard locks the parent purchase FOR UPDATE and snapshots active,
--    purchasable catalog values from the database when a draft line is inserted
--    or updated. Later catalog edits do not rewrite that snapshot. The posting
--    function must recalculate totals in PostgreSQL and receive no client base
--    quantities, line totals, or balance values as authoritative inputs.
-- 4. Full receipt only: purchase_items.quantity is both the ordered quantity
--    and the entire quantity received when posted. Drafts do not change stock.
-- 5. Round each line as round(quantity * unit_cost, 2) (PostgreSQL numeric
--    half-away-from-zero); subtotal is the sum of those rounded lines. With no
--    tax or discount modeled here, total equals subtotal.
-- 6. For receipts, the posting function locks the purchase FOR UPDATE before
--    checking draft status. It must not lock or update purchase_items after
--    taking this lock; line snapshots are already stored and concurrent line
--    writers serialize on the same parent lock. Aggregate generated received
--    base quantities and process products in sorted store_id/product_id order.
--    Upsert each balance atomically, derive all movement deltas from the stored
--    lines, and insert movements from the balance operation's returned result;
--    callers must not supply quantity deltas or balance-after values. Commit
--    purchase status, balance rows, and movements in the same transaction.
-- 7. For a reversal, lock both the original posted purchase and its reversal
--    header in the same sorted (store_id, purchase_id) order before checking
--    whether the original is already reversed. The partial unique reversal
--    index and per-line unique source index are additional race guards. Apply
--    negative deltas only if each resulting balance remains nonnegative. A
--    conflict, shortage, or validation failure rolls back the whole operation.
-- 8. Each line mutation also increments the locked parent line_revision. A
--    repeatable-read poster whose snapshot predates a committed line edit will
--    encounter a serialization failure on its header lock. Keep purchase-header
--    locks before supplier locks and balance locks in posting RPCs; process
--    multiple purchase headers and balances in sorted key order. Draft edit
--    RPCs must lock their parent before editing lines and should operate on one
--    purchase at a time. Posting reads lines without row locks and never updates
--    them, avoiding a lock cycle with a line tuple lock held by a concurrent
--    draft edit.
-- 9. Corrections use a separate draft purchase with reversal_of_purchase_id,
--    reversal_reason, and lines mapped to the original lines. Posting records
--    compensating negative purchase_reversal movements; it never edits the
--    original posted purchase. A reversal must fail if stock is insufficient.
-- 10. Inventory source references are polymorphic by design, so later document
--    types need no rewrite of existing movement rows. The trusted posting
--    functions must validate source IDs and line IDs.