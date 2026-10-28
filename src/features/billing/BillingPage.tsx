import { useState } from "react";
import { Info } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Icon } from "../../components/ui";
import { useCatalogDemo } from "../catalog/catalogDemoContext";
import type { Product, ProductUnit } from "../catalog/catalogTypes";
import { BillingProductSearch } from "./BillingProductSearch";
import { CartPanel } from "./CartPanel";
import { CheckoutReview } from "./CheckoutReview";
import { ReceiptPreview } from "./ReceiptPreview";
import {
  MAX_QUANTITY,
  calculateCartSubtotal,
  parseMoneyToMinorUnits,
  parseQuantity,
} from "./billingMoney";
import type { CartLine, DemoReceiptPreview } from "./billingTypes";
import "./billing.css";

export function BillingPage() {
  const { products } = useCatalogDemo();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [isReviewingCheckout, setIsReviewingCheckout] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<DemoReceiptPreview | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);

  function addProduct(product: Product, unit: ProductUnit) {
    const unitPriceMinor = parseMoneyToMinorUnits(unit.sellingPrice);
    if (unitPriceMinor === null) {
      setCartError(`${product.name} · ${unit.unitName} has no valid configured price.`);
      return;
    }

    const lineId = `${product.id}:${unit.id}`;
    const existing = cart.find((line) => line.id === lineId);
    if (existing) {
      const quantity = parseQuantity(existing.quantity);
      if (quantity === null || quantity >= MAX_QUANTITY) {
        setCartError("Quantity reached the supported limit.");
        return;
      }
      setCart(cart.map((line) =>
        line.id === lineId ? { ...line, quantity: (quantity + 1n).toString() } : line,
      ));
      setCartError(null);
      return;
    }

    setCart([
      ...cart,
      {
        id: lineId,
        productId: product.id,
        productUnitId: unit.id,
        productName: product.name,
        sku: product.sku,
        unitName: unit.unitName,
        unitCode: unit.unitCode,
        baseUnitName:
          product.units.find((baseUnit) => baseUnit.isBaseUnit)?.unitName ??
          product.baseUnitCode,
        baseQuantityPerUnit: unit.baseQuantity,
        unitPrice: unit.sellingPrice,
        unitPriceMinor: unitPriceMinor.toString(),
        quantity: "1",
      },
    ]);
    setCartError(null);
  }

  function changeQuantity(lineId: string, quantity: string) {
    setCart((current) => current.map((line) =>
      line.id === lineId ? { ...line, quantity } : line,
    ));
    setCartError(null);
  }

  function removeLine(lineId: string) {
    setCart((current) => current.filter((line) => line.id !== lineId));
    setCartError(null);
  }

  const subtotal = calculateCartSubtotal(cart);

  return (
    <PageContainer
      title="Fast Billing"
      description="Build a counter cart and review payment details."
    >
      <div className="billing-page">
        <div className="billing-demo-notice" role="note">
          <Icon icon={Info} size={16} />
          Demo mode · Cart, payment, and receipt are not saved. Live stock, checkout, payments, and invoice numbering are not connected.
        </div>

        {cartError && <p className="billing-error" role="alert">{cartError}</p>}

        {receiptPreview ? (
          <ReceiptPreview
            receipt={receiptPreview}
            onClose={() => setReceiptPreview(null)}
          />
        ) : isReviewingCheckout && subtotal !== null ? (
          <CheckoutReview
            lines={cart}
            subtotalMinor={subtotal}
            onBack={() => setIsReviewingCheckout(false)}
            onPreview={(preview) => {
              setReceiptPreview(preview);
              setIsReviewingCheckout(false);
            }}
          />
        ) : (
          <div className="billing-workspace">
            <BillingProductSearch products={products} onAdd={addProduct} />
            <CartPanel
              lines={cart}
              onChangeQuantity={changeQuantity}
              onRemove={removeLine}
              onReview={() => {
                setCartError(null);
                setIsReviewingCheckout(true);
              }}
            />
          </div>
        )}
      </div>
    </PageContainer>
  );
}
