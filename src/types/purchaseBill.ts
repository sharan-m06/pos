export type BillStatus = "draft" | "confirmed" | "paid" | "partial_paid";
export type PurchaseBillPaymentMode = "cash" | "bank_transfer" | "upi" | "cheque" | "credit";
export type PurchaseBillPaymentStatus = "unpaid" | "partial" | "paid";
export type PurchaseBillPaidVia = "cash" | "bank_transfer" | "upi" | "cheque" | "card" | "";
export type PurchaseBillReminderFrequency = "once" | "daily" | "weekly";
export type PurchaseBillReminderChannel = "in_app" | "email" | "both";

export interface PurchaseBillItem {
  id: string;
  productId?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
  updateStock: boolean;
}

export interface PurchaseBill {
  id: string;
  billNo: string;
  supplierId?: string;
  supplierName: string;
  supplierGSTIN?: string;
  supplierInvoiceNo?: string;
  linkedPOId?: string;
  status: BillStatus;
  items: PurchaseBillItem[];
  subtotal: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGST: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  billDate: string;
  dueDate?: string;
  paymentMode?: PurchaseBillPaymentMode;
  paymentDate?: string;
  paymentStatus?: PurchaseBillPaymentStatus;
  paidVia?: PurchaseBillPaidVia;
  reminderEnabled?: boolean;
  remindOn?: string;
  reminderFreq?: PurchaseBillReminderFrequency;
  remindVia?: PurchaseBillReminderChannel;
  reminders?: Array<{ days: number; date: string; triggered: boolean }>;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface PayablesSummary {
  totalPayable: number;
  paidThisMonth: number;
  pendingBills: number;
  overdueBills: number;
}
