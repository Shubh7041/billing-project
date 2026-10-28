import { useRef, useState } from "react";
import { ArrowLeft, Banknote, ReceiptText, Smartphone } from "lucide-react";
import { Button, Card, Icon } from "../../components/ui";
import { calculateCartLineTotal, formatMoney, parseMoneyToMinorUnits } from "./billingMoney";
import type { CartLine, DemoReceiptPreview, PaymentMethod } from "./billingTypes";

interface CheckoutReviewProps {
  lines: CartLine[];
  subtotalMinor: bigint;
  onBack: () => void;
  onPreview: (receipt: DemoReceiptPreview) => void;
}

export function CheckoutReview({ lines, subtotalMinor, onBack, onPreview }: CheckoutReviewProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submitGuard = useRef(false);

  const cashReceivedMinor = parseMoneyToMinorUnits(cashReceived);
  const changeMinor = cashReceivedMinor !== null && cashReceivedMinor >= subtotalMinor
    ? cashReceivedMinor - subtotalMinor
    : null;

  function handlePreview() {
    if (submitGuard.current) return;
    submitGuard.current = true;
    setError(null);

    if (paymentMethod === "cash" && (cashReceivedMinor === null || cashReceivedMinor < subtotalMinor)) {
      setError("Enter cash received that is at least the subtotal.");
      submitGuard.current = false;
      return;
    }

    if (lines.some((line) => calculateCartLineTotal(line) === null)) {
      setError("Review the cart quantities and prices before continuing.");
      submitGuard.current = false;
      return;
    }

    onPreview({
      lines: lines.map((line) => ({ ...line })),
      subtotalMinor,
      paymentMethod,
      paymentAmountMinor: paymentMethod === "cash" ? cashReceivedMinor : null,
      changeMinor: paymentMethod === "cash" ? changeMinor ?? 0n : 0n,
      paymentStatus: "not-processed",
      createdAt: new Date().toISOString(),
    });
    submitGuard.current = false;
  }

  return (
    <Card className="billing-card billing-checkout-card" title="Review checkout" description="No tax or discounts are applied in this demo.">
      <ul className="billing-review-lines">
        {lines.map((line) => {
          const amount = calculateCartLineTotal(line);
          return (
            <li key={line.id}>
              <span>{line.productName} · {line.quantity} {line.unitName}</span>
              <strong>{amount === null ? "—" : formatMoney(amount)}</strong>
            </li>
          );
        })}
      </ul>

      <div className="billing-review-total">
        <span>Subtotal / final total</span>
        <strong>{formatMoney(subtotalMinor)}</strong>
      </div>

      <fieldset className="billing-payment-method">
        <legend>Payment method</legend>
        <label>
          <input
            type="radio"
            name="billing-payment-method"
            checked={paymentMethod === "cash"}
            onChange={() => setPaymentMethod("cash")}
          />
          <Icon icon={Banknote} size={17} />
          <span>Cash</span>
        </label>
        <label>
          <input
            type="radio"
            name="billing-payment-method"
            checked={paymentMethod === "upi"}
            onChange={() => setPaymentMethod("upi")}
          />
          <Icon icon={Smartphone} size={17} />
          <span>UPI</span>
        </label>
      </fieldset>

      {paymentMethod === "cash" ? (
        <div className="billing-payment-amount">
          <label htmlFor="billing-cash-received">Cash received (₹)</label>
          <input
            id="billing-cash-received"
            type="text"
            inputMode="decimal"
            value={cashReceived}
            onChange={(event) => setCashReceived(event.target.value)}
            placeholder="0.00"
          />
          <div className="billing-change-row">
            <span>Change</span>
            <strong>{changeMinor === null ? "Enter amount received" : formatMoney(changeMinor)}</strong>
          </div>
        </div>
      ) : (
        <p className="billing-payment-note">
          UPI is selected for this preview only. No payment request will be sent.
        </p>
      )}

      <p className="billing-tax-note">
        Tax and discount rules have not been configured. This preview uses subtotal as the displayed total only.
      </p>
      {error && <p className="billing-error" role="alert">{error}</p>}

      <div className="billing-checkout-actions">
        <Button type="button" variant="outline" onClick={onBack}>
          <Icon icon={ArrowLeft} size={16} /> Back to cart
        </Button>
        <Button type="button" onClick={handlePreview}>
          <Icon icon={ReceiptText} size={16} />
          Preview demo receipt
        </Button>
      </div>
      <p className="billing-demo-warning" role="note">
        Checkout is disabled for real sales. This action only opens a non-persistent receipt preview.
      </p>
    </Card>
  );
}