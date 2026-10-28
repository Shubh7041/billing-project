import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { Button, Card, DataTable, EmptyState, StatusBadge } from "../../components/ui";
import { Icon } from "../../components/ui";
import type { DataTableColumn } from "../../components/ui";
import type { Supplier } from "../suppliers/supplierTypes";
import { calculateLineMinorUnits, calculateReceivedBaseQuantity, formatBaseQuantity, formatInrMinorUnits, parseInrToMinorUnits } from "./purchaseDemoData";
import type { Purchase, PurchaseLine } from "./purchaseTypes";

interface PurchaseDetailsProps {
  purchase: Purchase;
  supplier?: Supplier;
  onEdit: () => void;
}

function formatPurchaseDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(parsed);
}

export function PurchaseDetails({ purchase, supplier, onEdit }: PurchaseDetailsProps) {
  const [showPostReview, setShowPostReview] = useState(false);
  const columns: DataTableColumn<PurchaseLine>[] = [
    {
      key: "product",
      header: "Product",
      render: (line) => <div className="purchase-table-product"><strong>{line.productNameSnapshot}</strong><span>{line.skuSnapshot}</span></div>,
    },
    {
      key: "unit",
      header: "Unit",
      render: (line) => <span>{line.unitNameSnapshot} · 1 = {line.baseQuantityPerUnitSnapshot} base units</span>,
    },
    { key: "quantity", header: "Quantity", align: "right", render: (line) => line.quantity },
    { key: "received", header: "Received base units", align: "right", render: (line) => {
      const received = calculateReceivedBaseQuantity(line);
      return received === null ? "Invalid conversion" : formatBaseQuantity(received);
    } },
    { key: "cost", header: "Unit cost", align: "right", render: (line) => {
      const amount = calculateLineMinorUnits("1", line.unitCost);
      return amount === null ? "—" : formatInrMinorUnits(amount);
    } },
    { key: "subtotal", header: "Line total", align: "right", render: (line) => {
      const amount = calculateLineMinorUnits(line.quantity, line.unitCost);
      return amount === null ? "—" : formatInrMinorUnits(amount);
    } },
  ];
  const subtotal = purchase.lines.reduce((sum, line) => {
    const lineTotal = calculateLineMinorUnits(line.quantity, line.unitCost);
    return sum + (lineTotal ?? 0n);
  }, 0n);
  const displayedTotal =
    purchase.status === "posted" && purchase.total
      ? parseInrToMinorUnits(purchase.total) ?? subtotal
      : subtotal;

  return (
    <div className="purchase-detail-stack">
      <Card
        className="purchase-detail-card"
        title={purchase.purchaseNumber}
        description={supplier?.name ?? "Supplier unavailable in this demo"}
        headerAction={
          <div className="purchase-detail-actions">
            <StatusBadge variant={purchase.status === "posted" ? "success" : "warning"}>
              {purchase.status === "posted" ? "Posted" : "Draft"}
            </StatusBadge>
            {purchase.status === "draft" && (
              <>
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Icon icon={Pencil} size={15} /> Edit draft
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowPostReview((current) => !current)}>
                  <Icon icon={showPostReview ? ChevronDown : ChevronRight} size={15} />
                  {showPostReview ? "Hide review" : "Review receipt"}
                </Button>
              </>
            )}
          </div>
        }
      >
        <dl className="purchase-detail-meta">
          <div><dt>Purchase date</dt><dd>{formatPurchaseDate(purchase.purchaseDate)}</dd></div>
          <div><dt>Supplier invoice reference</dt><dd>{purchase.supplierInvoiceRef || "—"}</dd></div>
          <div><dt>Created</dt><dd>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(purchase.createdAt))}</dd></div>
          <div><dt>Posted</dt><dd>{purchase.postedAt ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(purchase.postedAt)) : "Not posted"}</dd></div>
        </dl>
        {purchase.notes && <p className="purchase-detail-notes">{purchase.notes}</p>}

        {purchase.lines.length === 0 ? (
          <EmptyState title="No purchase lines" description="Add product lines before reviewing this receipt." />
        ) : (
          <DataTable
            columns={columns}
            rows={purchase.lines}
            getRowKey={(line) => line.id}
            isLoading={false}
            emptyTitle="No lines"
            emptyDescription="This purchase has no lines."
            rowLabel={(line) => `${line.productNameSnapshot}, ${line.quantity} ${line.unitNameSnapshot}`}
          />
        )}

        <div className="purchase-total-row purchase-detail-total">
          <span>{purchase.status === "posted" ? "Posted total" : "Current draft total"}</span>
          <strong>{formatInrMinorUnits(displayedTotal)}</strong>
        </div>
      </Card>

      {showPostReview && purchase.status === "draft" && (
        <section className="purchase-post-review" aria-labelledby="purchase-post-review-title">
          <div>
            <h2 id="purchase-post-review-title">Review receipt</h2>
            <p>
              Posting records this full receipt and increases inventory using the saved base-unit conversions.
              This demo cannot submit or change real inventory.
            </p>
          </div>
          <div className="purchase-review-total">
            <span>Receipt total</span>
            <strong>{formatInrMinorUnits(displayedTotal)}</strong>
          </div>
          <Button type="button" disabled title="Purchasing RPC verification is pending">
            <Icon icon={AlertTriangle} size={16} />
            Posting disabled until backend verification
          </Button>
        </section>
      )}
    </div>
  );
}