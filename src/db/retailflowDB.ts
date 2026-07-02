import Dexie, { type Table } from "dexie";
import type { Product } from "../types/product";
import type { PurchaseBill } from "../types/purchaseBill";
import type { PurchaseOrder } from "../types/purchaseOrder";
import type { StockMovement } from "../types/stockMovement";
import type { ProductSerial } from "../types/productSerial";

export interface OfflineQueueItem {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  syncedAt?: string;
}

export class RetailFlowDB extends Dexie {
  products!: Table<Product, string>;
  purchaseBills!: Table<PurchaseBill, string>;
  purchaseOrders!: Table<PurchaseOrder, string>;
  stockMovements!: Table<StockMovement, string>;
  productSerials!: Table<ProductSerial, string>;
  offlineQueue!: Table<OfflineQueueItem, string>;

  constructor() {
    super("RetailFlowDB");
    this.version(1).stores({
      products: "id, sku, barcode, category",
      purchaseBills: "id, billNo, status, supplierId, billDate",
      purchaseOrders: "id, status, supplierId, orderDate",
      stockMovements: "id, productId, referenceId, referenceType, date",
      productSerials: "id, productId, barcode, printed",
      offlineQueue: "id, type, createdAt, syncedAt",
    });
  }
}

export const retailflowDB = new RetailFlowDB();
