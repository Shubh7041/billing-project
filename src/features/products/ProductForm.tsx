import { useState, type FormEvent } from "react";
import { Button, Card } from "../../components/ui";
import { useCatalogDemo } from "../catalog/catalogDemoContext";
import type { Product, ProductInput, ProductUnit } from "../catalog/catalogTypes";
import { ProductUnitEditor } from "./ProductUnitEditor";

interface ProductFormProps {
  product?: Product;
  onSubmit: (input: ProductInput) => string | null;
  onCancel: () => void;
}

function createBaseUnit(): ProductUnit {
  return {
    id: crypto.randomUUID(),
    unitName: "",
    unitCode: "",
    baseQuantity: "1",
    isBaseUnit: true,
    isSellable: true,
    isPurchasable: true,
    sellingPrice: "",
  };
}

function validateUnits(units: ProductUnit[]): string | null {
  if (units.length === 0) return "Add at least one unit for this product.";

  const baseUnits = units.filter((unit) => unit.isBaseUnit);
  if (baseUnits.length !== 1) return "Select exactly one base unit.";

  const unitCodes = new Set<string>();
  for (const unit of units) {
    if (!unit.unitName.trim()) return "Enter a label for every unit.";
    const unitCode = unit.unitCode.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(unitCode)) {
      return "Unit codes must start with a letter and contain only lowercase letters, numbers, or underscores.";
    }
    if (unitCodes.has(unitCode)) return "Unit codes must be unique per product.";
    unitCodes.add(unitCode);

    const factor = unit.baseQuantity.trim();
    if (!/^\d+$/.test(factor)) {
      return "Conversion factors must be whole positive numbers.";
    }
    const factorValue = BigInt(factor);
    if (factorValue < 1n || factorValue > 999999999999999999n) {
      return "Conversion factors must be between 1 and 999999999999999999.";
    }
    if (unit.isBaseUnit && factorValue !== 1n) {
      return "The base unit conversion factor must be exactly 1.";
    }

    if (!/^(?:\d{1,12})(?:\.\d{1,2})?$/.test(unit.sellingPrice.trim())) {
      return "Enter a non-negative selling price with up to two decimal places.";
    }
    const [whole, fraction = ""] = unit.sellingPrice.trim().split(".");
    const priceInCents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
    if (priceInCents > 99999999999999n) {
      return "Selling price exceeds the supported INR amount.";
    }
  }

  return null;
}

export function ProductForm({ product, onSubmit, onCancel }: ProductFormProps) {
  const { categories } = useCatalogDemo();
  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [units, setUnits] = useState<ProductUnit[]>(
    () => product?.units ?? [createBaseUnit()],
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    const normalizedSku = sku.trim().toUpperCase();

    if (!normalizedName) {
      setError("Enter a product name.");
      return;
    }
    if (!normalizedSku) {
      setError("Enter a SKU.");
      return;
    }

    const unitsError = validateUnits(units);
    if (unitsError) {
      setError(unitsError);
      return;
    }

    const submitError = onSubmit({
      name: normalizedName,
      sku: normalizedSku,
      description: description.trim(),
      categoryId: categoryId || null,
      isActive,
      units: units.map((unit) => ({
        ...unit,
        unitName: unit.unitName.trim(),
        unitCode: unit.unitCode.trim().toLowerCase(),
        baseQuantity: unit.baseQuantity.trim(),
        sellingPrice: unit.sellingPrice.trim(),
      })),
    });
    setError(submitError);
  }

  const categoryOptions = categories.filter(
    (category) => category.isActive || category.id === product?.categoryId,
  );

  return (
    <Card
      className="catalog-form-card"
      title={product ? "Edit product" : "Add product"}
      description="SKU values are normalized to uppercase and unique within this store. Product names are not unique in the current schema."
    >
      <form className="catalog-form" onSubmit={handleSubmit} noValidate>
        <div className="catalog-form-grid">
          <div className="catalog-form-field">
            <label htmlFor="product-name">Product name</label>
            <input
              id="product-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={error && !name.trim() ? true : undefined}
              autoComplete="off"
              required
            />
          </div>

          <div className="catalog-form-field">
            <label htmlFor="product-sku">SKU</label>
            <input
              id="product-sku"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              autoComplete="off"
              required
            />
            <span className="catalog-field-help">
              No barcode field exists in the current database schema.
            </span>
          </div>

          <div className="catalog-form-field">
            <label htmlFor="product-category">Category (optional)</label>
            <select
              id="product-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Uncategorized</option>
              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}{category.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </div>

          <div className="catalog-form-field catalog-form-field-wide">
            <label htmlFor="product-description">Description (optional)</label>
            <textarea
              id="product-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </div>

        <ProductUnitEditor units={units} onChange={setUnits} />

        <label className="catalog-checkbox-field">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <span>Active product</span>
        </label>

        {error && <p className="catalog-form-error" role="alert">{error}</p>}

        <div className="catalog-form-actions">
          <Button type="submit">{product ? "Save product" : "Create product"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}