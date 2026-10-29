-- Read-only privilege/schema verification and optional rollback-only bootstrap
-- exercise for 20261028130000_single_store_owner_bootstrap.sql.
-- Run in Supabase SQL Editor as postgres. This script is NOT applied by the app.
-- The main checks need no Auth user/session. The optional block below needs a
-- real, email-confirmed auth.users row, but does not require a browser JWT.

BEGIN;

DO $verify_schema_and_privileges$
DECLARE
  v_roles text[];
  v_policy_count integer;
  v_expected_policy_count integer := 3;
  v_table text;
  v_store_limit_index_exists boolean;
  v_function record;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = 'public.profiles'::regclass
      AND relation.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = 'public.store_memberships'::regclass
      AND relation.relrowsecurity
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = 'public.stores'::regclass
      AND relation.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS must remain enabled on profiles, store_memberships, and stores';
  END IF;

  SELECT pg_catalog.count(*)
  INTO v_policy_count
  FROM pg_catalog.pg_policies AS policy
  WHERE policy.schemaname = 'public'
    AND policy.tablename IN ('profiles', 'store_memberships', 'stores')
    AND policy.policyname IN (
      'profiles_select_own',
      'store_memberships_select_own_active',
      'stores_select_active_membership'
    )
    AND policy.cmd = 'SELECT'
    AND 'authenticated' = ANY(policy.roles);

  IF v_policy_count <> v_expected_policy_count THEN
    RAISE EXCEPTION 'Expected the three scoped authenticated SELECT policies; found %', v_policy_count;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies AS policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename = 'profiles'
      AND policy.policyname = 'profiles_select_own'
      AND policy.qual LIKE '%auth.uid()%'
      AND policy.qual LIKE '%id%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies AS policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename = 'store_memberships'
      AND policy.policyname = 'store_memberships_select_own_active'
      AND policy.qual LIKE '%auth.uid()%'
      AND policy.qual LIKE '%is_active%'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies AS policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename = 'stores'
      AND policy.policyname = 'stores_select_active_membership'
      AND policy.qual LIKE '%store_memberships%'
      AND policy.qual LIKE '%auth.uid()%'
      AND policy.qual LIKE '%is_active%'
  ) THEN
    RAISE EXCEPTION 'One or more identity/store policies do not enforce user/store active-membership scope';
  END IF;

  FOREACH v_table IN ARRAY ARRAY['public.profiles', 'public.store_memberships', 'public.stores'] LOOP
    IF NOT pg_catalog.has_table_privilege('authenticated', v_table, 'SELECT') THEN
      RAISE EXCEPTION 'authenticated is missing SELECT on %', v_table;
    END IF;

    IF pg_catalog.has_table_privilege('anon', v_table, 'SELECT')
      OR pg_catalog.has_table_privilege('authenticated', v_table, 'INSERT')
      OR pg_catalog.has_table_privilege('authenticated', v_table, 'UPDATE')
      OR pg_catalog.has_table_privilege('authenticated', v_table, 'DELETE')
      OR pg_catalog.has_table_privilege('anon', v_table, 'INSERT')
      OR pg_catalog.has_table_privilege('anon', v_table, 'UPDATE')
      OR pg_catalog.has_table_privilege('anon', v_table, 'DELETE') THEN
      RAISE EXCEPTION 'Unexpected client read/write privilege on %', v_table;
    END IF;
  END LOOP;

  IF NOT pg_catalog.has_type_privilege('authenticated', 'public.store_role', 'USAGE') THEN
    RAISE EXCEPTION 'authenticated is missing USAGE on public.store_role';
  END IF;

  SELECT pg_catalog.array_agg(enum_label.enumlabel::text ORDER BY enum_label.enumsortorder)
  INTO v_roles
  FROM pg_catalog.pg_enum AS enum_label
  JOIN pg_catalog.pg_type AS role_type ON role_type.oid = enum_label.enumtypid
  JOIN pg_catalog.pg_namespace AS role_schema ON role_schema.oid = role_type.typnamespace
  WHERE role_schema.nspname = 'public'
    AND role_type.typname = 'store_role';

  IF v_roles IS DISTINCT FROM ARRAY['owner', 'manager', 'cashier', 'inventory_clerk']::text[] THEN
    RAISE EXCEPTION 'Unexpected public.store_role values: %', v_roles;
  END IF;

  IF (
    SELECT column_default FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'stores'
      AND column_name = 'currency_code'
  ) NOT LIKE '%INR%'
    OR (
      SELECT column_default FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stores'
        AND column_name = 'timezone'
    ) NOT LIKE '%Asia/Kolkata%' THEN
    RAISE EXCEPTION 'Store currency/timezone defaults differ from the Migration 001 single-store defaults';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.profiles'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'auth.users'::regclass
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.store_memberships'::regclass
      AND constraint_row.conname = 'store_memberships_pkey'
      AND constraint_row.contype = 'p'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.store_memberships'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'public.profiles'::regclass
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.store_memberships'::regclass
      AND constraint_row.contype = 'f'
      AND constraint_row.confrelid = 'public.stores'::regclass
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.profiles'::regclass
      AND constraint_row.conname = 'profiles_display_name_not_blank'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.stores'::regclass
      AND constraint_row.conname = 'stores_currency_is_inr'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.stores'::regclass
      AND constraint_row.conname = 'stores_timezone_not_blank'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS constraint_row
    WHERE constraint_row.conrelid = 'public.store_memberships'::regclass
      AND constraint_row.conname = 'store_memberships_pkey'
  ) THEN
    RAISE EXCEPTION 'Expected profile/store/membership constraints are missing';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_index AS index_row
    JOIN pg_catalog.pg_class AS index_class ON index_class.oid = index_row.indexrelid
    JOIN pg_catalog.pg_namespace AS index_schema ON index_schema.oid = index_class.relnamespace
    WHERE index_schema.nspname = 'public'
      AND index_class.relname = 'stores_single_store_limit_key'
      AND index_row.indrelid = 'public.stores'::regclass
      AND index_row.indisunique
  ) INTO v_store_limit_index_exists;

  IF NOT v_store_limit_index_exists THEN
    RAISE EXCEPTION 'Single-store unique index is missing';
  END IF;

  SELECT procedure.prosecdef, procedure.proconfig
  INTO v_function
  FROM pg_catalog.pg_proc AS procedure
  WHERE procedure.oid = 'public.bootstrap_initial_store_owner(uuid,text,text)'::regprocedure;

  IF NOT FOUND OR v_function.prosecdef THEN
    RAISE EXCEPTION 'Bootstrap function is missing or unexpectedly SECURITY DEFINER';
  END IF;
  IF v_function.proconfig IS NULL
    OR NOT ('search_path=pg_catalog' = ANY(v_function.proconfig)) THEN
    RAISE EXCEPTION 'Bootstrap function must use a fixed pg_catalog search_path';
  END IF;

  IF NOT pg_catalog.has_function_privilege(
       'postgres', 'public.bootstrap_initial_store_owner(uuid,text,text)', 'EXECUTE'
     )
    OR pg_catalog.has_function_privilege(
       'anon', 'public.bootstrap_initial_store_owner(uuid,text,text)', 'EXECUTE'
     )
    OR pg_catalog.has_function_privilege(
       'authenticated', 'public.bootstrap_initial_store_owner(uuid,text,text)', 'EXECUTE'
     )
    OR pg_catalog.has_function_privilege(
       'service_role', 'public.bootstrap_initial_store_owner(uuid,text,text)', 'EXECUTE'
     ) THEN
    RAISE EXCEPTION 'Bootstrap execution must be available to postgres only';
  END IF;

  -- Migration 005 must not grant direct purchasing/inventory writes or alter
  -- the existing restricted purchasing RPC boundary.
  IF pg_catalog.has_table_privilege('authenticated', 'public.purchases', 'INSERT')
    OR pg_catalog.has_table_privilege('authenticated', 'public.purchase_items', 'INSERT')
    OR pg_catalog.has_table_privilege('authenticated', 'public.inventory_balances', 'UPDATE')
    OR pg_catalog.has_table_privilege('authenticated', 'public.inventory_movements', 'INSERT')
    OR NOT pg_catalog.has_function_privilege(
      'authenticated', 'public.create_purchase_draft(uuid,uuid,text,date,text,text)', 'EXECUTE'
    )
    OR pg_catalog.has_function_privilege(
      'authenticated', 'public.require_purchasing_access(uuid)', 'EXECUTE'
    ) THEN
    RAISE EXCEPTION 'Existing purchasing/inventory authorization boundary changed unexpectedly';
  END IF;

  RAISE NOTICE 'Schema, RLS policy, grants, role, constraint, bootstrap-function, and purchasing-boundary checks passed.';
