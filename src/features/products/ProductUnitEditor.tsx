import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../components/ui";
import { Icon } from "../../components/ui";
import type { ProductUnit } from "../catalog/catalogTypes";

interface ProductUnitEditorProps {
  units: ProductUnit[];
  onChange: (units: ProductUnit[]) => void;
}

function createUnit(): ProductUnit {
  return {
    id: crypto.randomUUID(),
    unitName: "",
    unitCode: "",
    baseQuantity: "1",
    isBaseUnit: false,
    isSellable: true,
    isPurchasable: true,
    sellingPrice: "",
  };
}

export function ProductUnitEditor({ units, onChange }: ProductUnitEditorProps) {
  function updateUnit<K extends keyof ProductUnit>(
    unitId: string,
    key: K,
    value: ProductUnit[K],
  ) {
    onChange(
      units.map((unit) =>
        unit.id === unitId ? { ...unit, [key]: value } : unit,
      ),
    );
  }

  function selectBaseUnit(unitId: string) {
    onChange(
      units.map((unit) =>
        unit.id === unitId
          ? { ...unit, isBaseUnit: true, baseQuantity: "1" }
          : { ...unit, isBaseUnit: false },
      ),
    );
  }

  function addUnit() {
    const nextUnit = createUnit();
    if (units.length === 0) {
      nextUnit.isBaseUnit = true;
    }
    onChange([...units, nextUnit]);
  }

  return (
    <fieldset className="product-unit-editor">
      <legend>Sellable and purchasable units</legend>
      <p className="product-unit-help">
        Choose any base unit that fits this product. Each other factor is the
        number of base units contained in one selected unit.
      </p>

      <div className="product-unit-list">
        {units.map((unit, index) => (
          <section className="product-unit-card" key={unit.id}>
            <div className="product-unit-card-heading">
              <h3>Unit {index + 1}</h3>
              <label className="catalog-checkbox-field product-base-choice">
                <input
                  type="radio"
                  name="base-unit"
                  checked={unit.isBaseUnit}
                  onChange={() => selectBaseUnit(unit.id)}
                />
                <span>Base unit</span>
              </label>
            </div>

            <div className="product-unit-fields">
              <div className="catalog-form-field">
                <label htmlFor={`unit-name-${unit.id}`}>Unit label</label>
                <input
                  id={`unit-name-${unit.id}`}
                  value={unit.unitName}
                  onChange={(event) =>
                    updateUnit(unit.id, "unitName", event.target.value)
                  }
                  placeholder="e.g. Packet, Box, Piece"
                />
              </div>

              <div className="catalog-form-field">
                <label htmlFor={`unit-code-${unit.id}`}>Unit code</label>
                <input
                  id={`unit-code-${unit.id}`}
                  value={unit.unitCode}
                  onChange={(event) =>
                    updateUnit(unit.id, "unitCode", event.target.value)
                  }
                  placeholder="e.g. packet"
                  autoComplete="off"
                />
              </div>

              <div className="catalog-form-field">
                <label htmlFor={`unit-factor-${unit.id}`}>
                  Base units per {unit.unitName.trim() || "unit"}
                </label>
                <input
                  id={`unit-factor-${unit.id}`}
                  type="text"
                  inputMode="numeric"
                  value={unit.baseQuantity}
                  onChange={(event) =>
                    updateUnit(unit.id, "baseQuantity", event.target.value)
                  }
                  disabled={unit.isBaseUnit}
                  aria-describedby={`unit-factor-help-${unit.id}`}
                />
                <span className="catalog-field-help" id={`unit-factor-help-${unit.id}`}>
                  {unit.isBaseUnit
                    ? "The base unit is always 1 base unit."
                    : `1 ${unit.unitName.trim() || "unit"} = ${unit.baseQuantity || "?"} ${units.find((candidate) => candidate.isBaseUnit)?.unitName || "base units"}.`}
                </span>
              </div>

              <div className="catalog-form-field">
                <label htmlFor={`unit-price-${unit.id}`}>Selling price (₹)</label>
                <input
                  id={`unit-price-${unit.id}`}
                  type="text"
                  inputMode="decimal"
                  value={unit.sellingPrice}
                  onChange={(event) =>
                    updateUnit(unit.id, "sellingPrice", event.target.value)
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="product-unit-flags">
              <label className="catalog-checkbox-field">
                <input
                  type="checkbox"
                  checked={unit.isSellable}
                  onChange={(event) =>
                    updateUnit(unit.id, "isSellable", event.target.checked)
                  }
                />
                <span>Can be sold</span>
              </label>
              <label className="catalog-checkbox-field">
                <input
                  type="checkbox"
                  checked={unit.isPurchasable}
                  onChange={(event) =>
                    updateUnit(unit.id, "isPurchasable", event.target.checked)
                  }
                />
                <span>Can be purchased</span>
              </label>
              {!unit.isBaseUnit && units.length > 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onChange(units.filter((item) => item.id !== unit.id))}
                >
                  <Icon icon={Trash2} size={15} />
                  Remove unit
                </Button>
              )}
            </div>
          </section>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={addUnit}>
        <Icon icon={Plus} size={16} />
        Add unit
      </Button>
    </fieldset>
  );
}