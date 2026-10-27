import { useMemo, useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button, Card, DataTable, StatusBadge } from "../../components/ui";
import type { DataTableColumn } from "../../components/ui";
import { CatalogDemoNotice } from "../catalog/CatalogDemoNotice";
import { useCatalogDemo } from "../catalog/catalogDemoContext";
import type { Category, CategoryInput } from "../catalog/catalogTypes";
import { CategoryForm } from "./CategoryForm";

export function CategoriesPage() {
  const { categories, products, saveCategory } = useCatalogDemo();
  const [search, setSearch] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const [showForm, setShowForm] = useState(false);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categories.filter((category) =>
      `${category.name} ${category.description}`.toLowerCase().includes(query),
    );
  }, [categories, search]);

  function handleSave(input: CategoryInput): string | null {
    const normalizedName = input.name.trim().toLowerCase();
    const duplicate = categories.some(
      (category) =>
        category.id !== editingCategory?.id &&
        category.name.trim().toLowerCase() === normalizedName,
    );

    if (duplicate) {
      return "A category with this name already exists in the store.";
    }

    saveCategory(input, editingCategory?.id);
    setShowForm(false);
    setEditingCategory(undefined);
    return null;
  }

  function toggleCategory(category: Category) {
    const linkedProducts = products.filter(
      (product) => product.categoryId === category.id,
    ).length;
    const confirmation = category.isActive
      ? linkedProducts > 0
        ? `Deactivate “${category.name}”? ${linkedProducts} product(s) will keep their category association, but the category won't be available for new products.`
        : `Deactivate “${category.name}”?`
      : `Reactivate “${category.name}”?`;

    if (window.confirm(confirmation)) {
      saveCategory({ ...category, isActive: !category.isActive }, category.id);
    }
  }

  const columns: DataTableColumn<Category>[] = [
    {
      key: "category",
      header: "Category",
      render: (category) => (
        <div className="catalog-table-primary">
          <strong>{category.name}</strong>
          <span>{category.description || "No description"}</span>
        </div>
      ),
    },
    {
      key: "products",
      header: "Products",
      align: "right",
      render: (category) =>
        products.filter((product) => product.categoryId === category.id).length,
    },
    {
      key: "status",
      header: "Status",
      render: (category) => (
        <StatusBadge variant={category.isActive ? "success" : "neutral"}>
          {category.isActive ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (category) => (
        <div className="catalog-row-actions">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditingCategory(category);
              setShowForm(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toggleCategory(category)}
          >
            {category.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Categories"
      description="Organize products into groups for browsing and reporting."
      actions={
        <Button
          onClick={() => {
            setEditingCategory(undefined);
            setShowForm((current) => !current);
          }}
        >
          {showForm && !editingCategory ? "Close form" : "Create category"}
        </Button>
      }
    >
      <div className="catalog-page">
        <CatalogDemoNotice />

        {showForm && (
          <CategoryForm
            key={editingCategory?.id ?? "new-category"}
            category={editingCategory}
            onSubmit={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingCategory(undefined);
            }}
          />
        )}

        <Card
          className="catalog-list-card"
          title="Category list"
          description={`${categories.length} categories in this demo catalogue`}
        >
          <div className="catalog-toolbar">
            <label className="catalog-search-field" htmlFor="category-search">
              <span>Search categories</span>
              <input
                id="category-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name or description"
              />
            </label>
            <span className="catalog-result-count">
              {filteredCategories.length} shown
            </span>
          </div>

          <DataTable
            columns={columns}
            rows={filteredCategories}
            getRowKey={(category) => category.id}
            isLoading={false}
            emptyTitle={search ? "No matching categories" : "No categories yet"}
            emptyDescription={
              search
                ? "Try another category name or description."
                : "Create a category to organize your products."
            }
            rowLabel={(category) =>
              `${category.name}, ${category.isActive ? "active" : "inactive"}`
            }
          />
        </Card>
      </div>
    </PageContainer>
  );
}