import { Card, DataTable, StatusBadge } from "../../components/ui";
import type { DataTableColumn } from "../../components/ui";
import {
  formatInr,
  recentBillsMock,
  type RecentBill,
} from "./dashboardMockData";

const columns: DataTableColumn<RecentBill>[] = [
  {
    key: "invoice",
    header: "Invoice",
    render: (bill) => (
      <span className="dashboard-invoice-number">{bill.invoiceNumber}</span>
    ),
  },
  { key: "time", header: "Time", render: (bill) => bill.time },
  { key: "summary", header: "Items / customer", render: (bill) => bill.summary },
  {
    key: "total",
    header: "Total",
    align: "right",
    render: (bill) => (
      <span className="dashboard-money">{formatInr(bill.total)}</span>
    ),
  },
  { key: "payment", header: "Payment", render: (bill) => bill.paymentMethod },
  {
    key: "status",
    header: "Status",
    render: (bill) => {
      const statusClass =
        bill.status === "Paid"
          ? "dashboard-status-paid"
          : bill.status === "Pending"
            ? "dashboard-status-pending"
            : "dashboard-status-part-paid";
      const variant =
        bill.status === "Paid"
          ? "success"
          : bill.status === "Pending"
            ? "warning"
            : "info";

      return (
        <StatusBadge className={`dashboard-bill-status ${statusClass}`} variant={variant}>
          {bill.status}
        </StatusBadge>
      );
    },
  },
];

export function RecentBillsCard() {
  return (
    <Card
      className="dashboard-card dashboard-section-card dashboard-bills-card"
      title="Recent bills"
      description="Latest counter activity · Preview data"
      padding="none"
    >
      <DataTable
        columns={columns}
        rows={recentBillsMock}
        getRowKey={(bill) => bill.invoiceNumber}
        isLoading={false}
        loadingMessage="Loading recent bills"
        emptyTitle="No bills yet"
        emptyDescription="Completed bills will appear here."
        rowLabel={(bill) =>
          `${bill.invoiceNumber}, ${bill.time}, ${formatInr(bill.total)}, ${bill.status}`
        }
      />
    </Card>
  );
}