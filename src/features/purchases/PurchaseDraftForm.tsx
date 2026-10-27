import { useState, type FormEvent } from "react";
import { Button, Card } from "../../components/ui";
import type { Product } from "../catalog/catalogTypes";
import type { Supplier } from "../suppliers/supplierTypes";
import {
  calculateLineMinorUnits,
  calculatePurchaseMinorUnits,
  formatInrMinorUnits,
  parseInrToMinorUnits,
  parsePurchaseQuantity,
} from "./purchaseDemoData";
import type { Purchase, PurchaseLine } from "./purchaseTypes";
import { PurchaseLineEditor } from "./PurchaseLineEditor";

interface PurchaseDraftFormProps {
  purchase: Purchase;
  existingNumbers: string[];
  suppliers: Supplier[];
  products: Product[];
  onSave: (purchase: Purchase) => string | null;
  onCancel: () => void;
}

export function PurchaseDraftForm({
  purchase,
  existingNumbers,
  suppliers,
  products,
  onSave,
  onCancel,
}: PurchaseDraftFormProps) {
  const [supplierId, setSupplierId] = useState(purchase.supplierId);
  const [purchaseNumber, setPurchaseNumber] = useState(purchase.purchaseNumber);
  const [purchaseDate, setPurchaseDate] = useState(purchase.purchaseDate);
  const [supplierInvoiceRef, setSupplierInvoiceRef] = useState(purchase.supplierInvoiceRef);
  const [notes, setNotes] = useState(purchase.notes);
  const [lines, setLines] = useState(purchase.lines);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const activeSuppliers = suppliers.filter(
    (supplier) => supplier.isActive || supplier.id === purchase.supplierId,
  );
  const activeProducts = products;
  const total = calculatePurchaseMinorUnits(lines);

  function updateLine(index: number, nextLine: PurchaseLine) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? nextLine : line));
  }

  function addLine() {
    const firstProduct = activeProducts.find((product) => product.isActive);
    const firstUnit = firstProduct?.units.find((unit) => unit.isPurchasable);
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        productId: firstProduct?.id ?? "",
        productUnitId: firstUnit?.id ?? "",
        productNameSnapshot: firstProduct?.name ?? "",
        skuSnapshot: firstProduct?.sku ?? "",
        unitNameSnapshot: firstUnit?.unitName ?? "",
        unitCodeSnapshot: firstUnit?.unitCode ?? "",
        baseQuantityPerUnitSnapshot: firstUnit?.baseQuantity ?? "",
        quantity: "1",
        unitCost: "",
      },
    ]);
  }

  function validateDraft(): string | null {
    if (!supplierId || !activeSuppliers.some((supplier) => supplier.id === supplierId && supplier.isActive)) {
      return "Select an active supplier.";
    }
    const normalizedPurchaseNumber = purchaseNumber.trim().toUpperCase();
    if (!normalizedPurchaseNumber) return "Purchase number is required.";
    if (existingNumbers.some((number) =>
      number.toUpperCase() === normalizedPurchaseNumber &&
      number !== purchase.purchaseNumber
    )) {
      return "That purchase number is already in use in this demo.";
    }
    if (!purchaseDate) return "Purchase date is required.";

    for (const [index, line] of lines.entries()) {
      if (!line.productId || !line.productUnitId) {
        return `Select a product and purchasable unit for line ${index + 1}.`;
      }
      if (parsePurchaseQuantity(line.quantity) === null) {
        return `Line ${index + 1}: quantity must be a positive whole number within the supported range.`;
      }
      if (parseInrToMinorUnits(line.unitCost) === null) {
        return `Line ${index + 1}: enter a non-negative unit cost with up to two decimal places.`;
      }
      if (calculateLineMinorUnits(line.quantity, line.unitCost) === null) {
        return `Line ${index + 1}: line subtotal exceeds the supported INR amount.`;
      }
      if (!line.baseQuantityPerUnitSnapshot) {
        return `Line ${index + 1}: select a unit with a valid base conversion.`;
      }
    }

    if (lines.length > 0 && total === null) {
      return "The purchase total exceeds the supported INR amount.";
    }
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);
    const saveError = onSave({
      ...purchase,
      supplierId,
      purchaseNumber: purchaseNumber.trim().toUpperCase(),
      purchaseDate,
      supplierInvoiceRef: supplierInvoiceRef.trim(),
      notes: notes.trim(),
      lines,
      updatedAt: new Date().toISOString(),
    });
    setIsSaving(false);
    setError(saveError);
  }

  const calculatedTotal = total === null ? null : formatInrMinorUnits(total);

  return (
    <Card
      className="purchase-form-card"
      title={purchase.status === "draft" ? "Edit draft purchase" : "New purchase draft"}
      description="Draft changes are temporary in this demo and do not update inventory."
    >
      <form className="purchase-form" onSubmit={handleSubmit} noValidate>
        <div className="purchase-form-grid">
          <div className="purchase-form-field">
            <label htmlFor="purchase-number">Purchase number *</label>
            <input id="purchase-number" value={purchaseNumber} onChange={(event) => setPurchaseNumber(event.target.value)} required />
          </div>
          <div className="purchase-form-field">
            <label htmlFor="purchase-supplier">Supplier *</label>
            <select id="purchase-supplier" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
              <option value="">Select supplier</option>
              {activeSuppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}{supplier.isActive ? "" : " (inactive)"}
                </option>
              ))}
            </select>
          </div>
          <div className="purchase-form-field">
            <label htmlFor="purchase-date">Purchase date *</label>
            <input id="purchase-date" type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} required />
          </div>
          <div className="purchase-form-field">
            <label htmlFor="purchase-invoice-ref">Supplier invoice reference (optional)</label>
            <input id="purchase-invoice-ref" value={supplierInvoiceRef} onChange={(event) => setSupplierInvoiceRef(event.target.value)} />
          </div>
          <div className="purchase-form-field purchase-form-field-wide">
            <label htmlFor="purchase-notes">Notes (optional)</label>
            <textarea id="purchase-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>

        <section className="purchase-lines-section" aria-labelledby="purchase-lines-heading">
          <div className="purchase-section-heading">
            <div>
              <h3 id="purchase-lines-heading">Purchase lines</h3>
              <p>Full receipt only. Quantities use the selected unit; received stock uses its saved base-unit conversion.</p>
            </div>
            <Button type="button" variant="outline" onClick={addLine} disabled={activeProducts.length === 0}>
              Add line
            </Button>
          </div>

          {lines.length === 0 ? (
            <p className="purchase-no-lines">No lines yet. You can save an empty draft and add lines before review.</p>
          ) : (
            <div className="purchase-line-list">
              {lines.map((line, index) => (
                <PurchaseLineEditor
                  key={line.id}
                  line={line}
                  products={activeProducts}
                  onChange={(nextLine) => updateLine(index, nextLine)}
                  onRemove={() => setLines((current) => current.filter((item) => item.id !== line.id))}
                />
              ))}
            </div>
          )}
        </section>

        <div className="purchase-total-row">
          <span>Draft total</span>
          <strong>{calculatedTotal ?? "Complete valid quantities and costs"}</strong>
        </div>

        {error && <p className="purchase-form-error" role="alert">{error}</p>}

        <div className="purchase-form-actions">
          <Button type="submit" disabled={isSaving}>{isSaving ? "Saving…" : "Save demo draft"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}