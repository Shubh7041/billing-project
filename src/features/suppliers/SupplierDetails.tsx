import { Button, Card, StatusBadge } from "../../components/ui";
import type { Supplier } from "./supplierTypes";

interface SupplierDetailsProps {
  supplier: Supplier;
  onEdit: () => void;
  onClose: () => void;
}

export function SupplierDetails({ supplier, onEdit, onClose }: SupplierDetailsProps) {
  return (
    <Card
      className="supplier-details-card"
      title={supplier.name}
      description={supplier.contactPerson || "Supplier contact details"}
      headerAction={
        <div className="supplier-row-actions">
          <Button size="sm" onClick={onEdit}>Edit</Button>
          <Button size="sm" variant="outline" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <dl className="supplier-details-grid">
        <div><dt>Status</dt><dd><StatusBadge variant={supplier.isActive ? "success" : "neutral"}>{supplier.isActive ? "Active" : "Inactive"}</StatusBadge></dd></div>
        <div><dt>Phone</dt><dd>{supplier.phone || "Not provided"}</dd></div>
        <div><dt>Email</dt><dd>{supplier.email || "Not provided"}</dd></div>
        <div><dt>Tax registration ID</dt><dd>{supplier.taxRegistrationId || "Not provided"}</dd></div>
        <div className="supplier-details-address"><dt>Address</dt><dd>{supplier.address || "Not provided"}</dd></div>
      </dl>
    </Card>
  );
}