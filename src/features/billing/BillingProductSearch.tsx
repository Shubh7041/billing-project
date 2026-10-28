import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Card, EmptyState, Icon } from "../../components/ui";
import type { Product, ProductUnit } from "../catalog/catalogTypes";
import { formatMoney, parseMoneyToMinorUnits } from "./billingMoney";

interface BillingProductSearchProps {
  products: Product[];
  onAdd: (product: Product, unit: ProductUnit) => void;
}

export function BillingProductSearch({ products, onAdd }: BillingProductSearchProps) {
  const [query, setQuery] = useState("");
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      if (!product.isActive) return false;
      if (!normalizedQuery) return true;
      return `${product.name} ${product.sku}`.toLowerCase().includes(normalizedQuery);
    });
  }, [products, query]);

  return (
    <Card className="billing-card billing-product-search" title="Find products" description="Search by product name or SKU. Barcode values are not stored in the current catalog schema.">
      <label className="billing-search-field" htmlFor="billing-product-search">
        <span><Icon icon={Search} size={15} /> Product search</span>
        <input
          id="billing-product-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type a name or SKU"
          autoComplete="off"
        />
      </label>

      <p className="billing-stock-note" role="note">
        Stock availability is not checked in demo mode.
      </p>

      {filteredProducts.length === 0 ? (
        <EmptyState
          title={query ? "No matching products" : "No products available"}
          description={query ? "Try a different product name or SKU." : "Active sellable products will appear here."}
        />
      ) : (
        <ul className="billing-product-results" aria-label="Matching products">
          {filteredProducts.map((product) => {
            const sellableUnits = product.units.filter((unit) => unit.isSellable);
            return (
              <li className="billing-product-result" key={product.id}>
                <div className="billing-product-heading">
                  <div className="billing-product-copy">
                    <strong>{product.name}</strong>
                    <span>SKU {product.sku}</span>
                  </div>
                  <span className="billing-base-unit">
                    Base: {product.units.find((unit) => unit.isBaseUnit)?.unitName ?? product.baseUnitCode}
                  </span>
                </div>
                {sellableUnits.length === 0 ? (
                  <p className="billing-no-sellable-units">No sellable units configured.</p>
                ) : (
                  <div className="billing-unit-options">
                    {sellableUnits.map((unit) => {
                      const price = parseMoneyToMinorUnits(unit.sellingPrice);
                      return (
                        <button
                          className="billing-unit-option"
                          key={unit.id}
                          type="button"
                          disabled={price === null}
                          onClick={() => onAdd(product, unit)}
                          aria-label={`Add ${product.name}, ${unit.unitName}, ${price === null ? "price unavailable" : formatMoney(price)}`}
                        >
                          <Icon icon={Plus} size={15} />
                          <span>{unit.unitName}</span>
                          <strong>{price === null ? "Price unavailable" : formatMoney(price)}</strong>
                          <small>1 {unit.unitName} = {unit.baseQuantity} {product.units.find((baseUnit) => baseUnit.isBaseUnit)?.unitName ?? product.baseUnitCode}</small>
                        </button>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}