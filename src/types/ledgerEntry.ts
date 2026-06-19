export type AccountType =
  | "cash"
  | "bank"
  | "upi"
  | "sales"
  | "purchases"
  | "expenses"
  | "supplier"
  | "customer"
  | "gst_output"
  | "gst_input"
  | "capital"
  | "drawings";

export interface LedgerEntry {
  id: string;
  date: string;
  accountType: AccountType;
  accountName: string;
  partyId?: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  referenceId: string;
  referenceType: "sale" | "purchase_bill" | "bill_payment" | "expense" | "opening" | "drawings";
  createdAt: string;
}

export interface AccountSummary {
  accountType: AccountType;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
}
