import type { Purchase } from "./purchaseTypes";

export const MAX_PURCHASE_QUANTITY = 999999999999999999n;
export const MAX_BASE_QUANTITY = 999999999999999999999999999999999999n;
export const MAX_MONEY_MINOR_UNITS = 99999999999999n;

export const demoPurchases: Purchase[] = [
  {
    id: "purchase-demo-posted-1",
    purchaseNumber: "PO-2026-0024",
    supplierId: "supplier-south-star",
    purchaseDate: "2026-10-25",
    supplierInvoiceRef: "SS-INV-4821",
    notes: "Preview receipt",
    status: "posted",
    subtotal: "38900.00",
    total: "38900.00",
    createdAt: "2026-10-25T09:10:00+05:30",
    updatedAt: "2026-10-25T09:42:00+05:30",
    postedAt: "2026-10-25T09:42:00+05:30",
    lines: [
      {
        id: "purchase-demo-line-1",
        productId: "product-sparkler-10",
        productUnitId: "unit-sparkler-box",
        productNameSnapshot: "Sparklers 10 cm",
        skuSnapshot: "SPK-010",
        unitNameSnapshot: "Box",
        unitCodeSnapshot: "box",
        baseQuantityPerUnitSnapshot: "100",
        quantity: "50",
        unitCost: "778.00",
      },
    ],
  },
  {
    id: "purchase-demo-draft-1",
    purchaseNumber: "PO-2026-0025",
    supplierId: "supplier-bright-sky",
    purchaseDate: "2026-10-27",
    supplierInvoiceRef: "",
    notes: "Review quantities before receiving",
    status: "draft",
    subtotal: null,
    total: null,
    createdAt: "2026-10-27T10:15:00+05:30",
    updatedAt: "2026-10-27T10:15:00+05:30",
    postedAt: null,
    lines: [
      {
        id: "purchase-demo-line-2",
        productId: "product-flower-pot",
        productUnitId: "unit-flower-carton",
        productNameSnapshot: "Flower Pots Medium",
        skuSnapshot: "GND-204",
        unitNameSnapshot: "Carton",
        unitCodeSnapshot: "carton",
        baseQuantityPerUnitSnapshot: "12",
        quantity: "4",
        unitCost: "1520.00",
      },
    ],
  },
];

export function parseInrToMinorUnits(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ""] = normalized.split(".");
  const minorUnits = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return minorUnits <= MAX_MONEY_MINOR_UNITS ? minorUnits : null;
}

export function parsePurchaseQuantity(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d{1,18}$/.test(normalized)) return null;
  const quantity = BigInt(normalized);
  return quantity > 0n && quantity <= MAX_PURCHASE_QUANTITY ? quantity : null;
}

export function formatInrMinorUnits(value: bigint): string {
  const wholeRupees = value / 100n;
  const paise = (value % 100n).toString().padStart(2, "0");
  const formattedRupees = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(wholeRupees);
  return `₹${formattedRupees}.${paise}`;
}

export function formatBaseQuantity(value: bigint): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
}

export function calculateLineMinorUnits(
  quantity: string,
  unitCost: string,
): bigint | null {
  const parsedQuantity = parsePurchaseQuantity(quantity);
  const parsedUnitCost = parseInrToMinorUnits(unitCost);
  if (parsedQuantity === null || parsedUnitCost === null) return null;
  const subtotal = parsedQuantity * parsedUnitCost;
  return subtotal <= MAX_MONEY_MINOR_UNITS ? subtotal : null;
}

export function calculatePurchaseMinorUnits(
  lines: Purchase["lines"],
): bigint | null {
  let total = 0n;
  for (const line of lines) {
    const lineTotal = calculateLineMinorUnits(line.quantity, line.unitCost);
    if (lineTotal === null) return null;
    total += lineTotal;
    if (total > MAX_MONEY_MINOR_UNITS) return null;
  }
  return total;
}

export function calculateReceivedBaseQuantity(line: Purchase["lines"][number]): bigint | null {
  const quantity = parsePurchaseQuantity(line.quantity);
  if (quantity === null || !/^\d{1,18}$/.test(line.baseQuantityPerUnitSnapshot)) {
    return null;
  }
  const conversion = BigInt(line.baseQuantityPerUnitSnapshot);
  if (conversion < 1n) return null;
  const received = quantity * conversion;
  return received <= MAX_BASE_QUANTITY ? received : null;
}

export function createDemoDraft(supplierId: string): Purchase {
  const now = new Date();
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase();
  return {
    id: crypto.randomUUID(),
    purchaseNumber: `PO-DEMO-${suffix}`,
    supplierId,
    purchaseDate: now.toISOString().slice(0, 10),
    supplierInvoiceRef: "",
    notes: "",
    status: "draft",
    subtotal: null,
    total: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    postedAt: null,
    lines: [],
  };
}

export function formatPurchaseTimestamp(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(parsed);
}