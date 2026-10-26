import { Link } from "react-router-dom";
import { ROUTES } from "../../app/routePaths";
import { Card, EmptyState } from "../../components/ui";
import { formatCount, lowStockProductsMock } from "./dashboardMockData";

export function LowStockCard() {
  return (
    <Card
      className="dashboard-card dashboard-section-card"
      title="Low stock alerts"
      description="Products to review before the next rush"
      headerAction={
        <Link className="dashboard-text-link" to={ROUTES.inventory}>
          Inventory
        </Link>
      }
    >
      {lowStockProductsMock.length === 0 ? (
        <EmptyState
          title="Stock levels look good"
          description="There are no low-stock products in this preview."
        />
      ) : (
        <ul className="dashboard-stock-list" aria-label="Products with low stock">
          {lowStockProductsMock.map((product) => (
            <li className="dashboard-stock-item" key={product.id}>
              <span className="dashboard-stock-indicator" aria-hidden="true">
                !
              </span>
              <span className="dashboard-stock-copy">
                <span className="dashboard-stock-name">{product.name}</span>
                <span className="dashboard-stock-quantity">
                  {formatCount(product.quantity)} {product.unit} available
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}