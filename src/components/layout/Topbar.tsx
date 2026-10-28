import { useState } from "react";
import { LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { Button, Icon } from "../ui";
import { useTheme } from "../../design-system/ThemeProvider";
import { useAuth } from "../../features/auth/authContext";
import { useStoreContext } from "../../features/store-context/storeContext";

interface TopbarProps {
  onMenuClick: () => void;
  isMobileMenuOpen: boolean;
}

export function Topbar({ onMenuClick, isMobileMenuOpen }: TopbarProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { session, signOut } = useAuth();
  const storeContext = useStoreContext();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setLogoutError(null);
    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Unable to sign out.");
    } finally {
      setIsSigningOut(false);
    }
  }

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
        <span className="topbar-store-label">
          {storeContext.status === "ready" ? storeContext.membership.store.name : "Store workspace"}
        </span>
        {session?.user.email && <span className="topbar-user-label">{session.user.email}</span>}

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
        {session && (
          <Button type="button" size="sm" variant="ghost" onClick={handleSignOut} loading={isSigningOut}>
            <Icon icon={LogOut} size={16} /> Sign out
          </Button>
        )}
        {logoutError && <span className="topbar-auth-error" role="alert">{logoutError}</span>}
      </div>
    </header>
  );
}
