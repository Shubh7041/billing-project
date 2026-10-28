import { useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, Eye, ListFilter, Pencil, Plus, Search, X } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button, Card, DataTable, EmptyState, Icon, StatusBadge } from "../../components/ui";
import type { DataTableColumn } from "../../components/ui";
import { CatalogDemoNotice } from "../catalog/CatalogDemoNotice";
import { useCatalogDemo } from "../catalog/catalogDemoContext";
import type { Product, ProductInput } from "../catalog/catalogTypes";
import { ProductDetails } from "./ProductDetails";
import { ProductForm } from "./ProductForm";

function formatPrice(value: string): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function ProductsPage() {
  const { categories, products, saveProduct } = useCatalogDemo();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = `${product.name} ${product.sku} ${product.description}`
        .toLowerCase()
        .includes(query);
      const matchesCategory =
        categoryFilter === "all" || product.categoryId === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, products, search]);

  function handleSave(input: ProductInput): string | null {
    const normalizedSku = input.sku.trim().toUpperCase();
    const duplicateSku = products.some(
      (product) =>
        product.id !== editingProduct?.id &&
        product.sku.trim().toUpperCase() === normalizedSku,
    );

    if (duplicateSku) {
      return "This SKU is already used in this store.";
    }

    saveProduct({ ...input, sku: normalizedSku }, editingProduct?.id);
    setShowForm(false);
    setEditingProduct(undefined);
    setSelectedProduct(undefined);
    return null;
  }

  function startEdit(product: Product) {
    setEditingProduct(product);
    setSelectedProduct(undefined);
    setShowForm(true);
  }

  function toggleProduct(product: Product) {
    const action = product.isActive ? "Deactivate" : "Activate";
    if (!window.confirm(`${action} “${product.name}”?`)) return;
    saveProduct({ ...product, isActive: !product.isActive }, product.id);
    setSelectedProduct((selected) =>
      selected?.id === product.id ? { ...selected, isActive: !product.isActive } : selected,
    );
  }

  const columns: DataTableColumn<Product>[] = [
    {
      key: "product",
      header: "Product",
      render: (product) => (
        <button
          type="button"
          className="catalog-product-link"
          onClick={() => setSelectedProduct(product)}
        >
          <strong>{product.name}<Icon icon={Eye} size={14} /></strong>
          <span>{product.sku}</span>
        </button>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (product) =>
        categories.find((category) => category.id === product.categoryId)?.name ??
        "Uncategorized",
    },
    {
      key: "base-unit",
      header: "Base unit",
      render: (product) =>
        product.units.find((unit) => unit.isBaseUnit)?.unitName ?? "Not set",
    },
    {
      key: "units",
      header: "Units",
      render: (product) => product.units.length,
      align: "right",
    },
    {
      key: "price",
      header: "From",
      align: "right",
      render: (product) => {
        const sellablePrices = product.units
          .filter((unit) => unit.isSellable)
          .map((unit) => Number(unit.sellingPrice));
        const minimumPrice = sellablePrices.length ? Math.min(...sellablePrices) : null;
        return minimumPrice === null ? "—" : formatPrice(minimumPrice.toFixed(2));
      },
    },
    {
      key: "status",
      header: "Status",
      render: (product) => (
        <StatusBadge variant={product.isActive ? "success" : "neutral"}>
          {product.isActive ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (product) => (
        <div className="catalog-row-actions">
          <Button size="sm" variant="ghost" onClick={() => startEdit(product)}>
            <Icon icon={Pencil} size={15} />
            Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => toggleProduct(product)}>
            <Icon icon={product.isActive ? CircleAlert : CheckCircle2} size={15} />
            {product.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Products"
      description="Manage product details, categories, and sellable unit conversions."
      actions={
        <Button
          onClick={() => {
            setEditingProduct(undefined);
            setSelectedProduct(undefined);
            setShowForm((current) => !current);
          }}
        >
          <Icon icon={showForm && !editingProduct ? X : Plus} size={16} />
          {showForm && !editingProduct ? "Close form" : "Add product"}
        </Button>
      }
    >
      <div className="catalog-page">
        <CatalogDemoNotice />

        {showForm && (
          <ProductForm
            key={editingProduct?.id ?? "new-product"}
            product={editingProduct}
            onSubmit={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditingProduct(undefined);
            }}
          />
        )}

        {selectedProduct && (
          <ProductDetails
            product={products.find((product) => product.id === selectedProduct.id) ?? selectedProduct}
            categories={categories}
            onEdit={() => startEdit(selectedProduct)}
            onClose={() => setSelectedProduct(undefined)}
          />
        )}

        <Card
          className="catalog-list-card"
          title="Product catalogue"
          description={`${products.length} products in this demo catalogue`}
        >
          <div className="catalog-toolbar">
            <label className="catalog-search-field" htmlFor="product-search">
              <span><Icon icon={Search} size={15} /> Search products</span>
              <input
                id="product-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, SKU, or description"
              />
            </label>
            <label className="catalog-filter-field" htmlFor="product-category-filter">
              <span><Icon icon={ListFilter} size={15} /> Category</span>
              <select
                id="product-category-filter"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.isActive ? "" : " (inactive)"}
                  </option>
                ))}
              </select>
            </label>
            <span className="catalog-result-count">{filteredProducts.length} shown</span>
          </div>

          {filteredProducts.length === 0 ? (
            <EmptyState
              title={search || categoryFilter !== "all" ? "No matching products" : "No products yet"}
              description={
                search || categoryFilter !== "all"
                  ? "Try another search or category."
                  : "Add a product to begin building the catalogue."
              }
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filteredProducts}
              getRowKey={(product) => product.id}
              isLoading={false}
              loadingMessage="Loading products"
              emptyTitle="No products found"
              emptyDescription="Try another search or category."
              rowLabel={(product) => `${product.name}, SKU ${product.sku}`}
            />
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
