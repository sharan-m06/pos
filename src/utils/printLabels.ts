import { generateBarcodeSVG } from "./barcodeGenerator";

export type LabelSize = "small" | "medium" | "large";

export type LabelProduct = {
  name: string;
  sku: string;
  price: number;
  barcode?: string;
};

export type LabelConfig = {
  product: LabelProduct;
  copies: number;
  size: LabelSize;
};

const LABEL_DIMENSIONS: Record<LabelSize, { width: string; height: string; barcodeH: number; fontSize: number }> = {
  small: { width: "38mm", height: "25mm", barcodeH: 30, fontSize: 6 },
  medium: { width: "50mm", height: "30mm", barcodeH: 40, fontSize: 7 },
  large: { width: "70mm", height: "40mm", barcodeH: 55, fontSize: 8 },
};

function escapeLabel(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

export function printLabels(configs: LabelConfig[]) {
  const labels: string[] = [];

  for (const { product, copies, size } of configs) {
    const dim = LABEL_DIMENSIONS[size];
    const value = product.barcode || product.sku;
    let svgContent = "";

    try {
      svgContent = generateBarcodeSVG(value, { height: dim.barcodeH, displayValue: true, fontSize: dim.fontSize });
    } catch {
      svgContent = `<div style="font-size:${dim.fontSize}pt; color:#111827; text-align:center;">${escapeLabel(value)}</div>`;
    }

    for (let index = 0; index < copies; index += 1) {
      labels.push(`
        <div class="label" style="width:${dim.width}; height:${dim.height}; border:0.5px solid #ccc; padding:2mm; box-sizing:border-box; display:flex; flex-direction:column; align-items:center; justify-content:space-between; overflow:hidden; page-break-inside:avoid;">
          <div style="font-size:${dim.fontSize}pt; font-weight:700; text-align:center; width:100%; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${escapeLabel(product.name)}</div>
          <div style="width:100%; display:flex; justify-content:center;">${svgContent}</div>
          <div style="font-size:${Math.max(5, dim.fontSize - 1)}pt; color:#555; text-align:center;">SKU: ${escapeLabel(product.sku)} | Rs.${product.price.toFixed(2)}</div>
        </div>
      `);
    }
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Barcode Labels - RetailFlow</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: white; font-family: Arial, sans-serif; }
          .page { width: 210mm; min-height: 297mm; padding: 5mm; display: flex; flex-wrap: wrap; gap: 1mm; align-content: flex-start; }
          svg { max-width: 100%; height: auto; }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: A4; margin: 5mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="padding:16px; background:#f3f4f6; text-align:center;">
          <p style="margin-bottom:8px; color:#374151;">${labels.length} label(s) ready to print</p>
          <button onclick="window.print()" style="background:#2563eb; color:white; padding:10px 24px; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:600;">Print Now</button>
          <button onclick="window.close()" style="margin-left:8px; background:#f3f4f6; color:#374151; padding:10px 24px; border:1px solid #e5e7eb; border-radius:8px; cursor:pointer; font-size:14px;">Close</button>
        </div>
        <div class="page">${labels.join("")}</div>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (!printWindow) {
    window.alert("Please allow pop-ups to print barcode labels.");
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
}