END;
$verify_schema_and_privileges$;

-- Optional rollback-only path test. For a test with an Auth user, replace all
-- three NULLs with that confirmed user's UUID and test names. If the database
-- has no store, the function creates rows inside this transaction and the
-- final ROLLBACK removes them. If the exact owner/store is already provisioned,
-- the function returns it idempotently. Other existing state is rejected.
DO $verify_bootstrap_path$
DECLARE
  v_auth_user_id uuid := NULL;
  v_store_name text := NULL;
  v_display_name text := NULL;
  v_store_id uuid;
  v_retry_store_id uuid;
  v_rejected boolean := false;
  v_second_store_rejected boolean := false;
BEGIN
  IF v_auth_user_id IS NULL AND v_store_name IS NULL AND v_display_name IS NULL THEN
    RAISE NOTICE 'Optional bootstrap path test skipped; no Auth user values were supplied.';
    RETURN;
  END IF;

  IF v_auth_user_id IS NULL OR v_store_name IS NULL OR v_display_name IS NULL THEN
    RAISE EXCEPTION 'Supply all three optional bootstrap test values or leave all three NULL';
  END IF;

  v_store_id := public.bootstrap_initial_store_owner(
    v_auth_user_id,
    v_store_name,
    v_display_name
  );

  v_retry_store_id := public.bootstrap_initial_store_owner(
    v_auth_user_id,
    v_store_name,
    v_display_name
  );
  IF v_retry_store_id IS DISTINCT FROM v_store_id THEN
    RAISE EXCEPTION 'An identical bootstrap retry did not return the original store ID';
  END IF;

  BEGIN
    PERFORM public.bootstrap_initial_store_owner(
      v_auth_user_id,
      v_store_name || ' changed',
      v_display_name
    );
  EXCEPTION WHEN unique_violation THEN
    v_rejected := true;
  END;
  IF NOT v_rejected THEN
    RAISE EXCEPTION 'Bootstrap accepted mismatched store details after initial provisioning';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.stores AS store
    JOIN public.store_memberships AS membership
      ON membership.store_id = store.id
    JOIN public.profiles AS profile
      ON profile.id = membership.user_id
    WHERE store.id = v_store_id
      AND store.name = pg_catalog.btrim(v_store_name)
      AND store.currency_code = 'INR'
      AND store.timezone = 'Asia/Kolkata'
      AND store.is_active
      AND profile.id = v_auth_user_id
      AND profile.display_name = pg_catalog.btrim(v_display_name)
      AND profile.is_active
      AND membership.role = 'owner'::public.store_role
      AND membership.is_active
  ) THEN
    RAISE EXCEPTION 'Bootstrap did not produce the expected active single-store owner association';
  END IF;

  BEGIN
    INSERT INTO public.stores (name)
    VALUES ('Bootstrap verification second store');
  EXCEPTION WHEN unique_violation THEN
    v_second_store_rejected := true;
  END;
  IF NOT v_second_store_rejected THEN
    RAISE EXCEPTION 'The single-store constraint allowed a second store';
  END IF;

  RAISE NOTICE 'Optional bootstrap path check passed inside this rollback-only transaction.';
END;
$verify_bootstrap_path$;

ROLLBACK;

-- A real authenticated-session test is separate from the SQL Editor checks:
-- sign in through the app and confirm that it can read only its own profile,
-- active memberships, and stores tied to those memberships. Also verify from a
-- different Auth account that no rows from this owner/store are returned.