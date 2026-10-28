import { useMemo, useState } from "react";
import { Building2, CheckCircle2, CircleAlert, Eye, Pencil, Plus, Search, X } from "lucide-react";
import { PageContainer } from "../../components/layout/PageContainer";
import { Button, Card, DataTable, EmptyState, Icon, StatusBadge } from "../../components/ui";
import type { DataTableColumn } from "../../components/ui";
import { CatalogDemoNotice } from "../catalog/CatalogDemoNotice";
import { SupplierDetails } from "./SupplierDetails";
import { SupplierForm } from "./SupplierForm";
import { supplierDemoData } from "./supplierDemoData";
import type { Supplier, SupplierInput } from "./supplierTypes";
import "./suppliers.css";

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState(supplierDemoData);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>();
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | undefined>();
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredSuppliers = useMemo(() => {
    const query = normalizeText(search);
    if (!query) return suppliers;
    return suppliers.filter((supplier) =>
      [supplier.name, supplier.contactPerson, supplier.phone, supplier.email, supplier.taxRegistrationId]
        .some((value) => normalizeText(value).includes(query)),
    );
  }, [search, suppliers]);

  function saveSupplier(input: SupplierInput) {
    if (editingSupplier) {
      setSuppliers((current) =>
        current.map((supplier) =>
          supplier.id === editingSupplier.id
            ? { ...supplier, ...input }
            : supplier,
        ),
      );
      setFeedback(`${input.name} was updated in this demo session.`);
    } else {
      const newSupplier = { id: crypto.randomUUID(), ...input };
      setSuppliers((current) => [newSupplier, ...current]);
      setFeedback(`${input.name} was added in this demo session.`);
    }

    setShowForm(false);
    setEditingSupplier(undefined);
    setSelectedSupplier(undefined);
  }

  function startEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setSelectedSupplier(undefined);
    setFeedback(null);
    setShowForm(true);
  }

  function toggleActive(supplier: Supplier) {
    if (supplier.isActive && !window.confirm(
      `Deactivate “${supplier.name}”? Existing purchase references will be preserved.`,
    )) return;

    setSuppliers((current) =>
      current.map((item) =>
        item.id === supplier.id ? { ...item, isActive: !item.isActive } : item,
      ),
    );
    setSelectedSupplier((selected) =>
      selected?.id === supplier.id
        ? { ...selected, isActive: !supplier.isActive }
        : selected,
    );
    setFeedback(`${supplier.name} was ${supplier.isActive ? "deactivated" : "activated"} in this demo session.`);
  }

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: "supplier",
      header: "Supplier",
      render: (supplier) => (
        <button
          className="supplier-name-button"
          type="button"
          onClick={() => setSelectedSupplier(supplier)}
        >
          <strong><Icon icon={Building2} size={15} />{supplier.name}</strong>
          {supplier.contactPerson && <span>{supplier.contactPerson}</span>}
        </button>
      ),
    },
    { key: "phone", header: "Phone", render: (supplier) => supplier.phone || "—" },
    { key: "email", header: "Email", render: (supplier) => supplier.email || "—" },
    {
      key: "status",
      header: "Status",
      render: (supplier) => (
        <StatusBadge variant={supplier.isActive ? "success" : "neutral"}>
          {supplier.isActive ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (supplier) => (
        <div className="supplier-row-actions">
          <Button size="sm" variant="ghost" onClick={() => setSelectedSupplier(supplier)}>
            <Icon icon={Eye} size={15} /> View
          </Button>
          <Button size="sm" variant="ghost" onClick={() => startEdit(supplier)}>
            <Icon icon={Pencil} size={15} /> Edit
          </Button>
          <Button size="sm" variant="outline" onClick={() => toggleActive(supplier)}>
            <Icon icon={supplier.isActive ? CircleAlert : CheckCircle2} size={15} />
            {supplier.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Suppliers"
      description="Manage supplier contact details for the store."
      actions={
        <Button
          onClick={() => {
            setEditingSupplier(undefined);
            setSelectedSupplier(undefined);
            setFeedback(null);
            setShowForm((current) => !current);
          }}
        >
          <Icon icon={showForm && !editingSupplier ? X : Plus} size={16} />
          {showForm && !editingSupplier ? "Close form" : "Add supplier"}
        </Button>
      }
    >
      <div className="suppliers-page">
        <CatalogDemoNotice />

        {feedback && <p className="supplier-feedback" role="status" aria-live="polite">{feedback}</p>}

        {showForm && (
          <SupplierForm
            key={editingSupplier?.id ?? "new-supplier"}
            supplier={editingSupplier}
            onSave={saveSupplier}
            onCancel={() => {
              setShowForm(false);
              setEditingSupplier(undefined);
            }}
          />
        )}

        {selectedSupplier && (
          <SupplierDetails
            supplier={suppliers.find((item) => item.id === selectedSupplier.id) ?? selectedSupplier}
            onEdit={() => startEdit(selectedSupplier)}
            onClose={() => setSelectedSupplier(undefined)}
          />
        )}

        <Card
          className="supplier-list-card"
          title="Supplier directory"
          description={`${suppliers.length} suppliers in this demo directory`}
        >
          <label className="supplier-search" htmlFor="supplier-search">
            <span><Icon icon={Search} size={15} /> Search suppliers</span>
            <input
              id="supplier-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, contact, phone, email, or tax ID"
            />
          </label>

          {filteredSuppliers.length === 0 ? (
            <EmptyState
              title={search ? "No matching suppliers" : "No suppliers yet"}
              description={search ? "Try a different search." : "Add a supplier to start the demo directory."}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filteredSuppliers}
              getRowKey={(supplier) => supplier.id}
              isLoading={false}
              loadingMessage="Loading suppliers"
              emptyTitle="No suppliers found"
              emptyDescription="Try a different search."
              rowLabel={(supplier) => `${supplier.name}, ${supplier.isActive ? "active" : "inactive"}`}
            />
          )}
        </Card>
      </div>
    </PageContainer>
  );
}