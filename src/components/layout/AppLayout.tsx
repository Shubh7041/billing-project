import { NavLink, Outlet } from 'react-router-dom'
import './AppLayout.css'

const navigation = [
  { label: 'Dashboard', to: '/' },
  { label: 'Billing / POS', to: '/billing' },
  { label: 'Inventory', to: '/inventory' },
  { label: 'Products', to: '/products' },
]

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <NavLink className="brand" to="/" end>
          <span className="brand-mark" aria-hidden="true">CM</span>
          <span>Cracker Mall</span>
        </NavLink>
        <span className="header-caption">Retail operations</span>
      </header>
      <div className="app-body">
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(({ label, to }) => (
            <NavLink
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
              end={to === '/'}
              key={to}
              to={to}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}