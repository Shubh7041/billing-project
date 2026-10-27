import { useState, type FormEvent } from "react";
import { Button, Card } from "../../components/ui";
import type { Supplier, SupplierInput } from "./supplierTypes";

type SupplierField = keyof SupplierInput;
type SupplierErrors = Partial<Record<SupplierField, string>>;

interface SupplierFormProps {
  supplier?: Supplier;
  onSave: (input: SupplierInput) => void;
  onCancel: () => void;
}

const emptySupplier: SupplierInput = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  taxRegistrationId: "",
  isActive: true,
};

export function SupplierForm({ supplier, onSave, onCancel }: SupplierFormProps) {
  const [values, setValues] = useState<SupplierInput>(() =>
    supplier ? { ...supplier } : { ...emptySupplier },
  );
  const [errors, setErrors] = useState<SupplierErrors>({});

  function updateField<K extends SupplierField>(key: K, value: SupplierInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized: SupplierInput = {
      name: values.name.trim(),
      contactPerson: values.contactPerson.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      address: values.address.trim(),
      taxRegistrationId: values.taxRegistrationId.trim(),
      isActive: values.isActive,
    };
    const nextErrors: SupplierErrors = {};

    if (!normalized.name) nextErrors.name = "Supplier name is required.";
    if (normalized.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (normalized.phone && !/^\+?[0-9\s().-]{7,20}$/.test(normalized.phone)) {
      nextErrors.phone = "Enter a phone number with 7–20 digits or common separators.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave(normalized);
  }

  return (
    <Card
      className="supplier-form-card"
      title={supplier ? "Edit supplier" : "Add supplier"}
      description="Supplier names may repeat; the database does not enforce name uniqueness."
    >
      <form className="supplier-form" onSubmit={handleSubmit} noValidate>
        <div className="supplier-form-grid">
          <div className="supplier-form-field">
            <label htmlFor="supplier-name">Supplier / business name *</label>
            <input
              id="supplier-name"
              name="name"
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              autoComplete="organization"
              required
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "supplier-name-error" : undefined}
            />
            {errors.name && <span className="supplier-field-error" id="supplier-name-error">{errors.name}</span>}
          </div>

          <div className="supplier-form-field">
            <label htmlFor="supplier-contact">Contact person (optional)</label>
            <input
              id="supplier-contact"
              name="contactPerson"
              value={values.contactPerson}
              onChange={(event) => updateField("contactPerson", event.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="supplier-form-field">
            <label htmlFor="supplier-phone">Phone (optional)</label>
            <input
              id="supplier-phone"
              name="phone"
              type="tel"
              value={values.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              autoComplete="tel"
              aria-invalid={errors.phone ? true : undefined}
              aria-describedby={errors.phone ? "supplier-phone-error" : undefined}
            />
            {errors.phone && <span className="supplier-field-error" id="supplier-phone-error">{errors.phone}</span>}
          </div>

          <div className="supplier-form-field">
            <label htmlFor="supplier-email">Email (optional)</label>
            <input
              id="supplier-email"
              name="email"
              type="email"
              value={values.email}
              onChange={(event) => updateField("email", event.target.value)}
              autoComplete="email"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "supplier-email-error" : undefined}
            />
            {errors.email && <span className="supplier-field-error" id="supplier-email-error">{errors.email}</span>}
          </div>

          <div className="supplier-form-field supplier-form-field-wide">
            <label htmlFor="supplier-address">Address (optional)</label>
            <textarea
              id="supplier-address"
              name="address"
              rows={3}
              value={values.address}
              onChange={(event) => updateField("address", event.target.value)}
              autoComplete="street-address"
            />
          </div>

          <div className="supplier-form-field">
            <label htmlFor="supplier-tax-id">Tax registration identifier (optional)</label>
            <input
              id="supplier-tax-id"
              name="taxRegistrationId"
              value={values.taxRegistrationId}
              onChange={(event) => updateField("taxRegistrationId", event.target.value)}
              autoComplete="off"
            />
            <span className="supplier-field-help">No tax format is enforced by the current schema.</span>
          </div>
        </div>

        <label className="supplier-checkbox-field">
          <input
            type="checkbox"
            checked={values.isActive}
            onChange={(event) => updateField("isActive", event.target.checked)}
          />
          <span>Active supplier</span>
        </label>

        <div className="supplier-form-actions">
          <Button type="submit">{supplier ? "Save changes" : "Add supplier"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}