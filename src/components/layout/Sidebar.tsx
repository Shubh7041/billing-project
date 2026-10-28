
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Boxes,
  ChartNoAxesCombined,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  Tags,
  Truck,
} from "lucide-react";
import { Icon } from "../ui";

interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface NavigationGroup {
  title: string;
  items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Fast Billing", path: "/billing", icon: ShoppingCart },
      { label: "Sales", path: "/sales", icon: ReceiptText },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      { label: "Inventory", path: "/inventory", icon: Boxes },
      { label: "Products", path: "/products", icon: Package },
      { label: "Categories", path: "/categories", icon: Tags },
      { label: "Purchases", path: "/purchases", icon: Truck },
      { label: "Suppliers", path: "/suppliers", icon: Building2 },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [{ label: "Reports", path: "/reports", icon: ChartNoAxesCombined }],
  },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" aria-hidden="true">
          CM
        </div>
        <div className="sidebar-brand-copy">
          <strong>Cracker Mall</strong>
          <span>Store management</span>
        </div>
      </div>

      <nav className="sidebar-navigation" aria-label="Main navigation">
        {navigationGroups.map((group) => (
          <section className="sidebar-group" key={group.title}>
            <p className="sidebar-group-title">{group.title}</p>

            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? " sidebar-link-active" : ""}`
                }
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  <Icon icon={item.icon} size={18} />
                </span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-status-dot" aria-hidden="true" />
        <span>Store workspace</span>
      </div>
    </aside>
  );
}
