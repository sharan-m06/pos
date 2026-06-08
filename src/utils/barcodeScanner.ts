export type ScannerMethod = "barcode-detector" | "zxing" | "unsupported";

export function getScannerMethod(): ScannerMethod {
  if (typeof window !== "undefined" && "BarcodeDetector" in window) return "barcode-detector";
  if (typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function") return "zxing";
  return "unsupported";
}

export async function requestCameraPermission() {
  try {
    if (typeof navigator === "undefined" || typeof navigator.mediaDevices?.getUserMedia !== "function") return false;
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad/i.test(navigator.userAgent);
}
