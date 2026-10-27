import { useMemo, useState } from "react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button, Card, DataTable, EmptyState, StatusBadge } from "../../components/ui";
import type { DataTableColumn } from "../../components/ui";
import { CatalogDemoNotice } from "../catalog/CatalogDemoNotice";
import { useCatalogDemo } from "../catalog/catalogDemoContext";
import { supplierDemoData } from "../suppliers/supplierDemoData";
import { PurchaseDetails } from "./PurchaseDetails";
import { PurchaseDraftForm } from "./PurchaseDraftForm";
import {
  createDemoDraft,
  formatInrMinorUnits,
  formatPurchaseTimestamp,
  calculatePurchaseMinorUnits,
  demoPurchases,
} from "./purchaseDemoData";
import type { Purchase } from "./purchaseTypes";
import "./purchases.css";
import "./purchases.css";

type PurchaseFilter = "all" | "draft" | "posted";

function formatPurchaseDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(parsed);
}

function getPurchaseTotal(purchase: Purchase): string {
  const total = calculatePurchaseMinorUnits(purchase.lines);
  if (total === null) return "Incomplete";
  return formatInrMinorUnits(total);
}

export function PurchasesPage() {
  const { products } = useCatalogDemo();
  const [purchases, setPurchases] = useState(demoPurchases);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseFilter>("all");
  const [editingPurchase, setEditingPurchase] = useState<Purchase | undefined>();
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeSuppliers = supplierDemoData.filter((supplier) => supplier.isActive);
  const selectedPurchase = purchases.find((purchase) => purchase.id === selectedPurchaseId);

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase();
    return purchases.filter((purchase) => {
      const supplierName = supplierDemoData.find(
        (supplier) => supplier.id === purchase.supplierId,
      )?.name ?? "";
      const matchesSearch =
        `${purchase.purchaseNumber} ${purchase.supplierInvoiceRef} ${supplierName}`
          .toLowerCase()
          .includes(query);
      const matchesStatus = statusFilter === "all" || purchase.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [purchases, search, statusFilter]);

  function startNewDraft() {
    if (activeSuppliers.length === 0) {
      setError("No active supplier is available in this demo.");
      setFeedback(null);
      return;
    }
    setError(null);
    setFeedback(null);
    setSelectedPurchaseId(null);
    setEditingPurchase(createDemoDraft(activeSuppliers[0].id));
  }

  function saveDraft(nextPurchase: Purchase): string | null {
    const normalizedNumber = nextPurchase.purchaseNumber.trim().toUpperCase();
    const duplicate = purchases.some(
      (purchase) =>
        purchase.id !== nextPurchase.id &&
        purchase.purchaseNumber.toUpperCase() === normalizedNumber,
    );
    if (duplicate) return "This purchase number is already used in the demo.";

    const savedPurchase = {
      ...nextPurchase,
      purchaseNumber: normalizedNumber,
    };
    setPurchases((current) => {
      const exists = current.some((purchase) => purchase.id === savedPurchase.id);
      return exists
        ? current.map((purchase) => purchase.id === savedPurchase.id ? savedPurchase : purchase)
        : [savedPurchase, ...current];
    });
    setSelectedPurchaseId(savedPurchase.id);
    setEditingPurchase(undefined);
    setFeedback(`${savedPurchase.purchaseNumber} was saved in this demo session only.`);
    setError(null);
    return null;
  }

  const columns: DataTableColumn<Purchase>[] = [
    {
      key: "number",
      header: "Purchase number",
      render: (purchase) => (
        <button
          className="purchase-number-link"
          type="button"
          onClick={() => {
            setEditingPurchase(undefined);
            setSelectedPurchaseId(purchase.id);
          }}
        >
          {purchase.purchaseNumber}
        </button>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (purchase) =>
        supplierDemoData.find((supplier) => supplier.id === purchase.supplierId)?.name ??
        "Supplier unavailable",
    },
    { key: "date", header: "Purchase date", render: (purchase) => formatPurchaseDate(purchase.purchaseDate) },
    { key: "total", header: "Total", align: "right", render: (purchase) => getPurchaseTotal(purchase) },
    {
      key: "status",
      header: "Status",
      render: (purchase) => (
        <StatusBadge variant={purchase.status === "posted" ? "success" : "warning"}>
          {purchase.status === "posted" ? "Posted" : "Draft"}
        </StatusBadge>
      ),
    },
    { key: "updated", header: "Last updated", render: (purchase) => formatPurchaseTimestamp(purchase.updatedAt) },
  ];

  return (
    <PageContainer
      title="Purchases"
      description="Review supplier purchases and draft receipts."
      actions={
        <Button onClick={startNewDraft}>New purchase</Button>
      }
    >
      <div className="purchases-page">
        <CatalogDemoNotice />
        {feedback && <p className="purchase-feedback" role="status" aria-live="polite">{feedback}</p>}
        {error && <p className="purchase-page-error" role="alert">{error}</p>}

        {editingPurchase && (
          <PurchaseDraftForm
            key={editingPurchase.id}
            purchase={editingPurchase}
            existingNumbers={purchases.map((purchase) => purchase.purchaseNumber)}
            suppliers={supplierDemoData}
            products={products}
            onSave={saveDraft}
            onCancel={() => setEditingPurchase(undefined)}
          />
        )}

        {selectedPurchase && !editingPurchase && (
          <PurchaseDetails
            purchase={selectedPurchase}
            supplier={supplierDemoData.find((supplier) => supplier.id === selectedPurchase.supplierId)}
            onEdit={() => setEditingPurchase(selectedPurchase)}
          />
        )}

        <Card
          className="purchase-list-card"
          title="Purchase history"
          description={`${purchases.length} purchases in this demo view`}
        >
          <div className="purchase-list-filters">
            <label className="purchase-filter-field" htmlFor="purchase-search">
              <span>Search purchases</span>
              <input
                id="purchase-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Purchase number or supplier"
              />
            </label>
            <label className="purchase-filter-field" htmlFor="purchase-status-filter">
              <span>Status</span>
              <select
                id="purchase-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as PurchaseFilter)}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="posted">Posted</option>
              </select>
            </label>
            <span className="purchase-list-count">{filteredPurchases.length} shown</span>
          </div>

          {filteredPurchases.length === 0 ? (
            <EmptyState
              title={search || statusFilter !== "all" ? "No matching purchases" : "No purchases yet"}
              description={search || statusFilter !== "all" ? "Try a different search or status." : "Create a draft purchase to begin."}
              action={purchases.length === 0 ? <Button onClick={startNewDraft}>New purchase</Button> : undefined}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filteredPurchases}
              getRowKey={(purchase) => purchase.id}
              isLoading={false}
              loadingMessage="Loading purchases"
              emptyTitle="No purchases found"
              emptyDescription="Try a different search or status."
              rowLabel={(purchase) => `${purchase.purchaseNumber}, ${purchase.status}`}
            />
          )}
        </Card>
      </div>
    </PageContainer>
  );
}