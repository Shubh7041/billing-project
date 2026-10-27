import { createContext, useContext } from "react";
import type { Category, CategoryInput, Product, ProductInput } from "./catalogTypes";

export interface CatalogDemoContextValue {
  categories: Category[];
  products: Product[];
  saveCategory: (input: CategoryInput, categoryId?: string) => void;
  saveProduct: (input: ProductInput, productId?: string) => void;
}

export const CatalogDemoContext =
  createContext<CatalogDemoContextValue | null>(null);

export function useCatalogDemo(): CatalogDemoContextValue {
  const context = useContext(CatalogDemoContext);
  if (!context) {
    throw new Error("useCatalogDemo must be used within CatalogDemoProvider");
  }
  return context;
}