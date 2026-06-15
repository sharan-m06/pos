export type POStatus = "draft" | "sent" | "received" | "partial" | "cancelled";

export interface POItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  orderedQty: number;
  receivedQty: number;
  unitCost: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  supplierGSTIN?: string;
  status: POStatus;
  items: POItem[];
  subtotal: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  totalGST: number;
  grandTotal: number;
  orderDate: string;
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
