import type { ProductSerial } from "../types/productSerial";

const STORAGE_KEY = "retailflow-product-serials";

function read(): ProductSerial[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as ProductSerial[] : [];
  } catch {
    return [];
  }
}

function write(serials: ProductSerial[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serials));
}

export const productSerialService = {
  getAll() {
    return read();
  },
  getByProduct(productId: string) {
    return read().filter((serial) => serial.productId === productId);
  },
  add(serials: ProductSerial[]) {
    const next = [...serials, ...read()];
    write(next);
    return next;
  },
  markPrinted(ids: string[]) {
    const idSet = new Set(ids);
    const printedAt = new Date().toISOString();
    const next = read().map((serial) => idSet.has(serial.id) ? { ...serial, printed: true, printedAt } : serial);
    write(next);
    return next;
  },
};
