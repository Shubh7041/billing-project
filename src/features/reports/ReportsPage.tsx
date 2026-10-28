import { CalendarDays, CircleAlert, Download, Printer } from "lucide-react";
import { Button, Card, EmptyState, Icon } from "../../components/ui";
import { PageContainer } from "../../components/layout/PageContainer";
import "./reports.css";

const unavailableMetrics = [
  { id: "revenue", label: "Sales revenue", source: "Persisted completed sales unavailable" },
  { id: "transactions", label: "Completed transactions", source: "Sale status rules unavailable" },
  { id: "average", label: "Average sale value", source: "Requires persisted completed sales" },
  { id: "payments", label: "Cash / UPI breakdown", source: "Persisted payment records unavailable" },
];

export function ReportsPage() {
  return (
    <PageContainer
      title="Reports"
      description="Review sales performance and inventory activity when authorized data is available."
      actions={
        <div className="reports-actions">
          <Button
            type="button"
            variant="outline"
            disabled
            title="There is no authorized report dataset to export."
          >
            <Icon icon={Download} size={16} />
            Export CSV unavailable
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled
            title="There are no persisted report records to print."
          >
            <Icon icon={Printer} size={16} />
            Print unavailable
          </Button>
        </div>
      }
    >
      <div className="reports-page">
        <div className="reports-integration-notice" role="status">
          <Icon icon={CircleAlert} size={17} />
          Reports are unavailable: the current billing flow creates only local receipt previews, and no authorized sales or inventory reporting reads are configured.
        </div>

        <section className="reports-controls" aria-labelledby="reports-period-heading">
          <div className="reports-controls-heading">
            <h2 id="reports-period-heading">Reporting period</h2>
            <p id="reports-controls-help">
              Date and grouping controls will be enabled when persisted report data is available.
            </p>
          </div>
          <div className="reports-filter-grid" aria-describedby="reports-controls-help">
            <label>
              <span><Icon icon={CalendarDays} size={15} /> From</span>
              <input type="date" disabled aria-label="Report start date unavailable" />
            </label>
            <label>
              <span><Icon icon={CalendarDays} size={15} /> To</span>
              <input type="date" disabled aria-label="Report end date unavailable" />
            </label>
            <label>
              <span>Group by</span>
              <select disabled defaultValue="daily" aria-label="Report grouping unavailable">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
        </section>

        <section className="reports-metric-grid" aria-label="Sales report summary">
          {unavailableMetrics.map((metric) => (
            <Card className="report-metric-card" key={metric.id}>
              <p>{metric.label}</p>
              <strong>Unavailable</strong>
              <span>{metric.source}</span>
            </Card>
          ))}
        </section>

        <div className="reports-content-grid">
          <Card
            className="report-panel"
            title="Sales trend"
            description="Daily, weekly, or monthly revenue trend"
          >
            <EmptyState
              title="No persisted sales to chart"
              description="Drafts, demo receipts, and unverified checkout attempts are not included as completed sales."
            />
          </Card>

          <Card
            className="report-panel"
            title="Product performance"
            description="Best-selling products by quantity or revenue"
          >
            <EmptyState
              title="Product sales are unavailable"
              description="No persisted sale-item records or authorized sales-report query exists."
            />
          </Card>

          <Card
            className="report-panel"
            title="Inventory summary"
            description="Stock balances and low-stock products"
          >
            <EmptyState
              title="Inventory reporting is unavailable"
              description="Client reads for inventory balances are not authorized, and the schema has no configured low-stock threshold."
            />
          </Card>
        </div>

        <p className="reports-integrity-note">
          No demo values are presented as shop performance. Revenue, payment mix, product rankings, and stock totals will require authorized read operations. Reversed or draft sales must be excluded according to a reviewed sale-status model.
        </p>
      </div>
    </PageContainer>
  );
}