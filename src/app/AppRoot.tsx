import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import { ThemeProvider } from "@/design-system/ThemeProvider";
import { CatalogDemoProvider } from "@/features/catalog/CatalogDemoProvider";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { StoreContextProvider } from "@/features/store-context/StoreContextProvider";

export function AppRoot() {
  return (
    <ThemeProvider defaultTheme="light">
      <AppProviders>
        <AuthProvider>
          <StoreContextProvider>
            <CatalogDemoProvider>
              <RouterProvider router={router} />
            </CatalogDemoProvider>
          </StoreContextProvider>
        </AuthProvider>
      </AppProviders>
    </ThemeProvider>
  );
}
