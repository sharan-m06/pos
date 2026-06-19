import type { Product } from "../types/product";
import type { PurchaseOrder } from "../types/purchaseOrder";
import type { PayablesSummary, PurchaseBill, PurchaseBillPaymentMode } from "../types/purchaseBill";
import type { StockMovement } from "../types/stockMovement";
import { createBillLedgerEntries, createBillPaymentLedgerEntries } from "../utils/createLedgerEntries";

let purchaseBills: PurchaseBill[] = [];

export const purchaseBillService = {
  seed(items: PurchaseBill[]) {
    purchaseBills = items;
  },
  async getAll(filters?: { status?: PurchaseBill["status"] | "all" }) {
    return purchaseBills.filter((bill) => !filters?.status || filters.status === "all" || bill.status === filters.status);
  },
  async getById(id: string) {
    const bill = purchaseBills.find((item) => item.id === id);
    if (!bill) throw new Error("Purchase bill not found");
    return bill;
  },
  async create(data: PurchaseBill) {
    purchaseBills = [data, ...purchaseBills];
    return data;
  },
  async createFromPO(po: PurchaseOrder) {
    const bill = purchaseBillFromPO(po, await this.generateBillNumber());
    return this.create(bill);
  },
  async update(id: string, data: Partial<PurchaseBill>) {
    let updated: PurchaseBill | undefined;
    purchaseBills = purchaseBills.map((bill) => {
      if (bill.id !== id) return bill;
      updated = { ...bill, ...data };
      return updated;
    });
    if (!updated) throw new Error("Purchase bill not found");
    return updated;
  },
  async confirmBill(id: string) {
    const bill = await this.getById(id);
    const status = bill.balanceDue <= 0 ? "paid" : bill.amountPaid > 0 ? "partial_paid" : "confirmed";
    await this.update(id, { status });
    return createBillLedgerEntries(bill);
  },
  async markPaid(id: string, payment: { amount: number; paymentMode: PurchaseBillPaymentMode; paymentDate: string }) {
    const bill = await this.getById(id);
    const amountPaid = Math.min(bill.grandTotal, bill.amountPaid + payment.amount);
    const balanceDue = Math.max(0, bill.grandTotal - amountPaid);
    const status = balanceDue <= 0 ? "paid" : "partial_paid";
    const updated = await this.update(id, { amountPaid, balanceDue, status, paymentMode: payment.paymentMode, paymentDate: payment.paymentDate });
    return createBillPaymentLedgerEntries(updated, payment.amount);
  },
  async delete(id: string) {
    purchaseBills = purchaseBills.filter((item) => item.id !== id);
  },
  async generateBillNumber() {
    return `BILL-${String(purchaseBills.length + 1).padStart(4, "0")}`;
  },
  async getPayablesSummary(): Promise<PayablesSummary> {
    const now = new Date();
    return purchaseBills.reduce<PayablesSummary>((summary, bill) => {
      const paidDate = bill.paymentDate ? new Date(bill.paymentDate) : null;
      summary.totalPayable += bill.balanceDue;
      summary.pendingBills += bill.balanceDue > 0 ? 1 : 0;
      summary.overdueBills += bill.balanceDue > 0 && bill.dueDate && new Date(bill.dueDate) < now ? 1 : 0;
      summary.paidThisMonth += paidDate && paidDate.getMonth() === now.getMonth() && paidDate.getFullYear() === now.getFullYear() ? bill.amountPaid : 0;
      return summary;
    }, { totalPayable: 0, paidThisMonth: 0, pendingBills: 0, overdueBills: 0 });
  },
};

export function applyPurchaseBillStock(products: Product[], bill: PurchaseBill) {
  const movements: StockMovement[] = [];
  const nextProducts = products.map((product) => {
    const billItems = bill.items.filter((item) => item.updateStock && item.productId === product.id);
    if (!billItems.length) return product;
    const addedQty = billItems.reduce((sum, item) => sum + item.quantity, 0);
    const unitCost = billItems[billItems.length - 1]?.unitCost ?? product.costPrice;
    const stock = product.stock + addedQty;
    movements.push(...billItems.map((item) => ({
      id: `SM-${bill.id}-${item.id}`,
      productId: product.id,
      productName: product.name,
      type: "purchase" as const,
      quantity: item.quantity,
      balanceAfter: stock,
      referenceId: bill.id,
      referenceType: "purchase_bill" as const,
      date: new Date().toISOString(),
      notes: `Purchase ${bill.billNo}`,
      createdBy: bill.createdBy,
    })));
    return { ...product, stock, costPrice: unitCost };
  });
  return { products: nextProducts, movements };
}

function purchaseBillFromPO(po: PurchaseOrder, billNo: string): PurchaseBill {
  return {
    id: crypto.randomUUID(),
    billNo,
    supplierId: po.supplierId,
    supplierName: po.supplierName,
    supplierGSTIN: po.supplierGSTIN,
    linkedPOId: po.id,
    status: "draft",
    items: po.items.map((item) => ({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.receivedQty || item.orderedQty,
      unit: "piece",
      unitCost: item.unitCost,
      gstRate: item.gstRate,
      cgst: item.cgst,
      sgst: item.sgst,
      igst: item.igst,
      lineTotal: item.lineTotal,
      updateStock: true,
    })),
    subtotal: po.subtotal,
    totalCGST: po.totalCGST,
    totalSGST: po.totalSGST,
    totalIGST: po.totalIGST,
    totalGST: po.totalGST,
    grandTotal: po.grandTotal,
    amountPaid: 0,
    balanceDue: po.grandTotal,
    billDate: new Date().toISOString(),
    notes: `Imported from ${po.id}`,
    createdBy: po.createdBy,
    createdAt: new Date().toISOString(),
  };
}
