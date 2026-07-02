import type { ProductSerial } from "../types/productSerial";

export type SerialProduct = {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
};

function numericBase(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits || "0";
}

export function makeSerialBarcode(product: SerialProduct, sequence: number) {
  const base = numericBase(product.barcode || product.sku || product.id);
  const next = BigInt(base) + BigInt(Math.max(0, sequence - 1));
  return next.toString().padStart(base.length, "0");
}

export function generateSerialBarcodes(product: SerialProduct, quantity: number, existingCount = 0): ProductSerial[] {
  const count = Math.max(0, Math.floor(quantity));
  return Array.from({ length: count }, (_, index) => {
    const sequence = existingCount + index + 1;
    const serialNo = `${product.sku}-${String(sequence).padStart(4, "0")}`;
    return {
      id: crypto.randomUUID(),
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      barcode: makeSerialBarcode(product, sequence),
      serialNo,
      printed: false,
      createdAt: new Date().toISOString(),
    };
  });
}
