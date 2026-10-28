import { Link } from "react-router-dom";
import { ROUTES } from "../../app/routePaths";
import { Card } from "../../components/ui";
import { Icon } from "../../components/ui";
import { ChevronRight, PackagePlus, ShoppingCart, Truck } from "lucide-react";

const quickActions = [
  {
    id: "billing",
    title: "Fast billing",
    description: "Start a counter sale",
    to: ROUTES.billing,
    icon: ShoppingCart,
  },
  {
    id: "product",
    title: "Add product",
    description: "Open the product catalogue",
    to: ROUTES.products,
    icon: PackagePlus,
  },
  {
    id: "purchase",
    title: "New purchase",
    description: "Review inventory before receiving",
    to: ROUTES.inventory,
    icon: Truck,
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
              <Icon icon={action.icon} size={18} />
            </span>
            <span className="dashboard-quick-copy">
              <span className="dashboard-quick-title">{action.title}</span>
              <span className="dashboard-quick-description">
                {action.description}
              </span>
            </span>
            <Icon className="dashboard-quick-arrow" icon={ChevronRight} size={18} />
          </Link>
        ))}
      </div>
    </Card>
  );
}