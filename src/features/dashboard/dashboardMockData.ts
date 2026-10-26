export type SalesPeriod = "7d" | "30d";

export interface SalesPoint {
  label: string;
  amount: number;
}

export interface RecentBill {
  invoiceNumber: string;
  time: string;
  summary: string;
  total: number;
  paymentMethod: string;
  status: "Paid" | "Pending" | "Part paid";
}

export interface LowStockProduct {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

// Preview fixtures only. Replace this module with authorized query data later.
export const dashboardSummaryMock = {
  todaySales: 48650,
  todayBills: 86,
  lowStockItems: 7,
  totalProducts: 284,
};

export const salesTrendMock: Record<SalesPeriod, SalesPoint[]> = {
  "7d": [
    { label: "Mon", amount: 31200 },
    { label: "Tue", amount: 38700 },
    { label: "Wed", amount: 35400 },
    { label: "Thu", amount: 42100 },
    { label: "Fri", amount: 39800 },
    { label: "Sat", amount: 52300 },
    { label: "Sun", amount: 48650 },
  ],
  "30d": [
    { label: "Week 1", amount: 198400 },
    { label: "Week 2", amount: 224600 },
    { label: "Week 3", amount: 216300 },
    { label: "Week 4", amount: 251800 },
  ],
};

export const recentBillsMock: RecentBill[] = [
  {
    invoiceNumber: "INV-2026-0842",
    time: "04:42 PM",
    summary: "4 items · Walk-in customer",
    total: 2450,
    paymentMethod: "UPI",
    status: "Paid",
  },
  {
    invoiceNumber: "INV-2026-0841",
    time: "04:35 PM",
    summary: "2 items · Walk-in customer",
    total: 1280,
    paymentMethod: "Cash",
    status: "Paid",
  },
  {
    invoiceNumber: "INV-2026-0840",
    time: "04:18 PM",
    summary: "6 items · Retail customer",
    total: 6840,
    paymentMethod: "Card",
    status: "Part paid",
  },
  {
    invoiceNumber: "INV-2026-0839",
    time: "03:56 PM",
    summary: "1 item · Walk-in customer",
    total: 750,
    paymentMethod: "UPI",
    status: "Pending",
  },
];

export const lowStockProductsMock: LowStockProduct[] = [
  { id: "low-1", name: "Sparklers 10 cm", quantity: 3, unit: "boxes" },
  { id: "low-2", name: "Flower Pots Medium", quantity: 5, unit: "packets" },
  { id: "low-3", name: "Ground Chakras", quantity: 8, unit: "pieces" },
];

export const formatInr = (amount: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);

export const formatCount = (count: number): string =>
  new Intl.NumberFormat("en-IN").format(count);