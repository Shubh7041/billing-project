export const MAX_MONEY_MINOR_UNITS = 99999999999999n;
export const MAX_QUANTITY = 999999999999999999n;

export function parseMoneyToMinorUnits(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const minorUnits = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return minorUnits <= MAX_MONEY_MINOR_UNITS ? minorUnits : null;
}

export function parseQuantity(value: string): bigint | null {
  const normalized = value.trim();
  if (!/^\d{1,18}$/.test(normalized)) return null;
  const quantity = BigInt(normalized);
  return quantity > 0n && quantity <= MAX_QUANTITY ? quantity : null;
}

export function formatMoney(minorUnits: bigint): string {
  const rupees = minorUnits / 100n;
  const paise = (minorUnits % 100n).toString().padStart(2, "0");
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(rupees)}.${paise}`;
}

export function calculateCartLineTotal(line: { quantity: string; unitPrice: string }): bigint | null {
  const quantity = parseQuantity(line.quantity);
  const price = parseMoneyToMinorUnits(line.unitPrice);
  if (quantity === null || price === null) return null;
  const total = quantity * price;
  return total <= MAX_MONEY_MINOR_UNITS ? total : null;
}

export function calculateCartSubtotal(
  lines: Array<{ quantity: string; unitPrice: string }>,
): bigint | null {
  let subtotal = 0n;
  for (const line of lines) {
    const lineTotal = calculateCartLineTotal(line);
    if (lineTotal === null) return null;
    subtotal += lineTotal;
    if (subtotal > MAX_MONEY_MINOR_UNITS) return null;
  }
  return subtotal;
}

export function calculateBaseQuantity(quantityText: string, factorText: string): bigint | null {
  const quantity = parseQuantity(quantityText);
  if (quantity === null || !/^\d{1,18}$/.test(factorText)) return null;
  const factor = BigInt(factorText);
  if (factor < 1n || factor > MAX_QUANTITY) return null;
  const result = quantity * factor;
  return result <= 999999999999999999999999999999999999n ? result : null;
}

export function formatQuantity(quantity: bigint): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(quantity);
}