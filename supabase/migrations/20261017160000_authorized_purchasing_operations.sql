-- Authorized purchasing RPCs for the store-scoped schema in migrations 001-003.
-- No direct table grants or RLS policies are added. All writes are performed
-- by restricted SECURITY DEFINER functions that validate auth.uid() and store
-- membership before changing data.

-- SECURITY DEFINER ownership is security-critical: functions must be owned by
-- the role that owns all referenced tables, or by a trusted BYPASSRLS role.
-- Abort instead of silently creating RPCs that cannot enforce the invariants.
DO $owner_preflight$
DECLARE
  v_executor_oid oid;
  v_executor_is_superuser boolean;
  v_expected_table_count integer := 10;
  v_actual_table_count integer;
BEGIN
  SELECT db_role.oid, db_role.rolsuper
  INTO v_executor_oid, v_executor_is_superuser
  FROM pg_catalog.pg_roles AS db_role
  WHERE db_role.rolname = CURRENT_USER;

  SELECT pg_catalog.count(*)
  INTO v_actual_table_count
  FROM pg_catalog.pg_class AS table_class
  JOIN pg_catalog.pg_namespace AS table_namespace
    ON table_namespace.oid = table_class.relnamespace
  WHERE table_namespace.nspname = 'public'
    AND table_class.relkind IN ('r', 'p')
    AND table_class.relname IN (
      'stores', 'profiles', 'store_memberships', 'suppliers', 'purchases',
      'purchase_items', 'products', 'product_units', 'inventory_balances',
      'inventory_movements'
    );

  IF v_actual_table_count <> v_expected_table_count THEN
    RAISE EXCEPTION 'Migrations 001-003 tables are missing; verify the target schema before applying Migration 004';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
    v_executor_oid,
    'public.set_updated_at()',
    'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Migration 004 owner cannot execute Migration 001 public.set_updated_at()';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS table_class
    JOIN pg_catalog.pg_namespace AS table_namespace
      ON table_namespace.oid = table_class.relnamespace
    WHERE table_namespace.nspname = 'public'
      AND table_class.relkind IN ('r', 'p')
      AND table_class.relname IN (
        'stores', 'profiles', 'store_memberships', 'suppliers', 'purchases',
        'purchase_items', 'products', 'product_units', 'inventory_balances',
        'inventory_movements'
      )
      AND (
        NOT table_class.relrowsecurity
        OR NOT pg_catalog.has_table_privilege(v_executor_oid, table_class.oid, 'SELECT')
        OR NOT pg_catalog.has_table_privilege(v_executor_oid, table_class.oid, 'INSERT')
        OR NOT pg_catalog.has_table_privilege(v_executor_oid, table_class.oid, 'UPDATE')
        OR NOT pg_catalog.has_table_privilege(v_executor_oid, table_class.oid, 'DELETE')
        OR (
          NOT v_executor_is_superuser
          AND (table_class.relowner <> v_executor_oid OR table_class.relforcerowsecurity)
        )
      )
  ) THEN
    RAISE EXCEPTION 'apply Migration 004 as the common table owner or a superuser with required privileges on the existing tables';
  END IF;
END;
$owner_preflight$;

