export type MovementType = "sale" | "purchase" | "adjustment" | "return" | "damage";

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  referenceId: string;
  referenceType: "sale" | "purchase_order" | "purchase_bill" | "adjustment" | "return" | "damage";
  date: string;
  notes?: string;
  createdBy?: string;
}
