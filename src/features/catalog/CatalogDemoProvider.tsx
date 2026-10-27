import { useState, type ReactNode } from "react";
import { demoCategories, demoProducts } from "./catalogDemoData";
import { CatalogDemoContext } from "./catalogDemoContext";
import type { CategoryInput, ProductInput } from "./catalogTypes";

interface CatalogDemoProviderProps {
  children: ReactNode;
}

export function CatalogDemoProvider({ children }: CatalogDemoProviderProps) {
  const [categories, setCategories] = useState(demoCategories);
  const [products, setProducts] = useState(demoProducts);

  function saveCategory(input: CategoryInput, categoryId?: string) {
    if (categoryId) {
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryId ? { ...category, ...input } : category,
        ),
      );
      return;
    }

    setCategories((current) => [
      ...current,
      { id: crypto.randomUUID(), ...input },
    ]);
  }

  function saveProduct(input: ProductInput, productId?: string) {
    const baseUnitCode =
      input.units.find((unit) => unit.isBaseUnit)?.unitCode ?? "";

    if (productId) {
      setProducts((current) =>
        current.map((product) =>
          product.id === productId
            ? { ...product, ...input, baseUnitCode }
            : product,
        ),
      );
      return;
    }

    setProducts((current) => [
      ...current,
      { id: crypto.randomUUID(), ...input, baseUnitCode },
    ]);
  }

  return (
    <CatalogDemoContext.Provider
      value={{ categories, products, saveCategory, saveProduct }}
    >
      {children}
    </CatalogDemoContext.Provider>
  );
}