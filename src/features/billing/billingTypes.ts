export interface CartLine {
  id: string;
  productId: string;
  productUnitId: string;
  productName: string;
  sku: string;
  unitName: string;
  unitCode: string;
  baseUnitName: string;
  baseQuantityPerUnit: string;
  unitPrice: string;
  unitPriceMinor: string;
  quantity: string;
}

export type PaymentMethod = "cash" | "upi";

export interface DemoReceiptPreview {
  lines: CartLine[];
  subtotalMinor: bigint;
  paymentMethod: PaymentMethod;
  paymentAmountMinor: bigint | null;
  changeMinor: bigint;
  paymentStatus: "not-processed";
  createdAt: string;
}