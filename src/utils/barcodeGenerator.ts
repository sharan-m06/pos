import JsBarcode from "jsbarcode";

export type BarcodeFormat = "CODE128" | "EAN13" | "EAN8";

export function calculateEAN13Check(digits12: string) {
  let sum = 0;
  for (let index = 0; index < 12; index += 1) {
    sum += Number.parseInt(digits12[index] ?? "0", 10) * (index % 2 === 0 ? 1 : 3);
  }
  return String((10 - (sum % 10)) % 10);
}

export function generateEAN13() {
  const prefix = "890";
  const middle = Math.floor(Math.random() * 999999999).toString().padStart(9, "0");
  const raw = `${prefix}${middle}`;
  return `${raw}${calculateEAN13Check(raw)}`;
}

export function isValidEAN13(code: string) {
  return /^\d{13}$/.test(code) && calculateEAN13Check(code.slice(0, 12)) === code[12];
}

export function barcodeFormatFor(value: string): BarcodeFormat {
  if (/^\d{13}$/.test(value) && isValidEAN13(value)) return "EAN13";
  if (/^\d{8}$/.test(value)) return "EAN8";
  return "CODE128";
}

export function generateBarcodeSVG(value: string, options?: {
  format?: BarcodeFormat;
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
}) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, value, {
    format: options?.format ?? barcodeFormatFor(value),
    width: options?.width ?? 2,
    height: options?.height ?? 60,
    fontSize: options?.fontSize ?? 12,
    displayValue: options?.displayValue ?? true,
    margin: 8,
    background: "#ffffff",
    lineColor: "#000000",
  });
  return svg.outerHTML;
}
