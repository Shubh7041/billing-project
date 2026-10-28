import { useTheme } from "../../design-system/ThemeProvider";
import { Menu, Moon, Sun, X } from "lucide-react";
import { Icon } from "../ui";

interface TopbarProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
}

export function Topbar({ onMenuClick, isMobileMenuOpen }: TopbarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <header className="app-topbar">
      <div className="topbar-leading">
        <button
          type="button"
          className="icon-button mobile-menu-button"
          onClick={onMenuClick}
          aria-label={`${isMobileMenuOpen ? "Close" : "Open"} navigation menu`}
          aria-controls="app-sidebar"
          aria-expanded={isMobileMenuOpen}
        >
          <Icon icon={isMobileMenuOpen ? X : Menu} size={20} />
        </button>

        <div className="topbar-heading">
          <span className="topbar-eyebrow">CRACKER MALL</span>
          <span className="topbar-title">Store workspace</span>
        </div>
      </div>

      <div className="topbar-actions">
        <span className="topbar-store-label">Main Store</span>

        <button
          type="button"
          className="icon-button theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${
            resolvedTheme === "dark" ? "light" : "dark"
          } theme`}
          title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
        >
          <Icon icon={resolvedTheme === "dark" ? Sun : Moon} size={19} />
        </button>
      </div>
    </header>
  );
}
