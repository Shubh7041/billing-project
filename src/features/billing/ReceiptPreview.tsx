import { ArrowLeft, Printer } from "lucide-react";
import { Button, Card, Icon } from "../../components/ui";
import { formatMoney } from "./billingMoney";
import type { DemoReceiptPreview } from "./billingTypes";

interface ReceiptPreviewProps {
  receipt: DemoReceiptPreview;
  onClose: () => void;
}

export function ReceiptPreview({ receipt, onClose }: ReceiptPreviewProps) {
  return (
    <Card className="billing-card billing-receipt-card" title="Receipt preview" description="Demo only · No sale or invoice was created">
      <div className="billing-receipt" aria-label="Demo receipt preview">
        <div className="billing-receipt-heading">
          <strong>Cracker Mall</strong>
          <span>DEMO RECEIPT · NOT AN INVOICE</span>
          <time dateTime={receipt.createdAt}>
            {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(receipt.createdAt))}
          </time>
        </div>
        <p className="billing-receipt-invoice">Invoice number: Not generated</p>
        <ul className="billing-receipt-lines">
          {receipt.lines.map((line) => {
            const lineTotal = BigInt(line.unitPriceMinor) * BigInt(line.quantity);
            return (
              <li key={line.id}>
                <span>{line.productName}</span>
                <small>{line.quantity} {line.unitName} × {formatMoney(BigInt(line.unitPriceMinor))}</small>
                <strong>{formatMoney(lineTotal)}</strong>
              </li>
            );
          })}
        </ul>
        <div className="billing-receipt-total">
          <span>Total preview</span>
          <strong>{formatMoney(receipt.subtotalMinor)}</strong>
        </div>
        <dl className="billing-receipt-payment">
          <div><dt>Payment option</dt><dd>{receipt.paymentMethod === "cash" ? "Cash" : "UPI"}</dd></div>
          <div><dt>Payment status</dt><dd>Not processed</dd></div>
          {receipt.paymentMethod === "cash" && receipt.paymentAmountMinor !== null && (
            <>
              <div><dt>Cash received (preview)</dt><dd>{formatMoney(receipt.paymentAmountMinor)}</dd></div>
              <div><dt>Change (preview)</dt><dd>{formatMoney(receipt.changeMinor)}</dd></div>
            </>
          )}
        </dl>
      </div>
      <div className="billing-receipt-actions">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          <Icon icon={Printer} size={16} />
          Print preview
        </Button>
        <Button type="button" onClick={onClose}>
          <Icon icon={ArrowLeft} size={16} /> Return to billing
        </Button>
      </div>
    </Card>
  );
}