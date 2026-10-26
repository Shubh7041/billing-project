import { RouterProvider } from "react-router-dom";
import { AppProviders } from "@/app/providers";
import { router } from "@/app/router";
import { ThemeProvider } from "@/design-system/ThemeProvider";

export function AppRoot() {
  return (
    <ThemeProvider defaultTheme="light">
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ThemeProvider>
  );
}
