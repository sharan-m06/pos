export type UnitType = "piece" | "kg" | "meter" | "liter";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  gstRate: number;
  price: number;
  mrp?: number;
  description?: string;
  stock: number;
  costPrice?: number;
  unitType: UnitType;
  barcode: string;
}
