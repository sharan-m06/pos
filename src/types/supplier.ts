export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  paymentTerms?: "Immediate" | "Net 7" | "Net 15" | "Net 30";
  notes?: string;
  createdAt: string;
  isActive: boolean;
}
