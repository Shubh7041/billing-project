-- Foundational identity and register schema for the initial single-store setup.
-- No client access policies or client table grants are added in this migration.

CREATE TYPE public.store_role AS ENUM (
  'owner',
  'manager',
  'cashier',
  'inventory_clerk'
);

REVOKE ALL ON TYPE public.store_role FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
BEGIN
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.validate_store_timezone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names AS supported_timezones
    WHERE supported_timezones.name = NEW.timezone
  ) THEN
    RAISE EXCEPTION 'stores.timezone must be a supported PostgreSQL time zone name'
      USING ERRCODE = '22023';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.validate_store_timezone() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  name text NOT NULL,
  currency_code text NOT NULL DEFAULT 'INR',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT stores_name_not_blank
    CHECK (name = pg_catalog.btrim(name) AND name <> ''),
  CONSTRAINT stores_currency_is_inr CHECK (currency_code = 'INR'),
  CONSTRAINT stores_timezone_not_blank
    CHECK (timezone = pg_catalog.btrim(timezone) AND timezone <> '')
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE RESTRICT,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT profiles_display_name_not_blank
    CHECK (display_name = pg_catalog.btrim(display_name) AND display_name <> '')
);

CREATE TABLE public.store_memberships (
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  role public.store_role NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT store_memberships_pkey PRIMARY KEY (store_id, user_id)
);

CREATE TABLE public.registers (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  register_code text NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT registers_code_not_blank
    CHECK (
      register_code = pg_catalog.upper(pg_catalog.btrim(register_code))
      AND register_code <> ''
    ),
  CONSTRAINT registers_name_not_blank
    CHECK (name = pg_catalog.btrim(name) AND name <> ''),
  CONSTRAINT registers_store_code_key UNIQUE (store_id, register_code),
  CONSTRAINT registers_store_id_id_key UNIQUE (store_id, id)
);

CREATE INDEX store_memberships_user_store_idx
  ON public.store_memberships (user_id, store_id);

CREATE TRIGGER stores_set_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER stores_validate_timezone
  BEFORE INSERT OR UPDATE OF timezone ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.validate_store_timezone();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER store_memberships_set_updated_at
  BEFORE UPDATE ON public.store_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER registers_set_updated_at
  BEFORE UPDATE ON public.registers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.stores,
  public.profiles,
  public.store_memberships,
  public.registers
FROM PUBLIC, anon, authenticated;

-- Intentionally create no RLS policies. With RLS enabled and no policies,
-- client roles cannot read or write these tables until a later reviewed migration
-- grants narrowly scoped privileges and adds explicit policies.

-- Bootstrap is deliberately external to this migration: a trusted operator
-- first invites/creates the Auth user, then uses the Supabase SQL editor under
-- an administrative database role to insert the store, its profile, and its
-- owner membership in one transaction. Explicitly set the owner's profile and
-- membership is_active values to true during that bootstrap. No public signup
-- path or owner seed is created here. Never place passwords or service-role
-- credentials in this file.
-- End of foundational identity migration.