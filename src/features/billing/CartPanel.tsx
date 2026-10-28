import { ArrowRight, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, Icon } from "../../components/ui";
import {
  calculateBaseQuantity,
  calculateCartLineTotal,
  formatMoney,
  formatQuantity,
  parseQuantity,
} from "./billingMoney";
import type { CartLine } from "./billingTypes";

interface CartPanelProps {
  lines: CartLine[];
  onChangeQuantity: (lineId: string, quantity: string) => void;
  onRemove: (lineId: string) => void;
  onReview: () => void;
}

export function CartPanel({ lines, onChangeQuantity, onRemove, onReview }: CartPanelProps) {
  const lineTotals = lines.map((line) => calculateCartLineTotal(line));
  const subtotal = lineTotals.every((total) => total !== null)
    ? lineTotals.reduce<bigint>((sum, total) => sum + (total ?? 0n), 0n)
    : null;
  const invalidTotal = lineTotals.some((total) => total === null);

  return (
    <Card className="billing-card billing-cart-card" title="Current cart" description={`${lines.length} ${lines.length === 1 ? "line" : "lines"}`}>
      {lines.length === 0 ? (
        <EmptyState
          title="Cart is empty"
          description="Search for a product and choose a sellable unit to add it here."
        />
      ) : (
        <>
          <ul className="billing-cart-lines" aria-label="Current cart items">
            {lines.map((line) => {
              const lineTotal = calculateCartLineTotal(line);
              const baseQuantity = calculateBaseQuantity(line.quantity, line.baseQuantityPerUnit);
              const quantity = parseQuantity(line.quantity);

              return (
                <li className="billing-cart-line" key={line.id}>
                  <div className="billing-cart-line-heading">
                    <div className="billing-product-copy">
                      <strong>{line.productName}</strong>
                      <span>{line.sku} · {line.unitName} · {formatMoney(BigInt(line.unitPriceMinor))}</span>
                      {baseQuantity !== null && quantity !== null && (
                        <small>
                          {formatQuantity(quantity)} {line.unitName} = {formatQuantity(baseQuantity)} {line.baseUnitName}
                        </small>
                      )}
                    </div>
                    <strong className="billing-cart-line-total">
                      {lineTotal === null ? "Invalid total" : formatMoney(lineTotal)}
                    </strong>
                  </div>
                  <div className="billing-cart-line-controls">
                    <label htmlFor={`cart-quantity-${line.id}`}>Quantity</label>
                    <input
                      id={`cart-quantity-${line.id}`}
                      type="text"
                      inputMode="numeric"
                      value={line.quantity}
                      onChange={(event) => onChangeQuantity(line.id, event.target.value)}
                      aria-label={`Quantity for ${line.productName}, ${line.unitName}`}
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => onRemove(line.id)}>
                      <Icon icon={Trash2} size={15} />
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="billing-cart-subtotal">
            <span>Subtotal</span>
            <strong>{subtotal === null ? "Check quantities and prices" : formatMoney(subtotal)}</strong>
          </div>
          <div className="billing-cart-pending-lines">
            Discounts and tax are not applied; business rules are pending.
          </div>
          <Button
            type="button"
            fullWidth
            disabled={lines.length === 0 || invalidTotal || subtotal === null}
            onClick={onReview}
          >
            <Icon icon={ArrowRight} size={16} />
            Review checkout
          </Button>
        </>
      )}
    </Card>
  );
}