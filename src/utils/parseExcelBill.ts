import * as XLSX from "xlsx";
import type { Product } from "../types/product";
import type { StockMovement } from "../types/stockMovement";
import { generateUniqueBarcode, generateUniqueSKU } from "./generateProductCodes";

export interface ParsedExcelProductRow {
  productName: string;
  sku?: string;
  category?: string;
  unit?: string;
  quantity: number;
  unitCost: number;
  gstRate: number;
  sellingPrice?: number;
}

export async function parseExcelBill(file: File): Promise<ParsedExcelProductRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return rows.map((row) => {
    const key = (names: string[]) => names.map((name) => row[name]).find((value) => value !== undefined && value !== "");
    return {
      productName: String(key(["Product Name", "Product", "Name"]) || "").trim(),
      sku: String(key(["SKU", "Sku"]) || "").trim() || undefined,
      category: String(key(["Category"]) || "Uncategorized").trim(),
      unit: String(key(["Unit", "Unit Type"]) || "piece").trim(),
      quantity: Number(key(["Quantity", "Qty"]) || 0),
      unitCost: Number(key(["Unit Cost", "Cost", "Purchase Price"]) || 0),
      gstRate: Number(key(["GST", "GST %", "GST Rate"]) || 0),
      sellingPrice: Number(key(["Selling Price", "Price", "MRP"]) || 0) || undefined,
    };
  }).filter((row) => row.productName && row.quantity > 0);
}

export function makeExcelTemplate() {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet([
    { "Product Name": "Premium Cotton T-Shirt", SKU: "TS-001", Category: "Apparel", "Unit Type": "piece", Quantity: 10, "Unit Cost": 18, "GST %": 5, "Selling Price": 31.49 },
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Products");
  XLSX.writeFile(workbook, "retailflow-inventory-template.xlsx");
}

function unitType(value?: string): Product["unitType"] {
  const unit = (value || "").toLowerCase();
  if (unit.includes("kg")) return "kg";
  if (unit.includes("meter") || unit === "m") return "meter";
  if (unit.includes("lit") || unit === "l") return "liter";
  return "piece";
}

export function applyExcelRowsToProducts(products: Product[], rows: ParsedExcelProductRow[], createdBy = "Excel Import") {
  const movements: StockMovement[] = [];
  let created = 0;
  let updated = 0;
  const next = [...products];

  rows.forEach((row) => {
    const existingIndex = next.findIndex((product) =>
      (row.sku && product.sku.toLowerCase() === row.sku.toLowerCase()) ||
      product.name.toLowerCase() === row.productName.toLowerCase()
    );
    if (existingIndex >= 0) {
      const product = next[existingIndex];
      const stock = product.stock + row.quantity;
      next[existingIndex] = { ...product, stock, costPrice: row.unitCost, gstRate: row.gstRate || product.gstRate };
      movements.push({
        id: `SM-XL-${crypto.randomUUID()}`,
        productId: product.id,
        productName: product.name,
        type: "purchase",
        quantity: row.quantity,
        balanceAfter: stock,
        referenceId: "excel-import",
        referenceType: "adjustment",
        date: new Date().toISOString(),
        notes: "Excel inventory import",
        createdBy,
      });
      updated += 1;
      return;
    }

    const id = crypto.randomUUID();
    const product: Product = {
      id,
      name: row.productName,
      sku: row.sku || generateUniqueSKU(row.category || "GEN", next, id),
      category: row.category || "Uncategorized",
      gstRate: row.gstRate,
      price: row.sellingPrice || Math.round(row.unitCost * 1.3 * 100) / 100,
      stock: row.quantity,
      costPrice: row.unitCost,
      unitType: unitType(row.unit),
      barcode: generateUniqueBarcode(next, id),
    };
    next.push(product);
    movements.push({
      id: `SM-XL-${crypto.randomUUID()}`,
      productId: product.id,
      productName: product.name,
      type: "purchase",
      quantity: row.quantity,
      balanceAfter: row.quantity,
      referenceId: "excel-import",
      referenceType: "adjustment",
      date: new Date().toISOString(),
      notes: "Excel inventory import",
      createdBy,
    });
    created += 1;
  });

  return { products: next, movements, created, updated };
}
