
import { NavLink } from "react-router-dom";

const navigationGroups = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: "DB" },
      { label: "Fast Billing", path: "/billing", icon: "FB" },
    //   { label: "Sales", path: "/sales", icon: "SL" },
    ],
  },
  {
    title: "INVENTORY",
    items: [
      { label: "Inventory", path: "/inventory", icon: "IN" },
      { label: "Products", path: "/products", icon: "PR" },
      { label: "Categories", path: "/categories", icon: "CA" },
      { label: "Purchases", path: "/purchases", icon: "PU" },
      { label: "Suppliers", path: "/suppliers", icon: "SU" },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { label: "Customers", path: "/customers", icon: "CU" },
      { label: "Reports", path: "/reports", icon: "RE" },
    ],
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
                  {item.icon}
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
