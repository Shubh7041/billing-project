import type { Supplier } from "./supplierTypes";

// Presentation fixtures only. There is no authorized supplier data-access API yet.
export const supplierDemoData: Supplier[] = [
  {
    id: "supplier-south-star",
    name: "South Star Crackers",
    contactPerson: "Ravi Kumar",
    phone: "+91 98765 43210",
    email: "sales@southstar.example",
    address: "Sivakasi, Tamil Nadu",
    taxRegistrationId: "",
    isActive: true,
  },
  {
    id: "supplier-bright-sky",
    name: "Bright Sky Fireworks",
    contactPerson: "Meena Raj",
    phone: "+91 91234 56780",
    email: "orders@brightsky.example",
    address: "Virudhunagar, Tamil Nadu",
    taxRegistrationId: "",
    isActive: true,
  },
  {
    id: "supplier-festival-traders",
    name: "Festival Traders",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    taxRegistrationId: "",
    isActive: false,
  },
];