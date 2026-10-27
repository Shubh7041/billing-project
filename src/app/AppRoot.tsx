import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import { ThemeProvider } from "@/design-system/ThemeProvider";
import { CatalogDemoProvider } from "@/features/catalog/CatalogDemoProvider";

export function AppRoot() {
  return (
    <ThemeProvider defaultTheme="light">
      <AppProviders>
        <CatalogDemoProvider>
          <RouterProvider router={router} />
        </CatalogDemoProvider>
      </AppProviders>
    </ThemeProvider>
  );
}
