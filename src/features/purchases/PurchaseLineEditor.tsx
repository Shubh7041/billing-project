import { Button } from "../../components/ui";
import type { Product, ProductUnit } from "../catalog/catalogTypes";
import {
  calculateLineMinorUnits,
  formatBaseQuantity,
  formatInrMinorUnits,
} from "./purchaseDemoData";
import type { PurchaseLine } from "./purchaseTypes";

interface PurchaseLineEditorProps {
  line: PurchaseLine;
  products: Product[];
  onChange: (line: PurchaseLine) => void;
  onRemove: () => void;
}

function makeLine(product: Product, unit: ProductUnit, previous: PurchaseLine): PurchaseLine {
  return {
    ...previous,
    productId: product.id,
    productUnitId: unit.id,
    productNameSnapshot: product.name,
    skuSnapshot: product.sku,
    unitNameSnapshot: unit.unitName,
    unitCodeSnapshot: unit.unitCode,
    baseQuantityPerUnitSnapshot: unit.baseQuantity,
  };
}

export function PurchaseLineEditor({
  line,
  products,
  onChange,
  onRemove,
}: PurchaseLineEditorProps) {
  const product = products.find((item) => item.id === line.productId);
  const purchasableUnits = product?.units.filter((unit) => unit.isPurchasable) ?? [];
  const selectedUnit = purchasableUnits.find((unit) => unit.id === line.productUnitId);
  const baseUnit = product?.units.find((unit) => unit.isBaseUnit);
  const lineTotal = calculateLineMinorUnits(line.quantity, line.unitCost);

  function chooseProduct(productId: string) {
    const nextProduct = products.find((item) => item.id === productId);
    const firstUnit = nextProduct?.units.find((unit) => unit.isPurchasable);
    if (!nextProduct || !firstUnit) {
      onChange({ ...line, productId, productUnitId: "" });
      return;
    }
    onChange(makeLine(nextProduct, firstUnit, line));
  }

  function chooseUnit(unitId: string) {
    const nextUnit = purchasableUnits.find((unit) => unit.id === unitId);
    if (product && nextUnit) onChange(makeLine(product, nextUnit, line));
  }

  return (
    <fieldset className="purchase-line-editor">
      <legend className="purchase-line-legend">
        {line.productNameSnapshot || "Purchase line"}
      </legend>

      <div className="purchase-line-fields">
        <div className="purchase-form-field purchase-line-product">
          <label htmlFor={`purchase-product-${line.id}`}>Product</label>
          <select
            id={`purchase-product-${line.id}`}
            value={line.productId}
            onChange={(event) => chooseProduct(event.target.value)}
          >
            <option value="">Select product</option>
            {products
              .filter((item) => item.isActive || item.id === line.productId)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.sku}{item.isActive ? "" : " (inactive)"}
                </option>
              ))}
          </select>
        </div>

        <div className="purchase-form-field">
          <label htmlFor={`purchase-unit-${line.id}`}>Purchase unit</label>
          <select
            id={`purchase-unit-${line.id}`}
            value={selectedUnit?.id ?? ""}
            disabled={!product || purchasableUnits.length === 0}
            onChange={(event) => chooseUnit(event.target.value)}
          >
            <option value="">Select unit</option>
            {purchasableUnits.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.unitName}
              </option>
            ))}
          </select>
          {selectedUnit && (
            <span className="purchase-field-help">
              1 {selectedUnit.unitName} = {formatBaseQuantity(BigInt(selectedUnit.baseQuantity))}{" "}
              {baseUnit?.unitName ?? product?.baseUnitCode ?? "base units"}
            </span>
          )}
        </div>

        <div className="purchase-form-field">
          <label htmlFor={`purchase-quantity-${line.id}`}>Quantity</label>
          <input
            id={`purchase-quantity-${line.id}`}
            type="text"
            inputMode="numeric"
            value={line.quantity}
            onChange={(event) => onChange({ ...line, quantity: event.target.value })}
            placeholder="Whole units"
          />
        </div>

        <div className="purchase-form-field">
          <label htmlFor={`purchase-unit-cost-${line.id}`}>Unit cost (₹)</label>
          <input
            id={`purchase-unit-cost-${line.id}`}
            type="text"
            inputMode="decimal"
            value={line.unitCost}
            onChange={(event) => onChange({ ...line, unitCost: event.target.value })}
            placeholder="0.00"
          />
        </div>

        <div className="purchase-line-total">
          <span>Line subtotal</span>
          <strong>{lineTotal === null ? "Enter a valid quantity and cost" : formatInrMinorUnits(lineTotal)}</strong>
        </div>
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          Remove line
        </Button>
      </div>
    </fieldset>
  );
}