export type PurchaseStatus = "draft" | "posted";

export interface PurchaseLine {
  id: string;
  productId: string;
  productUnitId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitNameSnapshot: string;
  unitCodeSnapshot: string;
  baseQuantityPerUnitSnapshot: string;
  quantity: string;
  unitCost: string;
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  purchaseDate: string;
  supplierInvoiceRef: string;
  notes: string;
  status: PurchaseStatus;
  subtotal: string | null;
  total: string | null;
  createdAt: string;
  updatedAt: string;
  postedAt: string | null;
  lines: PurchaseLine[];
}