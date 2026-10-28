import { Pencil, X } from "lucide-react";
import { Button, Card, Icon, StatusBadge } from "../../components/ui";
import type { Category, Product } from "../catalog/catalogTypes";

interface ProductDetailsProps {
  product: Product;
  categories: Category[];
  onEdit: () => void;
  onClose: () => void;
}

function formatPrice(value: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function ProductDetails({
  product,
  categories,
  onEdit,
  onClose,
}: ProductDetailsProps) {
  const baseUnit = product.units.find((unit) => unit.isBaseUnit);
  const category = categories.find((item) => item.id === product.categoryId);

  return (
    <Card
      className="catalog-detail-card"
      title={product.name}
      description={`SKU ${product.sku} · ${category?.name ?? "Uncategorized"}`}
      headerAction={
        <div className="catalog-row-actions">
          <Button size="sm" onClick={onEdit}><Icon icon={Pencil} size={15} /> Edit product</Button>
          <Button size="sm" variant="outline" onClick={onClose}><Icon icon={X} size={15} /> Close</Button>
        </div>
      }
    >
      <div className="product-detail-meta">
        <StatusBadge variant={product.isActive ? "success" : "neutral"}>
          {product.isActive ? "Active" : "Inactive"}
        </StatusBadge>
        <p>{product.description || "No description provided."}</p>
      </div>

      <h3 className="product-detail-heading">Units and conversions</h3>
      <ul className="product-detail-units">
        {product.units.map((unit) => (
          <li key={unit.id}>
            <div>
              <strong>{unit.unitName}</strong>
              <span className="product-unit-code">{unit.unitCode}</span>
            </div>
            <p>
              {unit.isBaseUnit
                ? `Base unit · 1 ${unit.unitName} = 1 ${baseUnit?.unitName ?? unit.unitName}`
                : `1 ${unit.unitName} = ${unit.baseQuantity} ${baseUnit?.unitName ?? "base units"}`}
            </p>
            <div className="product-detail-flags">
              {unit.isSellable && <span>Sellable</span>}
              {unit.isPurchasable && <span>Purchasable</span>}
              <strong>{formatPrice(unit.sellingPrice)}</strong>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}