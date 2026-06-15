export type ExpenseCategory =
  | "rent"
  | "utilities"
  | "salary"
  | "inventory"
  | "marketing"
  | "maintenance"
  | "transport"
  | "miscellaneous"
  | "other";

export type PaymentMode = "cash" | "bank_transfer" | "upi" | "card" | "cheque";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMode: PaymentMode;
  vendor?: string;
  date: string;
  receiptNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}
