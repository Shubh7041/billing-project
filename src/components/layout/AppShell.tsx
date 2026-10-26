import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import "./layout.css";

export function AppShell() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="app-shell">
      {isMobileMenuOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div
        id="app-sidebar"
        className={`app-sidebar-container${
          isMobileMenuOpen ? " app-sidebar-container-open" : ""
        }`}
      >
        <Sidebar onNavigate={() => setIsMobileMenuOpen(false)} />
      </div>

      <div className="app-main">
        <Topbar
          onMenuClick={() => setIsMobileMenuOpen(true)}
          isMobileMenuOpen={isMobileMenuOpen}
        />

        <div className="app-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
