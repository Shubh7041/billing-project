-- Rollback-only verification harness for Migration 004.
-- Automatically selects an existing active store and an active member/profile.
-- Run as a trusted SQL Editor role that can create catalog/supplier fixtures.
-- Do not COMMIT.
-- This exercises function authorization from the JWT claim; it does not prove
-- PostgREST role grants because the SQL Editor session is privileged.

BEGIN;

DO $test$
DECLARE
  v_store_id uuid;
  v_actor_id uuid;
  v_supplier_id uuid := pg_catalog.gen_random_uuid();
  v_product_id uuid := pg_catalog.gen_random_uuid();
  v_product_unit_id uuid := pg_catalog.gen_random_uuid();
  v_purchase_id uuid;
  v_line_id uuid := pg_catalog.gen_random_uuid();
  v_reversal_id uuid;
  v_retry_id uuid;
  v_purchase_number text;
  v_reversal_number text;
  v_before numeric;
  v_expected numeric;
  v_after numeric;
  v_receipt_movement_count bigint;
  v_reversal_movement_count bigint;
  v_rejected boolean;
  v_table_name text;
  v_privilege text;
  v_function_signature text;
BEGIN
  SELECT store.id
  INTO v_store_id
  FROM public.stores AS store
  WHERE store.is_active
  ORDER BY store.id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verification requires at least one active store';
  END IF;

  SELECT membership.user_id
  INTO v_actor_id
  FROM public.store_memberships AS membership
  JOIN public.profiles AS profile
    ON profile.id = membership.user_id
  WHERE membership.store_id = v_store_id
    AND membership.is_active
    AND profile.is_active
  ORDER BY membership.user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verification requires an active profile and membership in the selected store';
  END IF;

  PERFORM pg_catalog.set_config('request.jwt.claim.sub', v_actor_id::text, true);
  PERFORM pg_catalog.set_config(
    'request.jwt.claims',
    pg_catalog.json_build_object('sub', v_actor_id::text, 'role', 'authenticated')::text,
    true
  );

  IF auth.uid() IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION 'test JWT subject was not recognized by auth.uid()';
  END IF;

  -- The membership role change below is temporary and rolled back at the end.
  INSERT INTO public.store_memberships (store_id, user_id, role, is_active)
  VALUES (v_store_id, v_actor_id, 'inventory_clerk', true)
  ON CONFLICT (store_id, user_id)
  DO UPDATE SET role = 'inventory_clerk', is_active = true;

  IF NOT EXISTS (
    SELECT 1 FROM public.stores AS store
    WHERE store.id = v_store_id AND store.is_active
  ) THEN
    RAISE EXCEPTION 'store UUID must identify an existing active store';
  END IF;

  INSERT INTO public.suppliers (store_id, name)
  VALUES (v_store_id, 'Migration 004 verification supplier')
  RETURNING id INTO v_supplier_id;

  INSERT INTO public.products (
    id, store_id, sku, name, base_unit_code, is_active
  )
  VALUES (
    v_product_id,
    v_store_id,
    'RPC_TEST_' || pg_catalog.upper(pg_catalog.replace(v_product_id::text, '-', '')),
    'Migration 004 verification product',
    'piece',
    true
  );

  INSERT INTO public.product_units (
    id,
    store_id,
    product_id,
    unit_name,
    unit_code,
    base_quantity,
    is_base_unit,
    is_sellable,
    is_purchasable,
    selling_price
  )
  VALUES (
    v_product_unit_id,
    v_store_id,
    v_product_id,
    'Piece',
    'piece',
    1,
    true,
    true,
    true,
    0
  );

  SELECT COALESCE(balance.on_hand_base_quantity, 0)
  INTO v_before
  FROM (SELECT 1) AS seed
  LEFT JOIN public.inventory_balances AS balance
    ON balance.store_id = v_store_id
   AND balance.product_id = v_product_id;

  v_purchase_number := 'VERIFY-' || pg_catalog.upper(
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '')
  );
  v_purchase_id := public.create_purchase_draft(
    v_store_id,
    v_supplier_id,
    v_purchase_number,
    CURRENT_DATE,
    NULL,
    'rollback-only verification'
  );

  v_retry_id := public.create_purchase_draft(
    v_store_id,
    v_supplier_id,
    v_purchase_number,
    CURRENT_DATE,
    NULL,
    'rollback-only verification'
  );
  IF v_retry_id <> v_purchase_id THEN
    RAISE EXCEPTION 'repeated draft creation did not return the original ID';
  END IF;

  PERFORM public.update_purchase_draft(
    v_store_id,
    v_purchase_id,
    v_supplier_id,
    v_purchase_number,
    CURRENT_DATE,
    NULL,
    'updated draft note'
  );

  -- Draft creation/line writes must not alter inventory.
  PERFORM public.add_purchase_line(
    v_store_id,
    v_purchase_id,
    v_line_id,
    v_product_id,
    v_product_unit_id,
    2,
    12.34
  );
  PERFORM public.add_purchase_line(
    v_store_id,
    v_purchase_id,
    v_line_id,
    v_product_id,
    v_product_unit_id,
    2,
    12.34
  );

  IF public.remove_purchase_line(
    v_store_id, v_purchase_id, pg_catalog.gen_random_uuid()
  ) THEN
    RAISE EXCEPTION 'removing a missing line should be a no-op';
  END IF;

  SELECT COALESCE(balance.on_hand_base_quantity, 0)
  INTO v_after
  FROM (SELECT 1) AS seed
  LEFT JOIN public.inventory_balances AS balance
    ON balance.store_id = v_store_id
   AND balance.product_id = v_product_id;

  IF v_after <> v_before OR EXISTS (
    SELECT 1
    FROM public.inventory_movements AS movement
    WHERE movement.store_id = v_store_id
      AND movement.source_type = 'purchase'
      AND movement.source_id = v_purchase_id
  ) THEN
    RAISE EXCEPTION 'draft purchase changed inventory';
  END IF;

  -- Invalid product/unit pairing must fail before a line can be accepted.
  v_rejected := false;
  BEGIN
    PERFORM public.add_purchase_line(
      v_store_id,
      v_purchase_id,
      pg_catalog.gen_random_uuid(),
      v_product_id,
      pg_catalog.gen_random_uuid(),
      1,
      1
    );
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'invalid product/unit pair was accepted';
  END IF;

  -- Zero quantity and sub-paisa cost inputs must be rejected.
  v_rejected := false;
  BEGIN
    PERFORM public.add_purchase_line(
      v_store_id,
      v_purchase_id,
      pg_catalog.gen_random_uuid(),
      v_product_id,
      v_product_unit_id,
      0,
      1
    );
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'zero quantity was accepted';
  END IF;

  v_rejected := false;
  BEGIN
    PERFORM public.add_purchase_line(
      v_store_id,
      v_purchase_id,
      pg_catalog.gen_random_uuid(),
      v_product_id,
      v_product_unit_id,
      1,
      1.001
    );
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'sub-paisa unit cost was accepted';
  END IF;

  v_rejected := false;
  BEGIN
    PERFORM public.create_purchase_draft(
      pg_catalog.gen_random_uuid(),
      v_supplier_id,
      'UNAUTHORIZED-VERIFY',
      CURRENT_DATE,
      NULL,
      NULL
    );
  EXCEPTION WHEN insufficient_privilege THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'caller was able to use a store without active membership';
  END IF;

  UPDATE public.store_memberships
  SET role = 'cashier'
  WHERE store_id = v_store_id AND user_id = v_actor_id;

  v_rejected := false;
  BEGIN
    PERFORM public.create_purchase_draft(
      v_store_id,
      v_supplier_id,
      'CASHIER-VERIFY',
      CURRENT_DATE,
      NULL,
      NULL
    );
  EXCEPTION WHEN insufficient_privilege THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'cashier role was able to invoke purchasing RPCs';
  END IF;

  UPDATE public.store_memberships
  SET role = 'inventory_clerk'
  WHERE store_id = v_store_id AND user_id = v_actor_id;

  v_purchase_id := public.post_purchase(v_store_id, v_purchase_id);
  v_expected := v_before + 2;

  SELECT balance.on_hand_base_quantity
  INTO v_after
  FROM public.inventory_balances AS balance
  WHERE balance.store_id = v_store_id
    AND balance.product_id = v_product_id;

  IF v_after <> v_expected THEN
    RAISE EXCEPTION 'receipt did not add the expected base quantity';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_receipt_movement_count
  FROM public.inventory_movements AS movement
  WHERE movement.store_id = v_store_id
    AND movement.source_type = 'purchase'
    AND movement.source_id = v_purchase_id;

  IF v_receipt_movement_count <> 1 THEN
    RAISE EXCEPTION 'receipt movement count is not one per purchase line';
  END IF;

  v_retry_id := public.post_purchase(v_store_id, v_purchase_id);
  IF v_retry_id <> v_purchase_id THEN
    RAISE EXCEPTION 'repeated posting did not return the posted purchase ID';
  END IF;

  IF (
    SELECT pg_catalog.count(*)
    FROM public.inventory_movements AS movement
    WHERE movement.store_id = v_store_id
      AND movement.source_type = 'purchase'
      AND movement.source_id = v_purchase_id
  ) <> v_receipt_movement_count THEN
    RAISE EXCEPTION 'repeated posting created duplicate movements';
  END IF;

  -- Posted header and line mutation attempts must fail.
  v_rejected := false;
  BEGIN
    PERFORM public.update_purchase_draft(
      v_store_id, v_purchase_id, v_supplier_id, v_purchase_number,
      CURRENT_DATE, NULL, 'must fail after posting'
    );
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'posted purchase header was editable';
  END IF;

  v_rejected := false;
  BEGIN
    PERFORM public.update_purchase_line(
      v_store_id, v_purchase_id, v_line_id, v_product_id,
      v_product_unit_id, 2, 12.34
    );
  EXCEPTION WHEN object_not_in_prerequisite_state THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'posted purchase line was editable';
  END IF;

  -- Simulate stock consumption only inside this rollback-only test to assert
  -- insufficient reversal stock rolls back the reversal document and movements.
  UPDATE public.inventory_balances
  SET on_hand_base_quantity = 0
  WHERE store_id = v_store_id AND product_id = v_product_id;

  v_reversal_number := 'REV-FAIL-' || pg_catalog.upper(
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '')
  );
  v_rejected := false;
  BEGIN
    PERFORM public.create_and_post_purchase_reversal(
      v_store_id, v_purchase_id, v_reversal_number, 'insufficient stock check'
    );
  EXCEPTION WHEN check_violation THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'reversal with insufficient stock was accepted';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.purchases AS purchase
    WHERE purchase.store_id = v_store_id
      AND purchase.reversal_of_purchase_id = v_purchase_id
  ) THEN
    RAISE EXCEPTION 'failed reversal left a purchase document behind';
  END IF;

  UPDATE public.inventory_balances
  SET on_hand_base_quantity = v_expected
  WHERE store_id = v_store_id AND product_id = v_product_id;

  v_reversal_number := 'REV-' || pg_catalog.upper(
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '')
  );
  v_reversal_id := public.create_and_post_purchase_reversal(
    v_store_id, v_purchase_id, v_reversal_number, 'rollback-only full reversal'
  );
  v_retry_id := public.create_and_post_purchase_reversal(
    v_store_id, v_purchase_id, v_reversal_number, 'rollback-only full reversal'
  );

  IF v_retry_id <> v_reversal_id THEN
    RAISE EXCEPTION 'repeated reversal did not return the original reversal ID';
  END IF;

  SELECT balance.on_hand_base_quantity
  INTO v_after
  FROM public.inventory_balances AS balance
  WHERE balance.store_id = v_store_id
    AND balance.product_id = v_product_id;

  IF v_after <> v_before THEN
    RAISE EXCEPTION 'full reversal did not restore the pre-receipt balance';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_reversal_movement_count
  FROM public.inventory_movements AS movement
  WHERE movement.store_id = v_store_id
    AND movement.source_type = 'purchase_reversal'
    AND movement.source_id = v_reversal_id;

  IF v_reversal_movement_count <> 1 THEN
    RAISE EXCEPTION 'reversal movement count is not one per original line';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.inventory_movements AS movement
    WHERE movement.source_id = v_reversal_id
      AND (movement.quantity_delta_base >= 0 OR movement.balance_after_base_quantity < 0)
  ) THEN
    RAISE EXCEPTION 'reversal movements have invalid sign or resulting balance';
  END IF;

  -- Verify all new tables remain RLS-enabled and deny all client table access.
  FOREACH v_table_name IN ARRAY ARRAY[
    'suppliers', 'purchases', 'purchase_items',
    'inventory_balances', 'inventory_movements'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace
        ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'public'
        AND relation.relname = v_table_name
        AND relation.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'RLS is not enabled for public.%', v_table_name;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_catalog.pg_policies AS policy
      WHERE policy.schemaname = 'public'
        AND policy.tablename = v_table_name
    ) THEN
      RAISE EXCEPTION 'unexpected client RLS policy on public.%', v_table_name;
    END IF;

    FOREACH v_privilege IN ARRAY ARRAY[
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
    ] LOOP
      IF pg_catalog.has_table_privilege(
           'anon', pg_catalog.format('public.%I', v_table_name), v_privilege
         )
        OR pg_catalog.has_table_privilege(
           'authenticated', pg_catalog.format('public.%I', v_table_name), v_privilege
         ) THEN
        RAISE EXCEPTION 'unexpected % privilege for a client role on public.%',
          v_privilege, v_table_name;
      END IF;
    END LOOP;
  END LOOP;

  FOREACH v_function_signature IN ARRAY ARRAY[
    'public.create_purchase_draft(uuid,uuid,text,date,text,text)',
    'public.update_purchase_draft(uuid,uuid,uuid,text,date,text,text)',
    'public.add_purchase_line(uuid,uuid,uuid,uuid,uuid,numeric,numeric)',
    'public.update_purchase_line(uuid,uuid,uuid,uuid,uuid,numeric,numeric)',
    'public.remove_purchase_line(uuid,uuid,uuid)',
    'public.post_purchase(uuid,uuid)',
    'public.create_and_post_purchase_reversal(uuid,uuid,text,text)'
  ] LOOP
    IF NOT pg_catalog.has_function_privilege(
         'authenticated', v_function_signature, 'EXECUTE'
       )
      OR pg_catalog.has_function_privilege(
           'anon', v_function_signature, 'EXECUTE'
         ) THEN
      RAISE EXCEPTION 'unexpected RPC execute grants for %', v_function_signature;
    END IF;
  END LOOP;

  IF pg_catalog.has_function_privilege(
       'authenticated',
       'public.require_purchasing_access(uuid)',
       'EXECUTE'
     )
    OR pg_catalog.has_function_privilege(
         'authenticated',
         'public.apply_purchase_inventory(uuid,uuid,smallint)',
         'EXECUTE'
       ) THEN
    RAISE EXCEPTION 'internal purchasing helpers must not be executable by authenticated';
  END IF;

  RAISE NOTICE 'Migration 004 rollback-only verification passed.';
END;
$test$;

-- Forces Migration 002 and 003 deferred integrity triggers to run before the
-- rollback. This is not a concurrency test and must not be changed to COMMIT.
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;

-- Two-session concurrency checks (run separately in a disposable database):
-- 1. Begin posting a draft in session A, then attempt a line edit in session B.
--    Exactly one operation may proceed first; the second observes posted state
--    or receives a serialization failure, never a stale posted line set.
-- 2. Call create_and_post_purchase_reversal concurrently twice for the same
--    original purchase. Both calls should return the same reversal ID only
--    when retry arguments match; otherwise one receives a duplicate conflict.
-- 3. Post two purchases for the same products in opposite line order. The
--    sorted product locks must prevent a lost balance update; serialization or
--    deadlock retries must not leave partial movements or balances.