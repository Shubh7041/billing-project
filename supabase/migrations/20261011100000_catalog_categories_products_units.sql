-- Store-scoped catalog and sellable-unit schema.
-- Product creation must include exactly one designated base unit in the same
-- transaction; the deferred foreign key and constraint triggers enforce this.

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT categories_name_not_blank
    CHECK (name = pg_catalog.btrim(name) AND name <> ''),
  CONSTRAINT categories_store_id_id_key UNIQUE (store_id, id)
);

-- Names are trimmed and compared case-insensitively; displayed casing is preserved.
CREATE UNIQUE INDEX categories_store_name_normalized_key
  ON public.categories (store_id, pg_catalog.lower(pg_catalog.btrim(name)));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores (id) ON DELETE RESTRICT,
  category_id uuid,
  sku text NOT NULL,
  name text NOT NULL,
  description text,
  base_unit_code text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT products_sku_normalized
    CHECK (sku = pg_catalog.upper(pg_catalog.btrim(sku)) AND sku <> ''),
  CONSTRAINT products_name_not_blank
    CHECK (name = pg_catalog.btrim(name) AND name <> ''),
  CONSTRAINT products_base_unit_code_normalized
    CHECK (
      base_unit_code = pg_catalog.lower(pg_catalog.btrim(base_unit_code))
      AND base_unit_code ~ '^[a-z][a-z0-9_]*$'
    ),
  CONSTRAINT products_category_store_fkey
    FOREIGN KEY (store_id, category_id)
    REFERENCES public.categories (store_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT products_store_id_id_key UNIQUE (store_id, id)
);

-- SKU is stored in uppercase and unique within a store, not globally.
CREATE UNIQUE INDEX products_store_sku_key
  ON public.products (store_id, sku);

CREATE INDEX products_store_category_idx
  ON public.products (store_id, category_id)
  WHERE category_id IS NOT NULL;

CREATE TABLE public.product_units (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  store_id uuid NOT NULL,
  product_id uuid NOT NULL,
  unit_name text NOT NULL,
  unit_code text NOT NULL,
  base_quantity numeric NOT NULL,
  is_base_unit boolean NOT NULL,
  is_sellable boolean NOT NULL,
  is_purchasable boolean NOT NULL,
  selling_price numeric(14, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT product_units_product_store_fkey
    FOREIGN KEY (store_id, product_id)
    REFERENCES public.products (store_id, id)
    ON DELETE RESTRICT,
  CONSTRAINT product_units_name_not_blank
    CHECK (unit_name = pg_catalog.btrim(unit_name) AND unit_name <> ''),
  CONSTRAINT product_units_code_normalized
    CHECK (
      unit_code = pg_catalog.lower(pg_catalog.btrim(unit_code))
      AND unit_code ~ '^[a-z][a-z0-9_]*$'
    ),
  CONSTRAINT product_units_base_quantity_positive_integer
    CHECK (
      base_quantity > 0
      AND base_quantity = pg_catalog.trunc(base_quantity)
      AND base_quantity <= 999999999999999999
    ),
  CONSTRAINT product_units_base_factor_is_one
    CHECK (NOT is_base_unit OR base_quantity = 1),
  CONSTRAINT product_units_selling_price_nonnegative
    CHECK (selling_price >= 0 AND selling_price <> 'NaN'::numeric),
  CONSTRAINT product_units_store_product_code_key
    UNIQUE (store_id, product_id, unit_code),
  CONSTRAINT product_units_store_product_id_key
    UNIQUE (store_id, product_id, id)
);

-- Supports future tenant-scoped unit references and guarantees at most one
-- row can be marked as the base unit for a product.
CREATE UNIQUE INDEX product_units_one_base_per_product_key
  ON public.product_units (store_id, product_id)
  WHERE is_base_unit;

-- This circular, deferred FK permits the product and units to be inserted in
-- one transaction while requiring the product's declared base code to exist.
ALTER TABLE public.products
  ADD CONSTRAINT products_base_unit_fkey
  FOREIGN KEY (store_id, id, base_unit_code)
  REFERENCES public.product_units (store_id, product_id, unit_code)
  ON DELETE NO ACTION
  DEFERRABLE INITIALLY DEFERRED;

-- Check that the product's designated unit is also marked as its one base unit.
-- SECURITY DEFINER is needed so the invariant remains checkable after later
-- migrations add RLS policies that hide catalog rows from the writing user.
CREATE FUNCTION public.assert_product_base_unit(
  p_store_id uuid,
  p_product_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
  v_base_unit_code text;
BEGIN
  SELECT product.base_unit_code
  INTO v_base_unit_code
  FROM public.products AS product
  WHERE product.store_id = p_store_id
    AND product.id = p_product_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.product_units AS product_unit
    WHERE product_unit.store_id = p_store_id
      AND product_unit.product_id = p_product_id
      AND product_unit.unit_code = v_base_unit_code
      AND product_unit.is_base_unit
      AND product_unit.base_quantity = 1
  ) THEN
    RAISE EXCEPTION 'each product must have one designated base unit with a factor of 1'
      USING ERRCODE = '23514';
  END IF;
END;
$function$;

CREATE FUNCTION public.check_product_base_unit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  PERFORM public.assert_product_base_unit(NEW.store_id, NEW.id);
  RETURN NULL;
END;
$function$;

CREATE FUNCTION public.check_product_units_base_unit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.assert_product_base_unit(OLD.store_id, OLD.product_id);
  ELSIF TG_OP = 'UPDATE'
    AND (OLD.store_id, OLD.product_id)
        IS DISTINCT FROM (NEW.store_id, NEW.product_id) THEN
    PERFORM public.assert_product_base_unit(OLD.store_id, OLD.product_id);
    PERFORM public.assert_product_base_unit(NEW.store_id, NEW.product_id);
  ELSE
    PERFORM public.assert_product_base_unit(NEW.store_id, NEW.product_id);
  END IF;

  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_product_base_unit(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_product_base_unit()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_product_units_base_unit()
  FROM PUBLIC, anon, authenticated;

CREATE CONSTRAINT TRIGGER products_require_base_unit
  AFTER INSERT OR UPDATE ON public.products
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_product_base_unit();

CREATE CONSTRAINT TRIGGER product_units_require_base_unit
  AFTER INSERT OR UPDATE OR DELETE ON public.product_units
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.check_product_units_base_unit();

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER product_units_set_updated_at
  BEFORE UPDATE ON public.product_units
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.categories,
  public.products,
  public.product_units
FROM PUBLIC, anon, authenticated;

-- No client policies or grants are defined in this migration. Catalog access
-- remains denied until a later migration introduces reviewed, scoped rules.