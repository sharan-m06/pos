import QRCode from "qrcode";

export interface PaymentSettings {
  upiId: string;
  merchantName: string;
  qrMode: "static" | "dynamic";
  printOnBill: boolean;
}

export const defaultPaymentSettings: PaymentSettings = {
  upiId: "",
  merchantName: "Retail Demo Store",
  qrMode: "dynamic",
  printOnBill: true,
};

export function buildUPILink(settings: PaymentSettings, amount?: number, invoiceId?: string) {
  if (!settings.upiId.trim()) return "";
  const params = new URLSearchParams({
    pa: settings.upiId.trim(),
    pn: settings.merchantName.trim() || "Retail Demo Store",
    cu: "INR",
  });
  if (settings.qrMode === "dynamic" && amount && amount > 0) params.set("am", amount.toFixed(2));
  if (invoiceId) params.set("tn", `Invoice ${invoiceId}`);
  return `upi://pay?${params.toString()}`;
}

export async function generateUPIQR(settings: PaymentSettings, amount?: number, invoiceId?: string) {
  const link = buildUPILink(settings, amount, invoiceId);
  if (!link) return "";
  return QRCode.toDataURL(link, { width: 180, margin: 1 });
}
