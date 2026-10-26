import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable, StatusBadge } from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";

interface ProductRow {
  id: string;
  name: string;
  sku: string;
  stock: number;
  active: boolean;
}
const data: ProductRow[] = [
  {
    id: "1",
    name: "Sample Product",
    sku: "SKU-001",
    stock: 10,
    active: true,
  },
];
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

export function ProductsPage() {
  return (
    <PageContainer
      title="Products"
      description="Here's an overview of your store."
    >
     <DataTable
       columns={columns}
       rows={data}
       getRowKey={(product) => product.id}
       isLoading={  false}
       loadingMessage="Loading products..."
       emptyTitle="No products found"
       emptyDescription="Add a product to start building your catalogue."
     />
    </PageContainer>
  );
}
