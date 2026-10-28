
import { useMemo, useState } from "react";
import { Eye, Info, ListFilter, Plus, Search } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button, Card, DataTable, EmptyState, Icon } from "../../components/ui";
import type { DataTableColumn } from "../../components/ui";
import { useCatalogDemo } from "../catalog/catalogDemoContext";
import type { Product } from "../catalog/catalogTypes";
import "./inventory.css";

interface InventoryCatalogRow {
  product: Product;
  categoryName: string;
  baseUnitLabel: string;
}

interface MovementPreviewRow {
  id: string;
  movementType: string;
  quantityDelta: string;
  source: string;
  recordedAt: string;
  actor: string;
  reason: string;
}

const noLiveMovements: MovementPreviewRow[] = [];

const movementColumns: DataTableColumn<MovementPreviewRow>[] = [
  { key: "type", header: "Movement", render: (row) => row.movementType },
  { key: "delta", header: "Quantity change", align: "right", render: (row) => row.quantityDelta },
  { key: "source", header: "Source", render: (row) => row.source },
  { key: "date", header: "Recorded", render: (row) => row.recordedAt },
  { key: "actor", header: "Staff", render: (row) => row.actor },
  { key: "reason", header: "Reason", render: (row) => row.reason },
];

export function InventoryPage() {
  const { products, categories } = useCatalogDemo();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const rows = useMemo<InventoryCatalogRow[]>(() => {
    const query = search.trim().toLowerCase();
    return products
      .filter((product) => {
        const matchesSearch = `${product.name} ${product.sku} ${product.description}`
          .toLowerCase()
          .includes(query);
        const matchesCategory =
          categoryFilter === "all" || product.categoryId === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .map((product) => ({
        product,
        categoryName:
          categories.find((category) => category.id === product.categoryId)?.name ??
          "Uncategorized",
        baseUnitLabel:
          product.units.find((unit) => unit.isBaseUnit)?.unitName ??
          product.baseUnitCode,
      }));
  }, [categories, categoryFilter, products, search]);

  const selectedProduct = products.find((product) => product.id === selectedProductId);

  const columns: DataTableColumn<InventoryCatalogRow>[] = [
    {
      key: "product",
      header: "Product",
      render: ({ product }) => (
        <div className="inventory-product-cell">
          <strong>{product.name}</strong>
          <span>{product.sku}</span>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (row) => row.categoryName },
    { key: "unit", header: "Base unit", render: (row) => row.baseUnitLabel },
    {
      key: "stock",
      header: "On hand",
      align: "right",
      render: () => <span className="inventory-unavailable">Unavailable</span>,
    },
    {
      key: "threshold",
      header: "Low-stock threshold",
      align: "right",
      render: () => <span className="inventory-unavailable">Not configured</span>,
    },
    {
      key: "actions",
      header: "History",
      render: ({ product }) => (
        <Button
          size="sm"
          variant="ghost"
          aria-label={`View stock movement history for ${product.name}`}
          onClick={() => setSelectedProductId(product.id)}
        >
          <Icon icon={Eye} size={15} />
          Movement history
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="Inventory"
      description="Review the product catalogue and stock ledger availability."
      actions={
        <Button
          disabled
          title="Stock adjustments are unavailable until an authorized database operation is reviewed."
        >
          <Icon icon={Plus} size={16} />
          Stock adjustment unavailable
        </Button>
      }
    >
      <div className="inventory-page">
        <div className="inventory-demo-notice" role="note">
          <Icon icon={Info} size={16} />
          Catalog preview only. Live stock balances and movement history are disabled because inventory reads are not authorized for the client. No quantities or ledger entries are simulated.
        </div>

        <Card
          className="inventory-list-card"
          title="Product stock overview"
          description="Stock is shown only when an authorized inventory read is available."
        >
          <div className="inventory-toolbar">
            <label className="inventory-filter-field" htmlFor="inventory-search">
              <span><Icon icon={Search} size={15} /> Search products</span>
              <input
                id="inventory-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Name, SKU, or description"
              />
            </label>
            <label className="inventory-filter-field" htmlFor="inventory-category">
              <span><Icon icon={ListFilter} size={15} /> Category</span>
              <select
                id="inventory-category"
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="inventory-result-count">{rows.length} catalog preview items</span>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              title={search || categoryFilter !== "all" ? "No matching products" : "No catalog preview items"}
              description="Try another search or category. Live inventory remains unavailable until database read access is reviewed."
            />
          ) : (
            <DataTable
              columns={columns}
              rows={rows}
              getRowKey={({ product }) => product.id}
              isLoading={false}
              loadingMessage="Loading inventory"
              emptyTitle="No products found"
              emptyDescription="Try another search or category."
              rowLabel={({ product, baseUnitLabel }) => `${product.name}, base unit ${baseUnitLabel}, stock unavailable`}
            />
          )}
        </Card>

        <Card
          className="inventory-movement-card"
          title={selectedProduct ? `Movement history · ${selectedProduct.name}` : "Stock movement history"}
          description="Read-only ledger fields supported by the database schema."
        >
          <div className="inventory-ledger-fields" aria-label="Movement record fields">
            <span>Movement type</span>
            <span>Signed base-unit quantity</span>
            <span>Resulting balance</span>
            <span>Source reference</span>
            <span>Recorded time</span>
            <span>Staff and reason</span>
          </div>
          <DataTable
            columns={movementColumns}
            rows={noLiveMovements}
            getRowKey={(movement) => movement.id}
            isLoading={false}
            emptyTitle="Movement history unavailable"
            emptyDescription="No ledger records are shown in demo mode. Connect an authorized read path before displaying stock movements."
          />
        </Card>
      </div>
    </PageContainer>
  );
}
