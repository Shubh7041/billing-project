import { DataTable, StatusBadge } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  stock: number;
  active: boolean;
}

const columns: DataTableColumn<ProductRow>[] = [
  {
    key: "name",
    header: "Product",
    render: (product) => product.name,
  },
  {
    key: "sku",
    header: "SKU",
    render: (product) => product.sku,
  },
  {
    key: "stock",
    header: "Stock",
    align: "right",
    render: (product) => product.stock,
  },
  {
    key: "status",
    header: "Status",
    render: (product) => (
      <StatusBadge variant={product.active ? "success" : "neutral"}>
        {product.active ? "Active" : "Inactive"}
      </StatusBadge>
    ),
  },
];

// Inside a page component:
<DataTable
  columns={columns}
  rows={[]}
  getRowKey={(product) => product.id}
  isLoading={  false}
  loadingMessage="Loading products..."
  emptyTitle="No products found"
  emptyDescription="Add a product to start building your catalogue."
/>;