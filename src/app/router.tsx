
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ROUTES } from "@/app/routePaths";
import { BillingPage } from "@/features/billing/BillingPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { NotFoundPage } from "@/features/not-found/NotFoundPage";

// Keep your existing imports for these pages.
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { ProductsPage } from "@/features/products/ProductsPage";
import { PurchasesPage } from "@/features/purchases/PurchasesPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { SalesPage } from "@/features/sales/SalesPage";
import { SuppliersPage } from "@/features/suppliers/SuppliersPage";

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.dashboard} replace />,
      },
      {
        path: ROUTES.dashboard,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.billing,
        element: <BillingPage />,
      },
      {
        path: ROUTES.inventory,
        element: <InventoryPage />,
      },
      {
        path: ROUTES.products,
        element: <ProductsPage />,
      },
      {
        path: ROUTES.categories,
        element: <CategoriesPage />,
      },
      {
        path: ROUTES.suppliers,
        element: <SuppliersPage />,
      },
      {
        path: ROUTES.purchases,
        element: <PurchasesPage />,
      },
      {
        path: ROUTES.sales,
        element: <SalesPage />,
      },
      {
        path: ROUTES.reports,
        element: <ReportsPage />,
      },

      // Preserve your existing billing, purchases, suppliers,
      // categories, customers, sales and reports routes here.

      {
        path: ROUTES.notFound,
        element: <NotFoundPage />,
      },
    ],
  },
]);
