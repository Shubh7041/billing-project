import { Link } from "react-router-dom";
import { ROUTES } from "../../app/routePaths";
import { Card } from "../../components/ui";

const quickActions = [
  {
    id: "billing",
    title: "Fast billing",
    description: "Start a counter sale",
    to: ROUTES.billing,
    symbol: "B",
  },
  {
    id: "product",
    title: "Add product",
    description: "Open the product catalogue",
    to: ROUTES.products,
    symbol: "P",
  },
  {
    id: "purchase",
    title: "New purchase",
    description: "Review inventory before receiving",
    to: ROUTES.inventory,
    symbol: "+",
  },
];

export function QuickActionsCard() {
  return (
    <Card
      className="dashboard-card dashboard-section-card"
      title="Quick actions"
      description="Shortcuts to common tasks"
    >
      <div className="dashboard-quick-actions">
        {quickActions.map((action) => (
          <Link
            className="dashboard-quick-action"
            key={action.id}
            to={action.to}
          >
            <span className="dashboard-quick-icon" aria-hidden="true">
              {action.symbol}
            </span>
            <span className="dashboard-quick-copy">
              <span className="dashboard-quick-title">{action.title}</span>
              <span className="dashboard-quick-description">
                {action.description}
              </span>
            </span>
            <span className="dashboard-quick-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>
    </Card>
  );
}