CREATE FUNCTION public.require_purchasing_access(p_store_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_role public.store_role;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT membership.role
  INTO v_role
  FROM public.store_memberships AS membership
  JOIN public.profiles AS profile
    ON profile.id = membership.user_id
  JOIN public.stores AS store
    ON store.id = membership.store_id
  WHERE membership.store_id = p_store_id
    AND membership.user_id = v_user_id
    AND membership.is_active
    AND profile.is_active
    AND store.is_active;

  IF NOT FOUND
    OR v_role NOT IN (
      'owner'::public.store_role,
      'manager'::public.store_role,
      'inventory_clerk'::public.store_role
    ) THEN
    RAISE EXCEPTION 'active purchasing membership is required for this store'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_user_id;
END;
$function$;

CREATE FUNCTION public.apply_purchase_inventory(
  p_store_id uuid,
  p_purchase_id uuid,
  p_direction smallint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor_user_id uuid := auth.uid();
  v_source_type text;
  v_movement_type text;
  v_reason text;
  v_product record;
  v_item record;
  v_delta numeric;
  v_balance_after numeric;
  v_balance_before numeric;
  v_running_balance numeric;
BEGIN
  IF p_direction IS NULL OR p_direction NOT IN (-1, 1) THEN
    RAISE EXCEPTION 'inventory direction must be 1 or -1'
      USING ERRCODE = '22023';
  END IF;

  IF p_direction = 1 THEN
    v_source_type := 'purchase';
    v_movement_type := 'purchase_receipt';
    v_reason := NULL;
  ELSE
    v_source_type := 'purchase_reversal';
    v_movement_type := 'purchase_reversal';
    SELECT purchase.reversal_reason
    INTO v_reason
    FROM public.purchases AS purchase
    WHERE purchase.store_id = p_store_id
      AND purchase.id = p_purchase_id;
  END IF;

  -- Every inventory writer must process product keys in this same order.
  FOR v_product IN
    SELECT item.product_id,
           pg_catalog.sum(item.received_base_quantity) AS base_quantity
    FROM public.purchase_items AS item
    WHERE item.store_id = p_store_id
      AND item.purchase_id = p_purchase_id
    GROUP BY item.product_id
    ORDER BY item.product_id
  LOOP
    v_delta := p_direction * v_product.base_quantity;

    -- Create a zero row first, then update it atomically. The UPDATE serializes
    -- with concurrent receipts and future sales using the same balance key.
    INSERT INTO public.inventory_balances (
      store_id,
      product_id,
      on_hand_base_quantity
    )
    VALUES (p_store_id, v_product.product_id, 0)
    ON CONFLICT (store_id, product_id) DO NOTHING;

    UPDATE public.inventory_balances AS balance
    SET on_hand_base_quantity = balance.on_hand_base_quantity + v_delta
    WHERE balance.store_id = p_store_id
      AND balance.product_id = v_product.product_id
      AND balance.on_hand_base_quantity + v_delta >= 0
    RETURNING balance.on_hand_base_quantity
    INTO v_balance_after;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'insufficient stock to reverse this purchase'
        USING ERRCODE = '23514';
    END IF;

    v_balance_before := v_balance_after - v_delta;
    v_running_balance := v_balance_before;

    -- Store an intermediate resulting balance for every source line, derived
    -- from the balance UPDATE that actually acquired the row lock.
    FOR v_item IN
      SELECT item.id, item.received_base_quantity
      FROM public.purchase_items AS item
      WHERE item.store_id = p_store_id
        AND item.purchase_id = p_purchase_id
        AND item.product_id = v_product.product_id
      ORDER BY item.id
    LOOP
      v_delta := p_direction * v_item.received_base_quantity;
      v_running_balance := v_running_balance + v_delta;

      INSERT INTO public.inventory_movements (
        store_id,
        product_id,
        movement_type,
        quantity_delta_base,
        balance_after_base_quantity,
        source_type,
        source_id,
        source_line_id,
        actor_user_id,
        reason
      )
      VALUES (
        p_store_id,
        v_product.product_id,
        v_movement_type,
        v_delta,
        v_running_balance,
        v_source_type,
        p_purchase_id,
        v_item.id,
        v_actor_user_id,
        v_reason
      );
    END LOOP;
  END LOOP;
END;
$function$;

CREATE FUNCTION public.create_purchase_draft(
  p_store_id uuid,
  p_supplier_id uuid,
  p_purchase_number text,
  p_purchase_date date,
  p_supplier_invoice_ref text,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_purchase_number text;
  v_supplier_invoice_ref text;
  v_purchase_id uuid;
  v_existing record;
  v_supplier_active boolean;
BEGIN
  v_actor_user_id := public.require_purchasing_access(p_store_id);
  v_purchase_number := pg_catalog.upper(pg_catalog.btrim(p_purchase_number));
  v_supplier_invoice_ref := NULLIF(pg_catalog.btrim(p_supplier_invoice_ref), '');

  IF v_purchase_number IS NULL OR v_purchase_number = '' OR p_purchase_date IS NULL THEN
    RAISE EXCEPTION 'purchase number and date are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT supplier.is_active
  INTO v_supplier_active
  FROM public.suppliers AS supplier
  WHERE supplier.store_id = p_store_id
    AND supplier.id = p_supplier_id;

  IF v_supplier_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier does not exist in this store or is inactive'
      USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.purchases (
    store_id,
    supplier_id,
    purchase_number,
    supplier_invoice_ref,
    purchase_date,
    notes,
    created_by_user_id
  )
  VALUES (
    p_store_id,
    p_supplier_id,
    v_purchase_number,
    v_supplier_invoice_ref,
    p_purchase_date,
    p_notes,
    v_actor_user_id
  )
  ON CONFLICT (store_id, purchase_number) DO NOTHING
  RETURNING id INTO v_purchase_id;

  IF v_purchase_id IS NOT NULL THEN
    RETURN v_purchase_id;
  END IF;

  -- A repeated create request with the same store-scoped purchase number and
  -- identical original fields returns the existing document instead of making
  -- a duplicate. A mismatched reuse is rejected.
  SELECT purchase.*
  INTO v_existing
  FROM public.purchases AS purchase
  WHERE purchase.store_id = p_store_id
    AND purchase.purchase_number = v_purchase_number;

  IF FOUND
    AND v_existing.created_by_user_id = v_actor_user_id
    AND v_existing.supplier_id = p_supplier_id
    AND v_existing.purchase_date = p_purchase_date
    AND v_existing.supplier_invoice_ref IS NOT DISTINCT FROM v_supplier_invoice_ref
    AND v_existing.notes IS NOT DISTINCT FROM p_notes
    AND v_existing.reversal_of_purchase_id IS NULL THEN
    RETURN v_existing.id;
  END IF;

  RAISE EXCEPTION 'purchase number is already used by a different document'
    USING ERRCODE = '23505';
END;
$function$;

CREATE FUNCTION public.update_purchase_draft(
  p_store_id uuid,
  p_purchase_id uuid,
  p_supplier_id uuid,
  p_purchase_number text,
  p_purchase_date date,
  p_supplier_invoice_ref text,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_status text;
  v_reversal_of_purchase_id uuid;
  v_supplier_active boolean;
  v_purchase_number text;
  v_supplier_invoice_ref text;
BEGIN
  v_actor_user_id := public.require_purchasing_access(p_store_id);
  v_purchase_number := pg_catalog.upper(pg_catalog.btrim(p_purchase_number));
  v_supplier_invoice_ref := NULLIF(pg_catalog.btrim(p_supplier_invoice_ref), '');

  IF v_purchase_number IS NULL OR v_purchase_number = '' OR p_purchase_date IS NULL THEN
    RAISE EXCEPTION 'purchase number and date are required'
      USING ERRCODE = '22023';
  END IF;

  SELECT purchase.purchase_status, purchase.reversal_of_purchase_id
  INTO v_status, v_reversal_of_purchase_id
  FROM public.purchases AS purchase
  WHERE purchase.store_id = p_store_id
    AND purchase.id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND OR v_status <> 'draft' OR v_reversal_of_purchase_id IS NOT NULL THEN
    RAISE EXCEPTION 'only an existing ordinary draft purchase can be updated'
      USING ERRCODE = '55000';
  END IF;

  SELECT supplier.is_active
  INTO v_supplier_active
  FROM public.suppliers AS supplier
  WHERE supplier.store_id = p_store_id
    AND supplier.id = p_supplier_id;

  IF v_supplier_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'supplier does not exist in this store or is inactive'
      USING ERRCODE = '23503';
  END IF;

  UPDATE public.purchases AS purchase
  SET supplier_id = p_supplier_id,
      purchase_number = v_purchase_number,
      purchase_date = p_purchase_date,
      supplier_invoice_ref = v_supplier_invoice_ref,
      notes = p_notes
  WHERE purchase.store_id = p_store_id
    AND purchase.id = p_purchase_id;

  RETURN p_purchase_id;
END;
$function$;

CREATE FUNCTION public.add_purchase_line(
  p_store_id uuid,
  p_purchase_id uuid,
  p_purchase_item_id uuid,
  p_product_id uuid,
  p_product_unit_id uuid,
  p_quantity numeric,
  p_unit_cost numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_status text;
  v_reversal_of_purchase_id uuid;
  v_existing record;
BEGIN
  v_actor_user_id := public.require_purchasing_access(p_store_id);

  IF p_purchase_item_id IS NULL
    OR p_product_id IS NULL
    OR p_product_unit_id IS NULL
    OR p_quantity IS NULL
    OR p_quantity = 'NaN'::numeric
    OR p_quantity <= 0
    OR p_quantity <> pg_catalog.trunc(p_quantity)
    OR p_quantity > 999999999999999999
    OR p_unit_cost IS NULL
    OR p_unit_cost = 'NaN'::numeric
    OR p_unit_cost < 0
    OR p_unit_cost > 999999999999.99
    OR p_unit_cost <> pg_catalog.round(p_unit_cost, 2)
    OR p_quantity * p_unit_cost > 999999999999.99 THEN
    RAISE EXCEPTION 'quantity or INR unit cost is outside the supported range'
      USING ERRCODE = '22003';
  END IF;

  SELECT purchase.purchase_status, purchase.reversal_of_purchase_id
  INTO v_status, v_reversal_of_purchase_id
  FROM public.purchases AS purchase
  WHERE purchase.store_id = p_store_id
    AND purchase.id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND OR v_status <> 'draft' OR v_reversal_of_purchase_id IS NOT NULL THEN
    RAISE EXCEPTION 'lines can only be added to an ordinary draft purchase'
      USING ERRCODE = '55000';
  END IF;

  SELECT item.*
  INTO v_existing
  FROM public.purchase_items AS item
  WHERE item.id = p_purchase_item_id;

  IF FOUND THEN
    IF v_existing.store_id = p_store_id
      AND v_existing.purchase_id = p_purchase_id
      AND v_existing.product_id = p_product_id
      AND v_existing.product_unit_id = p_product_unit_id
      AND v_existing.quantity = p_quantity
      AND v_existing.unit_cost = p_unit_cost THEN
      RETURN p_purchase_item_id;
    END IF;
    RAISE EXCEPTION 'purchase item id is already used by different line data'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.purchase_items (
    id,
    store_id,
    purchase_id,
    product_id,
    product_unit_id,
    quantity,
    unit_cost
  )
  VALUES (
    p_purchase_item_id,
    p_store_id,
    p_purchase_id,
    p_product_id,
    p_product_unit_id,
    p_quantity,
    p_unit_cost
  );

  RETURN p_purchase_item_id;
END;
$function$;

CREATE FUNCTION public.update_purchase_line(
  p_store_id uuid,
  p_purchase_id uuid,
  p_purchase_item_id uuid,
  p_product_id uuid,
  p_product_unit_id uuid,
  p_quantity numeric,
  p_unit_cost numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_status text;
  v_reversal_of_purchase_id uuid;
BEGIN
  v_actor_user_id := public.require_purchasing_access(p_store_id);

  IF p_product_id IS NULL
    OR p_product_unit_id IS NULL
    OR p_quantity IS NULL
    OR p_quantity = 'NaN'::numeric
    OR p_quantity <= 0
    OR p_quantity <> pg_catalog.trunc(p_quantity)
    OR p_quantity > 999999999999999999
    OR p_unit_cost IS NULL
    OR p_unit_cost = 'NaN'::numeric
    OR p_unit_cost < 0
    OR p_unit_cost > 999999999999.99
    OR p_unit_cost <> pg_catalog.round(p_unit_cost, 2)
    OR p_quantity * p_unit_cost > 999999999999.99 THEN
    RAISE EXCEPTION 'quantity or INR unit cost is outside the supported range'
      USING ERRCODE = '22003';
  END IF;

  SELECT purchase.purchase_status, purchase.reversal_of_purchase_id
  INTO v_status, v_reversal_of_purchase_id
  FROM public.purchases AS purchase
  WHERE purchase.store_id = p_store_id
    AND purchase.id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND OR v_status <> 'draft' OR v_reversal_of_purchase_id IS NOT NULL THEN
    RAISE EXCEPTION 'lines can only be edited on an ordinary draft purchase'
      USING ERRCODE = '55000';
  END IF;

  UPDATE public.purchase_items AS item
  SET product_id = p_product_id,
      product_unit_id = p_product_unit_id,
      quantity = p_quantity,
      unit_cost = p_unit_cost
  WHERE item.store_id = p_store_id
    AND item.purchase_id = p_purchase_id
    AND item.id = p_purchase_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase line was not found'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN p_purchase_item_id;
END;
$function$;

CREATE FUNCTION public.remove_purchase_line(
  p_store_id uuid,
  p_purchase_id uuid,
  p_purchase_item_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_status text;
  v_reversal_of_purchase_id uuid;
BEGIN
  v_actor_user_id := public.require_purchasing_access(p_store_id);

  SELECT purchase.purchase_status, purchase.reversal_of_purchase_id
  INTO v_status, v_reversal_of_purchase_id
  FROM public.purchases AS purchase
  WHERE purchase.store_id = p_store_id
    AND purchase.id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND OR v_status <> 'draft' OR v_reversal_of_purchase_id IS NOT NULL THEN
    RAISE EXCEPTION 'lines can only be removed from an ordinary draft purchase'
      USING ERRCODE = '55000';
  END IF;

  DELETE FROM public.purchase_items AS item
  WHERE item.store_id = p_store_id
    AND item.purchase_id = p_purchase_id
    AND item.id = p_purchase_item_id;

  RETURN FOUND;
END;
$function$;

CREATE FUNCTION public.post_purchase(
  p_store_id uuid,
  p_purchase_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_status text;
  v_reversal_of_purchase_id uuid;
  v_supplier_id uuid;
  v_supplier_active boolean;
  v_line_count bigint;
  v_subtotal numeric;
BEGIN
  v_actor_user_id := public.require_purchasing_access(p_store_id);

  SELECT purchase.purchase_status,
         purchase.reversal_of_purchase_id,
         purchase.supplier_id
  INTO v_status, v_reversal_of_purchase_id, v_supplier_id
  FROM public.purchases AS purchase
  WHERE purchase.store_id = p_store_id
    AND purchase.id = p_purchase_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase was not found in this store'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_status = 'posted' THEN
    RETURN p_purchase_id;
  END IF;

  IF v_status <> 'draft' OR v_reversal_of_purchase_id IS NOT NULL THEN
    RAISE EXCEPTION 'only an ordinary draft purchase can be posted here'
      USING ERRCODE = '55000';
  END IF;

  SELECT supplier.is_active
  INTO v_supplier_active
  FROM public.suppliers AS supplier
  WHERE supplier.store_id = p_store_id
    AND supplier.id = v_supplier_id;

  IF v_supplier_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'purchase supplier is inactive or unavailable'
      USING ERRCODE = '23514';
  END IF;

  SELECT pg_catalog.count(*),
         COALESCE(pg_catalog.sum(item.line_subtotal), 0)
  INTO v_line_count, v_subtotal
  FROM public.purchase_items AS item
  WHERE item.store_id = p_store_id
    AND item.purchase_id = p_purchase_id;

  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'a purchase must have at least one line before posting'
      USING ERRCODE = '23514';
  END IF;

  IF v_subtotal > 999999999999.99 THEN
    RAISE EXCEPTION 'purchase subtotal exceeds NUMERIC(14,2)'
      USING ERRCODE = '22003';
  END IF;

  PERFORM public.apply_purchase_inventory(p_store_id, p_purchase_id, 1);

  UPDATE public.purchases AS purchase
  SET purchase_status = 'posted',
      subtotal = v_subtotal,
      total = v_subtotal,
      posted_by_user_id = v_actor_user_id,
      posted_at = pg_catalog.now()
  WHERE purchase.store_id = p_store_id
    AND purchase.id = p_purchase_id;

  RETURN p_purchase_id;
END;
$function$;

CREATE FUNCTION public.create_and_post_purchase_reversal(
  p_store_id uuid,
  p_original_purchase_id uuid,
  p_reversal_purchase_number text,
  p_reversal_reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_actor_user_id uuid;
  v_original_status text;
  v_original_reversal_of uuid;
  v_supplier_id uuid;
  v_original_subtotal numeric(14, 2);
  v_original_total numeric(14, 2);
  v_purchase_number text;
  v_reason text;
  v_reversal_id uuid;
  v_existing record;
  v_line_count bigint;
  v_subtotal numeric;
BEGIN
  v_actor_user_id := public.require_purchasing_access(p_store_id);
  v_purchase_number := pg_catalog.upper(pg_catalog.btrim(p_reversal_purchase_number));
  v_reason := pg_catalog.btrim(p_reversal_reason);

  IF v_purchase_number IS NULL OR v_purchase_number = ''
    OR v_reason IS NULL OR v_reason = '' THEN
    RAISE EXCEPTION 'reversal purchase number and reason are required'
      USING ERRCODE = '22023';
  END IF;

  -- Original header is always locked before checking or creating its reversal.
  -- Posted lines are immutable through these authenticated operations, so the
  -- source lines can be read after this header lock without child-row locks.
  SELECT purchase.purchase_status,
         purchase.reversal_of_purchase_id,
         purchase.supplier_id,
         purchase.subtotal,
         purchase.total
  INTO v_original_status,
       v_original_reversal_of,
       v_supplier_id,
       v_original_subtotal,
       v_original_total
  FROM public.purchases AS purchase
  WHERE purchase.store_id = p_store_id
    AND purchase.id = p_original_purchase_id
  FOR UPDATE;

  IF NOT FOUND
    OR v_original_status <> 'posted'
    OR v_original_reversal_of IS NOT NULL THEN
    RAISE EXCEPTION 'only an unreversed posted receipt can be reversed'
      USING ERRCODE = '55000';
  END IF;

  SELECT reversal.id,
         reversal.purchase_status,
         reversal.purchase_number,
         reversal.reversal_reason,
         reversal.created_by_user_id
  INTO v_existing
  FROM public.purchases AS reversal
  WHERE reversal.store_id = p_store_id
    AND reversal.reversal_of_purchase_id = p_original_purchase_id;

  IF FOUND THEN
    IF v_existing.purchase_status = 'posted'
      AND v_existing.purchase_number = v_purchase_number
      AND v_existing.reversal_reason = v_reason
      AND v_existing.created_by_user_id = v_actor_user_id THEN
      RETURN v_existing.id;
    END IF;
    RAISE EXCEPTION 'a reversal already exists for this purchase'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.purchases (
    store_id,
    supplier_id,
    purchase_number,
    purchase_date,
    reversal_of_purchase_id,
    reversal_reason,
    created_by_user_id
  )
  SELECT p_store_id,
         v_supplier_id,
         v_purchase_number,
         original.purchase_date,
         p_original_purchase_id,
         v_reason,
         v_actor_user_id
  FROM public.purchases AS original
  WHERE original.store_id = p_store_id
    AND original.id = p_original_purchase_id
  RETURNING id INTO v_reversal_id;

  INSERT INTO public.purchase_items (
    store_id,
    purchase_id,
    product_id,
    product_unit_id,
    reverses_purchase_item_id,
    product_name_snapshot,
    sku_snapshot,
    unit_name_snapshot,
    unit_code_snapshot,
    base_quantity_per_unit_snapshot,
    quantity,
    unit_cost
  )
  SELECT original_item.store_id,
         v_reversal_id,
         original_item.product_id,
         original_item.product_unit_id,
         original_item.id,
         original_item.product_name_snapshot,
         original_item.sku_snapshot,
         original_item.unit_name_snapshot,
         original_item.unit_code_snapshot,
         original_item.base_quantity_per_unit_snapshot,
         original_item.quantity,
         original_item.unit_cost
  FROM public.purchase_items AS original_item
  WHERE original_item.store_id = p_store_id
    AND original_item.purchase_id = p_original_purchase_id
  ORDER BY original_item.id;

  GET DIAGNOSTICS v_line_count = ROW_COUNT;
  IF v_line_count = 0 THEN
    RAISE EXCEPTION 'posted purchase has no lines to reverse'
      USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(pg_catalog.sum(item.line_subtotal), 0)
  INTO v_subtotal
  FROM public.purchase_items AS item
  WHERE item.store_id = p_store_id
    AND item.purchase_id = v_reversal_id;

  IF v_subtotal <> v_original_subtotal OR v_subtotal <> v_original_total THEN
    RAISE EXCEPTION 'reversal line totals do not match the original purchase'
      USING ERRCODE = '23514';
  END IF;

  PERFORM public.apply_purchase_inventory(p_store_id, v_reversal_id, -1);

  UPDATE public.purchases AS reversal
  SET purchase_status = 'posted',
      subtotal = v_subtotal,
      total = v_subtotal,
      posted_by_user_id = v_actor_user_id,
      posted_at = pg_catalog.now()
  WHERE reversal.store_id = p_store_id
    AND reversal.id = v_reversal_id;

  RETURN v_reversal_id;
END;
$function$;

COMMENT ON FUNCTION public.require_purchasing_access(uuid) IS
  'Internal authorization helper. Requires an active profile, store, and membership with owner, manager, or inventory_clerk role.';
COMMENT ON FUNCTION public.apply_purchase_inventory(uuid, uuid, smallint) IS
  'Internal atomic balance and movement writer. Quantity deltas are derived only from persisted purchase lines; callers must not receive EXECUTE.';
COMMENT ON FUNCTION public.create_purchase_draft(uuid, uuid, text, date, text, text) IS
  'Creates an authorized store-scoped draft purchase; identical retries using the same purchase number return the original ID.';
COMMENT ON FUNCTION public.update_purchase_draft(uuid, uuid, uuid, text, date, text, text) IS
  'Updates supplier and business fields on an authorized ordinary draft purchase only.';
COMMENT ON FUNCTION public.add_purchase_line(uuid, uuid, uuid, uuid, uuid, numeric, numeric) IS
  'Adds a draft line using database-triggered product/unit snapshots; the caller-supplied line UUID is an idempotency key.';
COMMENT ON FUNCTION public.update_purchase_line(uuid, uuid, uuid, uuid, uuid, numeric, numeric) IS
  'Replaces editable fields on an ordinary draft line; product/unit snapshots are refreshed by the existing Migration 003 trigger.';
COMMENT ON FUNCTION public.remove_purchase_line(uuid, uuid, uuid) IS
  'Removes one line from an authorized ordinary draft purchase; missing-line retries return false.';
COMMENT ON FUNCTION public.post_purchase(uuid, uuid) IS
  'Atomically posts a complete receipt, updates balances, inserts line movements, and marks the purchase posted. A repeated post returns the same ID.';
COMMENT ON FUNCTION public.create_and_post_purchase_reversal(uuid, uuid, text, text) IS
  'Creates and atomically posts one full reversal for an eligible posted receipt; insufficient stock or duplicate reversal rolls back.';

-- Remove default PUBLIC execution and any existing client/service-role grants.
REVOKE ALL ON FUNCTION public.require_purchasing_access(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.apply_purchase_inventory(uuid, uuid, smallint)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_purchase_draft(uuid, uuid, text, date, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_purchase_draft(uuid, uuid, uuid, text, date, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.add_purchase_line(uuid, uuid, uuid, uuid, uuid, numeric, numeric)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_purchase_line(uuid, uuid, uuid, uuid, uuid, numeric, numeric)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.remove_purchase_line(uuid, uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.post_purchase(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_and_post_purchase_reversal(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_purchase_draft(uuid, uuid, text, date, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_purchase_draft(uuid, uuid, uuid, text, date, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_purchase_line(uuid, uuid, uuid, uuid, uuid, numeric, numeric)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_purchase_line(uuid, uuid, uuid, uuid, uuid, numeric, numeric)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_purchase_line(uuid, uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_purchase(uuid, uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_and_post_purchase_reversal(uuid, uuid, text, text)
  TO authenticated;