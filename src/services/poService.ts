import type { PurchaseOrder } from "../types/purchaseOrder";

let purchaseOrders: PurchaseOrder[] = [];

export const poService = {
  async getAll(filters?: Partial<Pick<PurchaseOrder, "status" | "supplierId">>) {
    return purchaseOrders.filter((po) => (!filters?.status || po.status === filters.status) && (!filters?.supplierId || po.supplierId === filters.supplierId));
  },
  async getById(id: string) {
    const po = purchaseOrders.find((item) => item.id === id);
    if (!po) throw new Error("Purchase order not found");
    return po;
  },
  async create(data: PurchaseOrder) {
    purchaseOrders = [data, ...purchaseOrders];
    return data;
  },
  async update(id: string, data: Partial<PurchaseOrder>) {
    let updated: PurchaseOrder | undefined;
    purchaseOrders = purchaseOrders.map((po) => {
      if (po.id !== id) return po;
      updated = { ...po, ...data, updatedAt: new Date().toISOString() };
      return updated;
    });
    if (!updated) throw new Error("Purchase order not found");
    return updated;
  },
  async receiveGoods(poId: string, receivedItems: Array<{ itemId: string; receivedQty: number }>) {
    const receivedById = new Map(receivedItems.map((item) => [item.itemId, item.receivedQty]));
    await this.update(poId, {
      items: (await this.getById(poId)).items.map((item) => ({ ...item, receivedQty: item.receivedQty + (receivedById.get(item.id) ?? 0) })),
    });
  },
  async generatePONumber() {
    return `PO-${String(purchaseOrders.length + 1).padStart(4, "0")}`;
  },
  async cancel(id: string) {
    await this.update(id, { status: "cancelled" });
  },
};
