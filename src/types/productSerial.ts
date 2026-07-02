export interface ProductSerial {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  serialNo: string;
  printed: boolean;
  printedAt?: string;
  createdAt: string;
}

export interface ProductSerialBatch {
  productId: string;
  quantity: number;
  serials: ProductSerial[];
}
