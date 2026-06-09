import { calculateEAN13Check, generateEAN13, isValidEAN13 } from "./barcodeGenerator";

export type ProductCodeRecord = {
  id: string;
  sku?: string;
  barcode?: string;
  category?: string;
};

function skuPrefix(categoryName: string) {
  return categoryName
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");
}

function generateEAN13WithSeed(seed: number) {
  const raw = `890${seed.toString().slice(-9).padStart(9, "0")}`;
  return `${raw}${calculateEAN13Check(raw)}`;
}

export function generateUniqueSKU(categoryName: string, products: ProductCodeRecord[], currentProductId?: string) {
  const prefix = skuPrefix(categoryName || "GEN");
  const existingSKUs = new Set(
    products
      .filter((product) => product.id !== currentProductId)
      .map((product) => product.sku?.trim().toUpperCase())
      .filter(Boolean),
  );

  for (let attempts = 0; attempts < 100; attempts += 1) {
    const number = Math.floor(Math.random() * 999999).toString().padStart(6, "0");
    const sku = `${prefix}-${number}`;
    if (!existingSKUs.has(sku)) return sku;
  }

  return `${prefix}-${Date.now().toString().slice(-6)}`;
}

export function generateUniqueBarcode(products: ProductCodeRecord[], currentProductId?: string) {
  const existingBarcodes = new Set(
    products
      .filter((product) => product.id !== currentProductId)
      .map((product) => product.barcode?.trim())
      .filter(Boolean),
  );

  for (let attempts = 0; attempts < 100; attempts += 1) {
    const candidate = generateEAN13();
    if (!existingBarcodes.has(candidate)) return candidate;
  }

  return generateEAN13WithSeed(Date.now());
}

export function isSKUUnique(sku: string, products: ProductCodeRecord[], currentProductId?: string) {
  const normalized = sku.trim().toUpperCase();
  return !products.some((product) => product.id !== currentProductId && product.sku?.trim().toUpperCase() === normalized);
}

export function isBarcodeUnique(barcode: string, products: ProductCodeRecord[], currentProductId?: string) {
  const normalized = barcode.trim();
  return !products.some((product) => product.id !== currentProductId && product.barcode?.trim() === normalized);
}

export function migrateProductCodes<T extends ProductCodeRecord>(products: T[]) {
  const usedSKUs = new Set<string>();
  const usedBarcodes = new Set<string>();
  let fixedCount = 0;

  const migrated = products.map((product) => {
    let sku = product.sku?.trim().toUpperCase() ?? "";
    let barcode = product.barcode?.trim() ?? "";
    let changed = false;

    if (!sku || usedSKUs.has(sku)) {
      sku = generateUniqueSKU(product.category || "GEN", [...products, ...Array.from(usedSKUs).map((used) => ({ id: used, sku: used }))], product.id);
      changed = true;
    }
    usedSKUs.add(sku);

    if (!barcode || !isValidEAN13(barcode) || usedBarcodes.has(barcode)) {
      do {
        barcode = generateUniqueBarcode([...products, ...Array.from(usedBarcodes).map((used) => ({ id: used, barcode: used }))], product.id);
      } while (usedBarcodes.has(barcode));
      changed = true;
    }
    usedBarcodes.add(barcode);

    if (changed) fixedCount += 1;
    return { ...product, sku, barcode };
  });

  return { products: migrated, fixedCount };
}

export { isValidEAN13 };
