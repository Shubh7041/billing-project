import { Card } from "../../components/ui";
import {
  dashboardSummaryMock,
  formatCount,
  formatInr,
} from "./dashboardMockData";

const summaryItems = [
  {
    id: "sales",
    label: "Today's sales",
    value: formatInr(dashboardSummaryMock.todaySales),
    detail: "Across all billing counters",
    symbol: "₹",
    accent: "sales",
  },
  {
    id: "bills",
    label: "Today's bills",
    value: formatCount(dashboardSummaryMock.todayBills),
    detail: "Bills created today",
    symbol: "B",
    accent: "bills",
  },
  {
    id: "low-stock",
    label: "Low stock items",
    value: formatCount(dashboardSummaryMock.lowStockItems),
    detail: "Products need attention",
    symbol: "!",
    accent: "stock",
  },
  {
    id: "products",
    label: "Total products",
    value: formatCount(dashboardSummaryMock.totalProducts),
    detail: "In the product catalogue",
    symbol: "P",
    accent: "products",
  },
];

export function DashboardSummary() {
  return (
    <section className="dashboard-summary-grid" aria-label="Today's summary">
      {summaryItems.map((item) => (
        <Card
          key={item.id}
          className="dashboard-card dashboard-summary-card"
        >
          <span
            className={`dashboard-summary-icon dashboard-summary-icon-${item.accent}`}
            aria-hidden="true"
          >
            {item.symbol}
          </span>
          <div className="dashboard-summary-copy">
            <p className="dashboard-summary-label">{item.label}</p>
            <p className="dashboard-summary-value">{item.value}</p>
            <p className="dashboard-summary-detail">{item.detail}</p>
          </div>
        </Card>
      ))}
    </section>
  );
}