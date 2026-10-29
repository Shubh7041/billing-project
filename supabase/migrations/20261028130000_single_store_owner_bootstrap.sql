-- Single-store bootstrap and authenticated store-context reads.
-- Apply only after reviewing the target project's actual migration state.
-- This migration does not grant browser-side profile/store/membership writes.

DO $preflight$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.stores AS store
    OFFSET 1
  ) THEN
    RAISE EXCEPTION
      'More than one store already exists; reconcile the target database before enabling the single-store constraint';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN ('profiles', 'store_memberships', 'stores')
      AND relation.relrowsecurity IS NOT TRUE
  ) OR (
    SELECT pg_catalog.count(*)
    FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname IN ('profiles', 'store_memberships', 'stores')
      AND relation.relkind IN ('r', 'p')
  ) <> 3 THEN
    RAISE EXCEPTION
      'Expected profiles, store_memberships, and stores to exist with RLS enabled';
  END IF;

  IF NOT EXISTS (
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
    RAISE EXCEPTION
      'Expected Migration 001 identity constraints are missing; review remote schema drift';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_policies AS policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename IN ('profiles', 'store_memberships', 'stores')
  ) THEN
    RAISE EXCEPTION
      'Existing identity/store RLS policies were found; review them before applying this migration to avoid permissive policy composition';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.column_privileges AS privilege
    WHERE privilege.table_schema = 'public'
      AND privilege.table_name IN ('profiles', 'store_memberships', 'stores')
      AND privilege.grantee IN ('PUBLIC', 'anon', 'authenticated')
  ) THEN
    RAISE EXCEPTION
      'Existing column-level identity/store grants were found; review them before applying this migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles AS role
    WHERE role.rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION
      'Supabase postgres role is unavailable; the SQL Editor bootstrap execution grant cannot be installed';
  END IF;
END;
$preflight$;

-- A constant-expression unique index enforces this product's single-store rule
-- even when writes are made outside the bootstrap function.
CREATE UNIQUE INDEX stores_single_store_limit_key
  ON public.stores ((true));

REVOKE ALL ON TABLE
  public.profiles,
  public.store_memberships,
  public.stores
FROM PUBLIC, anon, authenticated;

GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON TABLE
  public.profiles,
  public.store_memberships,
  public.stores
TO authenticated;

GRANT USAGE ON TYPE public.store_role TO authenticated;

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY store_memberships_select_own_active
  ON public.store_memberships
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND is_active
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS profile
      WHERE profile.id = store_memberships.user_id
        AND profile.is_active
    )
  );

CREATE POLICY stores_select_active_membership
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    is_active
    AND EXISTS (
      SELECT 1
      FROM public.store_memberships AS membership
      WHERE membership.store_id = stores.id
        AND membership.user_id = (SELECT auth.uid())
        AND membership.is_active
    )
  );

CREATE FUNCTION public.bootstrap_initial_store_owner(
  p_auth_user_id uuid,
  p_store_name text,
  p_display_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_store_name text := pg_catalog.btrim(p_store_name);
  v_display_name text := pg_catalog.btrim(p_display_name);
  v_email_confirmed_at timestamptz;
  v_store_id uuid;
  v_existing_store_name text;
  v_existing_display_name text;
  v_existing_profile_active boolean;
  v_existing_role public.store_role;
  v_existing_membership_active boolean;
  v_existing_store_active boolean;
  v_existing_currency_code text;
  v_existing_timezone text;
BEGIN
  IF p_auth_user_id IS NULL
    OR v_store_name IS NULL
    OR v_store_name = ''
    OR v_display_name IS NULL
    OR v_display_name = '' THEN
    RAISE EXCEPTION 'confirmed Auth user ID, store name, and owner display name are required'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize all bootstrap attempts. The singleton index below is the final
  -- database-level guard against concurrent inserts from any other writer.
  PERFORM pg_catalog.pg_advisory_xact_lock(2051971000, 1);

  SELECT auth_user.email_confirmed_at
  INTO v_email_confirmed_at
  FROM auth.users AS auth_user
  WHERE auth_user.id = p_auth_user_id
    AND auth_user.email IS NOT NULL;

  IF NOT FOUND OR v_email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'the specified Supabase Auth user does not exist with a confirmed email'
      USING ERRCODE = '42501';
  END IF;

    SELECT store.id,
        store.name,
        store.is_active,
        store.currency_code,
        store.timezone
    INTO v_store_id,
      v_existing_store_name,
      v_existing_store_active,
      v_existing_currency_code,
      v_existing_timezone
  FROM public.stores AS store
  ORDER BY store.id
  LIMIT 1;

  IF FOUND THEN
    SELECT profile.display_name,
           profile.is_active,
           membership.role,
           membership.is_active
    INTO v_existing_display_name,
         v_existing_profile_active,
         v_existing_role,
         v_existing_membership_active
    FROM public.profiles AS profile
    JOIN public.store_memberships AS membership
      ON membership.user_id = profile.id
    WHERE profile.id = p_auth_user_id
      AND membership.store_id = v_store_id;

    IF FOUND
      AND v_existing_store_name = v_store_name
      AND v_existing_display_name = v_display_name
      AND v_existing_profile_active
      AND v_existing_role = 'owner'::public.store_role
      AND v_existing_membership_active
      AND v_existing_store_active
      AND v_existing_currency_code = 'INR'
      AND v_existing_timezone = 'Asia/Kolkata' THEN
      RETURN v_store_id;
    END IF;

    RAISE EXCEPTION
      'a store already exists; bootstrap is only repeatable for the exact initial owner and store details'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.stores (name, currency_code, timezone, is_active)
  VALUES (v_store_name, 'INR', 'Asia/Kolkata', true)
  RETURNING id INTO v_store_id;

  INSERT INTO public.profiles (id, display_name, is_active)
  VALUES (p_auth_user_id, v_display_name, true)
  ON CONFLICT (id)
  DO UPDATE SET
    display_name = EXCLUDED.display_name,
    is_active = true;

  INSERT INTO public.store_memberships (store_id, user_id, role, is_active)
  VALUES (v_store_id, p_auth_user_id, 'owner'::public.store_role, true);

  RETURN v_store_id;
END;
$function$;

COMMENT ON FUNCTION public.bootstrap_initial_store_owner(uuid, text, text) IS
  'One-time SQL Editor bootstrap for the confirmed first Auth user. Never callable by anon, authenticated, or service_role clients.';

REVOKE ALL ON FUNCTION public.bootstrap_initial_store_owner(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_initial_store_owner(uuid, text, text)
  TO postgres;