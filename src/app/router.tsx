import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { BillingPage } from '@/features/billing/BillingPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { ProductsPage } from '@/features/products/ProductsPage'
import { NotFoundPage } from './NotFoundPage'
import { RouteErrorPage } from './RouteErrorPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'billing', element: <BillingPage /> },
      { path: 'inventory', element: <InventoryPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])