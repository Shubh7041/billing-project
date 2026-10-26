
import { PageContainer } from "../../components/layout/PageContainer";
import { DashboardSummary } from "./DashboardSummary";
import { LowStockCard } from "./LowStockCard";
import { QuickActionsCard } from "./QuickActionsCard";
import { RecentBillsCard } from "./RecentBillsCard";
import { SalesOverviewCard } from "./SalesOverviewCard";
import "./dashboard.css";

export function DashboardPage() {
  return (
    <PageContainer
      title="Dashboard"
      description="A quick view of today's store activity."
    >
      <div className="dashboard-page">
        <p className="dashboard-preview-note">
          Preview data only <span aria-hidden="true">·</span> Not connected to live store records
        </p>

        <DashboardSummary />

        <div className="dashboard-content-grid">
          <div className="dashboard-main-column">
            <SalesOverviewCard />
            <RecentBillsCard />
          </div>

          <aside
            className="dashboard-side-column"
            aria-label="Stock alerts and quick actions"
          >
            <LowStockCard />
            <QuickActionsCard />
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}
