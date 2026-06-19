import type { LedgerEntry } from "../types/ledgerEntry";
import type { PurchaseBill } from "../types/purchaseBill";

type SaleForLedger = {
  id: string;
  date: string;
  total: number;
  gst?: number;
  payment: string;
  customerId?: string;
  customer: string;
};

type ExpenseForLedger = {
  id: string;
  date: string;
  amount: number;
  payment: string;
  paymentMode: string;
  category: string;
  description: string;
};

export function createSaleLedgerEntries(sale: SaleForLedger): Array<Omit<LedgerEntry, "id" | "balance">> {
  const now = new Date().toISOString();
  const paymentAccount = sale.payment.toLowerCase().includes("cash") ? "cash" : sale.payment.toLowerCase().includes("qr") || sale.payment.toLowerCase().includes("upi") || sale.payment.toLowerCase().includes("card") ? "upi" : "bank";
  const paymentName = paymentAccount === "cash" ? "Cash Account" : paymentAccount === "upi" ? "UPI/Card Account" : "Bank Account";
  const gst = sale.gst ?? 0;
  return [
    {
      date: sale.date,
      accountType: paymentAccount,
      accountName: paymentName,
      partyId: sale.customerId,
      description: `Sale ${sale.id}`,
      debit: sale.total,
      credit: 0,
      referenceId: sale.id,
      referenceType: "sale",
      createdAt: now,
    },
    {
      date: sale.date,
      accountType: "sales",
      accountName: "Sales Account",
      partyId: sale.customerId,
      description: `Sale ${sale.id}`,
      debit: gst,
      credit: sale.total,
      referenceId: sale.id,
      referenceType: "sale",
      createdAt: now,
    },
    {
      date: sale.date,
      accountType: "gst_output",
      accountName: "GST Output Account",
      partyId: sale.customerId,
      description: `GST on sale ${sale.id}`,
      debit: 0,
      credit: gst,
      referenceId: sale.id,
      referenceType: "sale",
      createdAt: now,
    },
  ];
}

export function createBillLedgerEntries(bill: PurchaseBill): Array<Omit<LedgerEntry, "id" | "balance">> {
  const now = new Date().toISOString();
  return [
    {
      date: bill.billDate,
      accountType: "purchases",
      accountName: "Purchases Account",
      description: `Purchase ${bill.billNo}`,
      debit: bill.subtotal,
      credit: 0,
      referenceId: bill.id,
      referenceType: "purchase_bill",
      createdAt: now,
    },
    {
      date: bill.billDate,
      accountType: "gst_input",
      accountName: "GST Input Account",
      description: `GST on purchase ${bill.billNo}`,
      debit: bill.totalGST,
      credit: 0,
      referenceId: bill.id,
      referenceType: "purchase_bill",
      createdAt: now,
    },
    {
      date: bill.billDate,
      accountType: "supplier",
      accountName: bill.supplierName,
      partyId: bill.supplierId,
      description: `Purchase ${bill.billNo}`,
      debit: 0,
      credit: bill.grandTotal,
      referenceId: bill.id,
      referenceType: "purchase_bill",
      createdAt: now,
    },
  ];
}

export function createBillPaymentLedgerEntries(bill: PurchaseBill, amount: number): Array<Omit<LedgerEntry, "id" | "balance">> {
  const now = new Date().toISOString();
  const paymentAccount = bill.paymentMode === "cash" ? "cash" : bill.paymentMode === "upi" ? "upi" : "bank";
  const paymentName = paymentAccount === "cash" ? "Cash Account" : paymentAccount === "upi" ? "UPI Account" : "Bank Account";
  return [
    {
      date: bill.paymentDate ?? now,
      accountType: "supplier",
      accountName: bill.supplierName,
      partyId: bill.supplierId,
      description: `Payment for ${bill.billNo}`,
      debit: amount,
      credit: 0,
      referenceId: bill.id,
      referenceType: "bill_payment",
      createdAt: now,
    },
    {
      date: bill.paymentDate ?? now,
      accountType: paymentAccount,
      accountName: paymentName,
      description: `Payment for ${bill.billNo}`,
      debit: 0,
      credit: amount,
      referenceId: bill.id,
      referenceType: "bill_payment",
      createdAt: now,
    },
  ];
}

export function createExpenseLedgerEntry(expense: ExpenseForLedger): Array<Omit<LedgerEntry, "id" | "balance">> {
  const now = new Date().toISOString();
  const paymentAccount = expense.paymentMode === "cash" ? "cash" : expense.paymentMode === "upi" ? "upi" : "bank";
  const paymentName = paymentAccount === "cash" ? "Cash Account" : paymentAccount === "upi" ? "UPI Account" : "Bank Account";
  return [
    {
      date: expense.date,
      accountType: "expenses",
      accountName: `${expense.category} Expense`,
      description: expense.description,
      debit: expense.amount,
      credit: 0,
      referenceId: expense.id,
      referenceType: "expense",
      createdAt: now,
    },
    {
      date: expense.date,
      accountType: paymentAccount,
      accountName: paymentName,
      description: expense.description,
      debit: 0,
      credit: expense.amount,
      referenceId: expense.id,
      referenceType: "expense",
      createdAt: now,
    },
  ];
}
