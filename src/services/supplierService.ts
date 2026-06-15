import type { Supplier } from "../types/supplier";

let suppliers: Supplier[] = [];

export const supplierService = {
  async getAll() {
    return suppliers;
  },
  async getById(id: string) {
    const supplier = suppliers.find((item) => item.id === id);
    if (!supplier) throw new Error("Supplier not found");
    return supplier;
  },
  async create(data: Omit<Supplier, "id" | "createdAt" | "isActive">) {
    const supplier: Supplier = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString(), isActive: true };
    suppliers = [supplier, ...suppliers];
    return supplier;
  },
  async update(id: string, data: Partial<Supplier>) {
    let updated: Supplier | undefined;
    suppliers = suppliers.map((supplier) => {
      if (supplier.id !== id) return supplier;
      updated = { ...supplier, ...data };
      return updated;
    });
    if (!updated) throw new Error("Supplier not found");
    return updated;
  },
  async delete(id: string) {
    suppliers = suppliers.filter((supplier) => supplier.id !== id);
  },
};
