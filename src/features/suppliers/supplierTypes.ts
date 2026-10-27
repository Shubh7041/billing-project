export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxRegistrationId: string;
  isActive: boolean;
}

export type SupplierInput = Omit<Supplier, "id">;