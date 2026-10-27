import { Link } from "react-router-dom";
import { ROUTES } from "../../app/routePaths";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button, Card, EmptyState } from "../../components/ui";
import "./sales.css";

export function SalesPage() {
  return (
    <PageContainer
      title="Sales history"
      description="Review completed sales and reprint their original receipts."
    >
      <div className="sales-page">
        <div className="sales-integration-notice" role="status">
          Sales history is unavailable. The current billing screen only creates
          a local demo receipt preview; it does not persist a sale.
        </div>

        <Card
          className="sales-disabled-card"
          title="No persisted sales to display"
          description="No sales, sale-item, payment, or invoice schema or authorized sales-read operation exists in the migrations inspected."
        >
          <EmptyState
            title="Sales records are not connected"
            description="Invoice search, date and payment filters, sale details, and reprinting will appear after a verified read-only sales integration is available."
            action={
              <Button type="button" disabled>
                Invoice reprint unavailable
              </Button>
            }
          />
        </Card>

        <Card className="sales-next-step-card" title="Fast Billing">
          <p>
            A sale will appear here only after an authorized checkout operation
            confirms it was persisted. The current billing flow is demo-only.
          </p>
          <Link className="sales-billing-link" to={ROUTES.billing}>
            Return to demo billing
          </Link>
        </Card>
      </div>
    </PageContainer>
  );
}