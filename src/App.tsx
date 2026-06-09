import React, { createContext, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Navigate,
  NavLink,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  AlertTriangle,
  BarChart3,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Edit,
  Eye,
  IndianRupee,
  Lock,
  LogOut,
  Mail,
  PackagePlus,
  Pencil,
  Percent,
  Plus,
  ScanBarcode,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser/cjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";
import { generateBarcodeSVG } from "./utils/barcodeGenerator";
import { getScannerMethod, isMobileBrowser } from "./utils/barcodeScanner";
import { generateUniqueBarcode, generateUniqueSKU, isBarcodeUnique, isSKUUnique, isValidEAN13, migrateProductCodes } from "./utils/generateProductCodes";
import { LabelSize, printLabels } from "./utils/printLabels";

type UnitType = "piece" | "kg" | "meter" | "liter";
type StaffRole = "Owner" | "Manager" | "Salesperson" | "Cashier";
type AttendanceStatus = "present" | "absent" | "half-day" | "late" | "leave";
type BarcodeDetectorResult = { rawValue: string };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<BarcodeDetectorResult[]>;
};

function safeBarcodeSVG(value: string, options?: Parameters<typeof generateBarcodeSVG>[1]) {
  try {
    return generateBarcodeSVG(value, options);
  } catch {
    return "";
  }
}

type Product = {
  id: string;
  name: string;
  sku: string;
  category: string;
  gstRate: number;
  price: number;
  stock: number;
  unitType: UnitType;
  barcode: string;
};

type ToastState = {
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type StandardLine = {
  id: string;
  type: "standard";
  product: Product;
  qty: number;
};

type FabricLine = {
  id: string;
  type: "fabric";
  product: Product;
  pieces: number;
  lengthPerPiece: number;
  unit: "m" | "yd";
  totalMeters: number;
};

type OrderLine = StandardLine | FabricLine;
type EditableOrderLine = OrderLine & { rowState?: "new" | "returned" };

type Invoice = {
  id: string;
  date: string;
  customer: string;
  items: string;
  total: number;
  gst: number;
  payment: string;
  status: "Completed" | "Refunded";
  staff: string;
  salespersonId: string;
  salespersonName: string;
  lines?: OrderLine[];
  discount?: number;
};

type AttendanceRecord = {
  id: string;
  staffId: string;
  staffName: string;
  date: string;
  status: AttendanceStatus;
  checkInTime?: string;
  checkOutTime?: string;
  hoursWorked?: number;
  notes?: string;
  markedBy: string;
  markedAt: string;
  updatedAt?: string;
};

type PaymentMethod = "Card" | "Cash" | "QR Code";

type Expense = {
  id: string;
  date: string;
  category: string;
  vendor: string;
  amount: number;
  payment: string;
};

type AuditEvent = {
  id: string;
  time: string;
  user: string;
  area: string;
  action: string;
  severity: "Info" | "Warning" | "Critical";
};

type Customer = {
  name: string;
  email: string;
  phone: string;
  spent: number;
  lastVisit: string;
};

type Staff = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  isCurrent?: boolean;
};

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const seedProducts: Product[] = migrateProductCodes([
  { id: "p1", name: "Premium Cotton T-Shirt", sku: "TS-001", category: "Apparel", gstRate: 5, price: 29.99, stock: 45, unitType: "piece" },
  { id: "p2", name: "Slim Fit Jeans", sku: "JN-002", category: "Apparel", gstRate: 5, price: 59.99, stock: 28, unitType: "piece" },
  { id: "p3", name: "Running Sneakers", sku: "SN-003", category: "Footwear", gstRate: 12, price: 89.99, stock: 12, unitType: "piece" },
  { id: "p4", name: "Leather Wallet", sku: "WL-004", category: "Accessories", gstRate: 12, price: 34.99, stock: 15, unitType: "piece" },
  { id: "p5", name: "Sunglasses", sku: "SG-005", category: "Accessories", gstRate: 18, price: 129.99, stock: 8, unitType: "piece" },
  { id: "p6", name: "Wool Sweater", sku: "SW-006", category: "Apparel", gstRate: 5, price: 79.99, stock: 20, unitType: "piece" },
  { id: "p7", name: "Organic Almonds", sku: "GR-007", category: "Groceries", gstRate: 0, price: 12.5, stock: 50, unitType: "kg" },
  { id: "p8", name: "Basmati Rice", sku: "GR-008", category: "Groceries", gstRate: 0, price: 4.25, stock: 100, unitType: "kg" },
  { id: "p9", name: "Ethernet Cable", sku: "CB-009", category: "Electronics", gstRate: 18, price: 0.5, stock: 500, unitType: "meter" },
  { id: "p10", name: "Olive Oil", sku: "OL-010", category: "Groceries", gstRate: 0, price: 15, stock: 30, unitType: "liter" },
  { id: "p11", name: "Cotton Fabric", sku: "CF-011", category: "Apparel", gstRate: 5, price: 120, stock: 200, unitType: "meter" },
]).products as Product[];

const weeklyData = [
  { day: "Mon", revenue: 900 },
  { day: "Tue", revenue: 700 },
  { day: "Wed", revenue: 1600 },
  { day: "Thu", revenue: 950 },
  { day: "Fri", revenue: 2400 },
  { day: "Sat", revenue: 3100 },
  { day: "Sun", revenue: 1700 },
];

const monthlyData = [
  { month: "Jan", revenue: 12500 },
  { month: "Feb", revenue: 14800 },
  { month: "Mar", revenue: 17100 },
  { month: "Apr", revenue: 19600 },
  { month: "May", revenue: 22400 },
  { month: "Jun", revenue: 25800 },
];

function displayDateTime(date: Date) {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function offsetDate(days: number, hours: number, minutes: number) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  date.setDate(date.getDate() + days);
  return displayDateTime(date);
}

const seedInvoices: Invoice[] = [
  { id: "INV-0001", date: offsetDate(0, 10, 30), customer: "Walk-in", items: "2 items", total: 119.98, gst: 5.72, payment: "Card", status: "Completed", staff: "Admin Owner", salespersonId: "s1", salespersonName: "Admin Owner" },
  { id: "INV-0002", date: offsetDate(0, 11, 15), customer: "Walk-in", items: "1 items", total: 89.99, gst: 9.64, payment: "Cash", status: "Completed", staff: "Jane Cashier", salespersonId: "s3", salespersonName: "Jane Cashier" },
  { id: "INV-0003", date: offsetDate(0, 14, 45), customer: "Walk-in", items: "1 items", total: 259.97, gst: 27.85, payment: "Card", status: "Completed", staff: "Store Manager", salespersonId: "s2", salespersonName: "Store Manager" },
  { id: "INV-0004", date: offsetDate(-1, 9, 20), customer: "Walk-in", items: "1 items", total: 29.99, gst: 1.43, payment: "Qr", status: "Refunded", staff: "Jane Cashier", salespersonId: "s3", salespersonName: "Jane Cashier" },
];

const seedExpenses: Expense[] = [
  { id: "EXP-001", date: "Jun 5, 2026 9:10 AM", category: "Inventory", vendor: "Supplier Hub", amount: 420, payment: "Bank" },
  { id: "EXP-002", date: "Jun 5, 2026 2:20 PM", category: "Utilities", vendor: "Power Board", amount: 72.5, payment: "Cash" },
  { id: "EXP-003", date: "Jun 3, 2026 11:05 AM", category: "Packaging", vendor: "CarryBag Co", amount: 118.75, payment: "UPI" },
  { id: "EXP-004", date: "May 30, 2026 4:45 PM", category: "Maintenance", vendor: "POS Service", amount: 95, payment: "Card" },
];

const seedAuditEvents: AuditEvent[] = [
  { id: "AUD-001", time: "Jun 5, 2026 12:15 PM", user: "Admin Owner", area: "Sales", action: "Created invoice and printed bill", severity: "Info" },
  { id: "AUD-002", time: "Jun 5, 2026 10:40 AM", user: "Store Manager", area: "Inventory", action: "Updated Sunglasses stock level", severity: "Warning" },
  { id: "AUD-003", time: "Jun 4, 2026 6:05 PM", user: "Jane Cashier", area: "Payments", action: "Marked invoice INV-0004 as refunded", severity: "Critical" },
  { id: "AUD-004", time: "Jun 3, 2026 9:30 AM", user: "Admin Owner", area: "Staff", action: "Reviewed cashier access", severity: "Info" },
];

const seedCustomers: Customer[] = [
  { name: "Alice Johnson", email: "alice@example.com", phone: "555-0101", spent: 1250.5, lastVisit: "10/15/2023" },
  { name: "Bob Smith", email: "bob@example.com", phone: "555-0102", spent: 450, lastVisit: "10/20/2023" },
  { name: "Charlie Brown", email: "charlie@example.com", phone: "555-0103", spent: 89.99, lastVisit: "10/22/2023" },
];

const seedStaff: Staff[] = [
  { id: "s1", name: "Admin Owner", email: "owner@retailflow.com", role: "Owner", isCurrent: true },
  { id: "s2", name: "Store Manager", email: "manager@retailflow.com", role: "Manager" },
  { id: "s3", name: "Jane Cashier", email: "cashier@retailflow.com", role: "Cashier" },
];

type AppState = {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  customers: Customer[];
  staff: Staff[];
  setStaff: React.Dispatch<React.SetStateAction<Staff[]>>;
  attendance: AttendanceRecord[];
  setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  order: OrderLine[];
  setOrder: React.Dispatch<React.SetStateAction<OrderLine[]>>;
  toast: ToastState | null;
  showToast: (message: string, action?: ToastState["action"]) => void;
};

const AppContext = createContext<AppState | null>(null);
const useApp = () => {
  const ctx = React.use(AppContext);
  if (!ctx) throw new Error("AppContext missing");
  return ctx;
};

function amountForLine(line: OrderLine) {
  const base = line.type === "standard" ? line.product.price * line.qty : line.product.price * line.totalMeters;
  const gst = base * (line.product.gstRate / 100);
  return { base, gst, total: base + gst };
}

function amountForProduct(product: Product) {
  const gst = product.price * (product.gstRate / 100);
  return { base: product.price, gst, total: product.price + gst };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] ?? char));
}

function receiptMoney(value: number) {
  return `Rs ${value.toFixed(2)}`;
}

function buildThermalReceipt(invoice: Invoice) {
  const lines = invoice.lines ?? [];
  const subtotal = lines.reduce((sum, line) => sum + amountForLine(line).base, 0);
  const itemRows = lines.flatMap((line) => {
    const amount = amountForLine(line);
    const qty = line.type === "fabric" ? `${line.pieces} pcs x ${line.lengthPerPiece}${line.unit}` : `${line.qty} ${unitLabel(line.product.unitType)}`;
    return [
      line.product.name,
      `  ${line.product.sku} / ${qty}`,
      `  ${receiptMoney(amount.total)}`,
    ];
  });

  return [
    "        Retail Demo Store",
    "           Tax Invoice",
    "--------------------------------",
    `Invoice : ${invoice.id}`,
    `Date    : ${invoice.date}`,
    `Customer: ${invoice.customer}`,
    `Payment : ${invoice.payment}`,
    "--------------------------------",
    ...itemRows,
    "--------------------------------",
    `Subtotal      ${receiptMoney(subtotal)}`,
    `Total GST     ${receiptMoney(invoice.gst)}`,
    ...(invoice.discount ? [`Discount      -${receiptMoney(invoice.discount)}`] : []),
    `Total Payable ${receiptMoney(invoice.total)}`,
    "--------------------------------",
    "      Thank you. Visit again.",
    "",
    "",
  ].join("\n");
}

async function printInvoice(invoice: Invoice) {
  const usb = (navigator as Navigator & { usb?: any }).usb;
  if (!usb) {
    window.alert("Direct bill printing needs a WebUSB thermal printer. This browser cannot print directly without showing print preview.");
    return false;
  }

  try {
    const device = await usb.requestDevice({ filters: [] });
    await device.open();
    if (!device.configuration) await device.selectConfiguration(1);

    const iface = device.configuration.interfaces.find((usbInterface: any) =>
      usbInterface.alternates.some((alternate: any) =>
        alternate.endpoints.some((endpoint: any) => endpoint.direction === "out")
      )
    );
    const alternate = iface?.alternates.find((item: any) => item.endpoints.some((endpoint: any) => endpoint.direction === "out"));
    const endpoint = alternate?.endpoints.find((item: any) => item.direction === "out");
    if (!iface || !endpoint) throw new Error("No writable printer endpoint found");

    if (alternate.alternateSetting) await device.selectAlternateInterface(iface.interfaceNumber, alternate.alternateSetting);
    await device.claimInterface(iface.interfaceNumber);

    const encoder = new TextEncoder();
    const init = [0x1b, 0x40];
    const cut = [0x1d, 0x56, 0x00];
    const receipt = encoder.encode(buildThermalReceipt(invoice));
    const payload = new Uint8Array(init.length + receipt.length + cut.length);
    payload.set(init, 0);
    payload.set(receipt, init.length);
    payload.set(cut, init.length + receipt.length);

    await device.transferOut(endpoint.endpointNumber, payload);
    await device.releaseInterface(iface.interfaceNumber).catch(() => undefined);
    await device.close().catch(() => undefined);
    return true;
  } catch (error) {
    console.warn("Direct bill print failed", error);
    window.alert("Direct bill print was cancelled or the thermal printer was not available.");
    return false;
  }
}

function unitLabel(unitType: UnitType) {
  return unitType === "piece" ? "piece" : unitType === "kg" ? "kg" : unitType === "meter" ? "m" : "L";
}

function dateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function longDate(value = new Date()) {
  return value.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function invoiceTime(invoice: Invoice) {
  const date = new Date(invoice.date);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type DateRangeMode = "today" | "week" | "month" | "custom";

function dateInputKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return dateKey(new Date().toISOString());
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function rangeBounds(mode: DateRangeMode, customFrom: string, customTo: string) {
  const now = new Date();
  if (mode === "week") {
    const from = startOfDay(now);
    from.setDate(now.getDate() - now.getDay() + 1);
    const to = endOfDay(new Date(from));
    to.setDate(from.getDate() + 6);
    return { from, to };
  }
  if (mode === "month") {
    return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
  }
  if (mode === "custom") return { from: startOfDay(new Date(customFrom)), to: endOfDay(new Date(customTo)) };
  return { from: startOfDay(now), to: endOfDay(now) };
}

function hoursBetween(checkIn?: string, checkOut?: string) {
  if (!checkIn || !checkOut) return undefined;
  const [inH, inM] = checkIn.split(":").map(Number);
  const [outH, outM] = checkOut.split(":").map(Number);
  const diff = (outH * 60 + outM - (inH * 60 + inM)) / 60;
  return diff >= 0 ? Number(diff.toFixed(2)) : undefined;
}

function statusLabel(status: AttendanceStatus) {
  return status === "half-day" ? "Half Day" : status === "late" ? "Late" : status === "leave" ? "Leave" : status === "absent" ? "Absent" : "Present";
}

function statusShort(status: AttendanceStatus) {
  return status === "half-day" ? "H" : status === "leave" ? "Le" : status[0].toUpperCase();
}

function staffInitials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function salesCsv(invoices: Invoice[]) {
  const headers = ["Invoice", "Date", "Customer", "Items", "Total", "GST", "Payment", "Status", "Staff"];
  const rows = invoices.map((invoice) => [
    invoice.id,
    invoice.date,
    invoice.customer,
    invoice.items,
    invoice.total.toFixed(2),
    invoice.gst.toFixed(2),
    invoice.payment,
    invoice.status,
    invoice.staff,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function salesPdfHtml(invoices: Invoice[]) {
  const rows = invoices.map((invoice) => `
    <tr>
      <td>${escapeHtml(invoice.id)}</td>
      <td>${escapeHtml(invoice.date)}</td>
      <td>${escapeHtml(invoice.customer)}</td>
      <td>${escapeHtml(invoice.items)}</td>
      <td class="num">${escapeHtml(INR.format(invoice.total))}</td>
      <td class="num">${escapeHtml(INR.format(invoice.gst))}</td>
      <td>${escapeHtml(invoice.payment)}</td>
      <td>${escapeHtml(invoice.status)}</td>
      <td>${escapeHtml(invoice.staff)}</td>
    </tr>
  `).join("");
  return `
    <!doctype html>
    <html>
      <head>
        <title>Sales History Export</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; }
          h1 { margin: 0 0 4px; font-size: 24px; }
          p { margin: 0 0 20px; color: #475569; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
          th { background: #f8fafc; }
          .num { text-align: right; font-weight: 700; }
        </style>
      </head>
      <body>
        <h1>Sales History</h1>
        <p>${invoices.length} invoice${invoices.length === 1 ? "" : "s"} exported on ${escapeHtml(longDate())}.</p>
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>GST</th><th>Payment</th><th>Status</th><th>Staff</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="9">No invoices found.</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `;
}

function summarizeInvoiceLines(lines: OrderLine[], discount = 0) {
  const totals = lines.reduce((acc, line) => {
    const amount = amountForLine(line);
    acc.base += amount.base;
    acc.gst += amount.gst;
    acc.total += amount.total;
    return acc;
  }, { base: 0, gst: 0, total: 0 });
  return {
    gst: totals.gst,
    total: Math.max(0, totals.total - discount),
  };
}

function lineQuantityLabel(line: OrderLine) {
  if (line.type === "fabric") return `${line.pieces} pcs x ${line.lengthPerPiece}${line.unit}`;
  return `${line.qty} ${unitLabel(line.product.unitType)}`;
}

function linePriceLabel(line: OrderLine) {
  return `${lineQuantityLabel(line)} • ${INR.format(line.product.price)}`;
}

function isReturnedLine(line: EditableOrderLine) {
  return line.rowState === "returned";
}

function persistedLines(lines: EditableOrderLine[]): OrderLine[] {
  return lines.filter((line) => !isReturnedLine(line)).map(({ rowState, ...line }) => line as OrderLine);
}

function invoiceWithLines(invoice: Invoice, lines: OrderLine[]) {
  if (!lines.length) return invoice;
  const totals = summarizeInvoiceLines(lines, invoice.discount ?? 0);
  return {
    ...invoice,
    lines,
    items: `${lines.length} item${lines.length === 1 ? "" : "s"}`,
    gst: totals.gst,
    total: totals.total,
  };
}

function legacyInvoiceLines(invoice: Invoice, products: Product[]): OrderLine[] {
  if (invoice.lines?.length) return invoice.lines;
  const product = (id: string) => products.find((item) => item.id === id);
  const linesByInvoice: Record<string, OrderLine[]> = {
    "INV-0001": [
      product("p1") ? { id: "INV-0001-L1", type: "standard", product: product("p1")!, qty: 2 } : null,
    ].filter(Boolean) as OrderLine[],
    "INV-0002": [
      product("p3") ? { id: "INV-0002-L1", type: "standard", product: product("p3")!, qty: 1 } : null,
    ].filter(Boolean) as OrderLine[],
    "INV-0003": [
      product("p5") ? { id: "INV-0003-L1", type: "standard", product: product("p5")!, qty: 2 } : null,
    ].filter(Boolean) as OrderLine[],
    "INV-0004": [
      product("p1") ? { id: "INV-0004-L1", type: "standard", product: product("p1")!, qty: 1 } : null,
    ].filter(Boolean) as OrderLine[],
  };
  return linesByInvoice[invoice.id] ?? [];
}

function roleAccess(role: StaffRole) {
  return {
    canUsePos: ["Owner", "Manager", "Salesperson", "Cashier"].includes(role),
    canViewSales: ["Owner", "Manager", "Salesperson", "Cashier"].includes(role),
    canEditInvoice: role === "Owner" || role === "Manager",
    canDeleteInvoice: role === "Owner",
    canExportSales: role === "Owner" || role === "Manager",
    canManageInventory: role === "Owner" || role === "Manager",
    canViewReports: role === "Owner" || role === "Manager",
    canViewPerformance: role === "Owner",
    canManageStaff: role === "Owner",
  };
}

function AppProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState(seedProducts);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [staff, setStaff] = useState(seedStaff);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (message: string, action?: ToastState["action"]) => {
    setToast({ message, action });
    window.setTimeout(() => setToast(null), action ? 4200 : 2600);
  };

  const value = useMemo(
    () => ({ products, setProducts, invoices, setInvoices, expenses, setExpenses, customers: seedCustomers, staff, setStaff, attendance, setAttendance, order, setOrder, toast, showToast }),
    [products, invoices, expenses, staff, attendance, order, toast],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function App() {
  const [authed, setAuthed] = useState(() => localStorage.getItem("retailflow-auth") === "true");

  return (
    <AppProvider>
      <Router future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <Routes>
          <Route path="/" element={<LoginPage onLogin={() => setAuthed(true)} />} />
          <Route path="/*" element={authed ? <Shell onSignOut={() => setAuthed(false)} /> : <Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

function LoginPage({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const { setStaff } = useApp();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("owner@retailflow.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const credentials: Array<[string, string]> = [
    ["owner@retailflow.com", "password"],
    ["manager@retailflow.com", "password"],
  ];
  const savedUsers = (): Array<{ name: string; email: string; password: string }> => {
    try {
      const raw = localStorage.getItem("retailflow-signups");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === "signup") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setError("Enter your full name.");
        return;
      }
      if (!normalizedEmail.includes("@")) {
        setError("Enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      const users = savedUsers();
      if (credentials.some(([u]) => u === normalizedEmail) || users.some((user) => user.email === normalizedEmail)) {
        setError("An account with this email already exists.");
        return;
      }
      localStorage.setItem("retailflow-signups", JSON.stringify([...users, { name: trimmedName, email: normalizedEmail, password }]));
      setStaff((items) => [...items, { id: crypto.randomUUID(), name: trimmedName, email: normalizedEmail, role: "Owner" }]);
      localStorage.setItem("retailflow-auth", "true");
      onLogin();
      navigate("/dashboard");
      return;
    }

    const users = savedUsers();
    if (credentials.some(([u, p]) => u === normalizedEmail && p === password) || users.some((user) => user.email === normalizedEmail && user.password === password)) {
      localStorage.setItem("retailflow-auth", "true");
      onLogin();
      navigate("/dashboard");
      return;
    }
    setError("Use the demo credentials or a signed-up account.");
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div className="geo geo-one" />
        <div className="geo geo-two" />
        <div className="brand-center">
          <div className="brand-mark large"><ShoppingBag size={36} /></div>
          <h1>RetailFlow</h1>
          <p>The modern operating system for forward-thinking retail businesses. Streamline sales, track inventory, and grow your business.</p>
        </div>
      </section>
      <section className="login-form-wrap">
        <div className="auth-toggle"><button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }} type="button">Login</button><button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); if (email === "owner@retailflow.com") { setEmail(""); setPassword(""); } }} type="button">Sign Up</button></div>
        <form className="login-form" onSubmit={submit}>
          <h2>{mode === "login" ? "Welcome" : "Create account"}</h2>
          <p>{mode === "login" ? "Access your retail dashboard" : "Create your retail dashboard account"}</p>
          {mode === "signup" && <LabeledInput icon={<User size={18} />} value={name} onChange={setName} placeholder="Full name" />}
          <LabeledInput icon={<Mail size={18} />} value={email} onChange={setEmail} placeholder="owner@retailflow.com" type="email" />
          <LabeledInput icon={<Lock size={18} />} value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          {error && <div className="error-text">{error}</div>}
          <button className="primary full" type="submit">{mode === "login" ? "Sign In" : "Create Account"}</button>
          {mode === "login" && <div className="demo-box">
            <strong>Demo credentials</strong>
            <span>Owner: owner@retailflow.com / password</span>
            <span>Manager: manager@retailflow.com / password</span>
          </div>}
        </form>
      </section>
    </main>
  );
}

function LabeledInput({ icon, value, onChange, placeholder, type = "text" }: { icon: React.ReactNode; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return (
    <label className="icon-input">
      {icon}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} />
    </label>
  );
}

function Shell({ onSignOut }: { onSignOut: () => void }) {
  const { toast, staff } = useApp();
  const location = useLocation();
  const currentUser = staff.find((member) => member.isCurrent) ?? staff[0];
  const access = roleAccess(currentUser.role);
  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: <BarChart3 size={18} />, allowed: true },
    { path: "/pos", label: "Point of Sale", icon: <ShoppingCart size={18} />, allowed: access.canUsePos },
    { path: "/sales", label: "Sales History", icon: <IndianRupee size={18} />, allowed: access.canViewSales },
    { path: "/products", label: "Inventory", icon: <Box size={18} />, allowed: access.canManageInventory },
    { path: "/customers", label: "Customers", icon: <Users size={18} />, allowed: true },
    { path: "/reports", label: "Reports", icon: <BarChart3 size={18} />, allowed: access.canViewReports },
    { path: "/performance", label: "Performance", icon: <BarChart3 size={18} />, allowed: access.canViewPerformance },
    { path: "/staff", label: "Staff", icon: <User size={18} />, allowed: access.canManageStaff },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="store-head"><div className="brand-mark"><Store size={22} /></div><strong>Retail Demo Store</strong></div>
        <nav>
          {navItems.filter((item) => item.allowed).map((item) => (
            <NavLink key={item.path} className={({ isActive }) => `nav-row ${isActive ? "active" : ""}`} to={item.path}>{item.icon}<span>{item.label}</span></NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{currentUser.name[0]}</div>
          <div><strong>{currentUser.name}</strong><span>{currentUser.role}</span></div>
        </div>
        <button
          className="signout"
          onClick={() => {
            localStorage.removeItem("retailflow-auth");
            onSignOut();
          }}
        ><LogOut size={17} />Sign Out</button>
      </aside>
      <main className="content">
        {location.pathname === "/" ? <Navigate to="/dashboard" replace /> : (
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={access.canUsePos ? <POS /> : <Navigate to="/dashboard" replace />} />
            <Route path="/sales" element={access.canViewSales ? <Sales /> : <Navigate to="/dashboard" replace />} />
            <Route path="/products" element={access.canManageInventory ? <Inventory /> : <Navigate to="/dashboard" replace />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/reports" element={access.canViewReports ? <Reports /> : <Navigate to="/dashboard" replace />} />
            <Route path="/performance" element={access.canViewPerformance ? <Performance /> : <Navigate to="/dashboard" replace />} />
            <Route path="/staff" element={access.canManageStaff ? <StaffPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        )}
      </main>
      {toast ? <div className="toast"><span>{toast.message}</span>{toast.action ? <button onClick={toast.action.onClick}>{toast.action.label}</button> : null}</div> : null}
    </div>
  );
}

function PageHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="page-header">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      {action}
    </div>
  );
}

function Dashboard() {
  const kpis = [
    ["Total Revenue", "₹499.93", "+20.1% from last month", <IndianRupee />],
    ["Sales", "+4", "+180.1% from last month", <ShoppingCart />],
    ["Products in Stock", "808", "Across 10 categories", <Box />],
    ["Low Stock Alert", "1", "Items need reordering", <AlertTriangle />],
  ] as const;
  return (
    <section className="page">
      <PageHeader title="Dashboard" subtitle="Overview of your store's performance." action={<div className="date">{longDate()}</div>} />
      <div className="kpi-grid">
        {kpis.map(([title, value, sub, icon], idx) => (
          <div className="card kpi" key={title}>
            <div><span>{title}</span><strong>{value}</strong><small className={idx < 2 ? "green-text" : ""}>{sub}</small></div>
            <div className={`kpi-icon ${idx === 3 ? "warn" : ""}`}>{icon}</div>
          </div>
        ))}
      </div>
      <div className="dashboard-row">
        <div className="card chart-card"><h2>Weekly Revenue</h2><RevenueChart data={weeklyData} xKey="day" /></div>
        <div className="card"><h2>Low Stock Items</h2><div className="low-row"><div><strong>Sunglasses</strong><span>SKU: SG-005</span></div><b>8 left</b></div></div>
      </div>
    </section>
  );
}

function RevenueChart({ data, xKey, height = 300 }: { data: Array<Record<string, string | number>>; xKey: string; height?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(0, Math.floor(entry.contentRect.width)));
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="chart-wrap" ref={ref}>
      {width > 0 ? (
        <BarChart width={width} height={height} data={data} margin={{ top: 12, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => `₹${v.toLocaleString("en-IN")}`} domain={[0, "dataMax + 100"]} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => INR.format(Number(v))} />
          <Bar dataKey="revenue" fill="#2563EB" radius={[8, 8, 0, 0]} />
        </BarChart>
      ) : null}
    </div>
  );
}

function GSTPill({ rate }: { rate: number }) {
  if (!rate) return <span className="muted">—</span>;
  return <span className={`pill gst-${rate}`}>GST {rate}%</span>;
}

function POS() {
  const { products, order, setOrder, setInvoices, staff, showToast } = useApp();
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("All");
  const [fabricProduct, setFabricProduct] = useState<Product | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [orderWidth, setOrderWidth] = useState(390);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [isProductGridScrolled, setIsProductGridScrolled] = useState(false);
  const currentUser = staff.find((member) => member.isCurrent) ?? staff[0];
  const salespersonOptions = [...staff].sort((a, b) => a.role === "Owner" ? -1 : b.role === "Owner" ? 1 : a.name.localeCompare(b.name));
  const [selectedSalespersonId, setSelectedSalespersonId] = useState(currentUser?.id ?? "");
  const selectedSalesperson = salespersonOptions.find((member) => member.id === selectedSalespersonId) ?? null;
  const [salespersonTouched, setSalespersonTouched] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const prewarmedStreamRef = useRef<MediaStream | null>(null);
  const categories = ["All", "Apparel", "Footwear", "Accessories", "Groceries", "Electronics"];
  const filtered = products.filter((p) => (category === "All" || p.category === category) && `${p.name} ${p.sku} ${p.barcode ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const totals = order.reduce((acc, line) => {
    const amount = amountForLine(line);
    acc.base += amount.base;
    acc.gst += amount.gst;
    acc.total += amount.total;
    return acc;
  }, { base: 0, gst: 0, total: 0 });
  const normalizeBarcode = (value: string) => value.trim().toLowerCase().replace(/[\s-]/g, "");
  const canCharge = order.length > 0 && selectedSalesperson !== null;

  function addProduct(product: Product, source: "click" | "scan" = "click") {
    if (product.unitType === "meter" && source === "click") {
      setFabricProduct(product);
      return;
    }
    if (product.unitType === "meter") {
      setOrder((lines) => [...lines, { id: crypto.randomUUID(), type: "fabric", product, pieces: 1, lengthPerPiece: 1, unit: "m", totalMeters: 1 }]);
      return;
    }
    setOrder((lines) => {
      const existing = lines.find((line): line is StandardLine => line.type === "standard" && line.product.id === product.id);
      if (!existing) return [...lines, { id: crypto.randomUUID(), type: "standard", product, qty: 1 }];
      return lines.map((line) => line.id === existing.id ? { ...existing, qty: existing.qty + (product.unitType === "piece" ? 1 : 0.5) } : line);
    });
  }

  function addScannedBarcode(code: string) {
    const normalized = normalizeBarcode(code);
    if (!normalized) return;
    const product = products.find((item) => [item.sku, item.barcode].some((code) => code && normalizeBarcode(code) === normalized));
    if (!product) {
      showToast(`No product found for ${code}`);
      return;
    }
    addProduct(product, "scan");
    setBarcode("");
    showToast(`${product.name} scanned`);
  }

  function scanBarcode(event: React.FormEvent) {
    event.preventDefault();
    if (isMobileBrowser()) {
      setScannerOpen(true);
      return;
    }
    addScannedBarcode(barcode);
  }

  function handleScannerCode(value: string) {
    const normalized = normalizeBarcode(value);
    const product = products.find((item) => [item.sku, item.barcode].some((code) => code && normalizeBarcode(code) === normalized));
    setScannerOpen(false);
    prewarmedStreamRef.current = null;
    if (product) {
      addProduct(product, "scan");
      showToast(`✓ ${product.name} added`, { label: "Scan Again", onClick: () => setScannerOpen(true) });
      return;
    }
    showToast("Barcode not found in inventory", { label: "Try Again", onClick: () => setScannerOpen(true) });
  }

  useEffect(() => {
    const normalized = normalizeBarcode(barcode);
    if (!normalized) return undefined;
    const product = products.find((item) => [item.sku, item.barcode].some((code) => code && normalizeBarcode(code) === normalized));
    if (!product) return undefined;
    const timer = window.setTimeout(() => {
      addProduct(product, "scan");
      setBarcode("");
      showToast(`${product.name} scanned`);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [barcode, products]);

  useEffect(() => {
    if (!isMobileBrowser() || typeof navigator === "undefined" || typeof navigator.mediaDevices?.getUserMedia !== "function") return undefined;
    let cancelled = false;

    const prewarm = async () => {
      try {
        const permissionApi = navigator.permissions as Permissions | undefined;
        await permissionApi?.query({ name: "camera" as PermissionName }).catch(() => undefined);
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        prewarmedStreamRef.current = stream;
      } catch {
        prewarmedStreamRef.current = null;
      }
    };

    prewarm();

    return () => {
      cancelled = true;
      prewarmedStreamRef.current?.getTracks().forEach((track) => track.stop());
      prewarmedStreamRef.current = null;
    };
  }, []);

  async function completePayment(customerName: string, paymentMethod: PaymentMethod, payableTotal: number, discountAmount: number) {
    if (!order.length || !selectedSalesperson) {
      setSalespersonTouched(true);
      return;
    }
    const invoice: Invoice = {
      id: `INV-${String(Date.now()).slice(-4)}`,
      date: displayDateTime(new Date()),
      customer: customerName.trim() || "Walk-in",
      items: `${order.length} items`,
      total: payableTotal,
      discount: discountAmount,
      gst: totals.gst,
      payment: paymentMethod === "QR Code" ? "Qr" : paymentMethod,
      status: "Completed",
      staff: selectedSalesperson.name,
      salespersonId: selectedSalesperson.id,
      salespersonName: selectedSalesperson.name,
      lines: order,
    };
    setInvoices((items) => [invoice, ...items]);
    setOrder([]);
    setPaymentOpen(false);
    setSelectedSalespersonId(currentUser?.id ?? selectedSalesperson.id);
    setSalespersonTouched(false);
    const printed = await printInvoice(invoice);
    showToast(printed ? `Invoice ${invoice.id} printed` : `Invoice ${invoice.id} created`);
  }

  function startOrderResize(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = orderWidth;
    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = startWidth + (startX - moveEvent.clientX);
      setOrderWidth(Math.min(540, Math.max(320, nextWidth)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <section className="pos-layout" style={{ "--order-width": `${orderWidth}px` } as React.CSSProperties}>
      <div className="pos-products">
        <div className={`pos-sticky-header ${isProductGridScrolled ? "scrolled" : ""}`}>
          <div className="pos-head">
            <h1>Point of Sale</h1>
            <label className="searchbox"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or SKU..." /></label>
          </div>
          <form className="scanbox" onSubmit={scanBarcode}><ScanBarcode size={18} /><input ref={barcodeInputRef} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan barcode / SKU to add directly" /><button type="submit">Scan</button></form>
          <div className="salesperson-row">
            <label htmlFor="salesperson-select"><User size={16} /> Salesperson:</label>
            <select id="salesperson-select" value={selectedSalespersonId} onChange={(event) => { setSelectedSalespersonId(event.target.value); setSalespersonTouched(true); }}>
              <option value="">Select salesperson...</option>
              {salespersonOptions.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}
            </select>
          </div>
          {salespersonTouched && !selectedSalesperson ? <div className="salesperson-warning">Please select a salesperson to continue</div> : null}
          <div className="category-row"><button className="arrow-btn"><ChevronLeft size={16} /></button><div className="category-pills">{categories.map((c) => <button key={c} className={`chip ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{c}</button>)}</div><button className="arrow-btn"><ChevronRight size={16} /></button></div>
        </div>
        <div className="product-scroll-area" onScroll={(event) => setIsProductGridScrolled(event.currentTarget.scrollTop > 10)}>
          <div className="product-grid">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} onClick={() => addProduct(product)} />
            ))}
          </div>
        </div>
      </div>
      <div className="order-resizer" title="Drag to resize current order" onMouseDown={startOrderResize} />
      <aside className="order-panel">
        <div className="order-head"><h2>Current Order</h2><button className="danger-light" onClick={() => setOrder([])}><Trash2 size={16} />Clear</button></div>
        <div className="order-lines">
          {order.length === 0 ? <div className="empty pos-empty"><ShoppingBag size={40} /><span>Click products to build an order.</span></div> : order.map((line) => <OrderLineRow key={line.id} line={line} />)}
        </div>
        <div className="totals">
          <div><span>Subtotal:</span><strong>{INR.format(totals.base)}</strong></div>
          <div><span>Total GST:</span><strong>{INR.format(totals.gst)}</strong></div>
          <hr />
          <div className="payable"><span>Total Payable:</span><strong>{INR.format(totals.total)}</strong></div>
        </div>
        <button className="primary full charge" disabled={!order.length} onClick={() => canCharge ? setPaymentOpen(true) : setSalespersonTouched(true)}>Charge {INR.format(totals.total)}</button>
      </aside>
      {fabricProduct && <FabricModal product={fabricProduct} onClose={() => setFabricProduct(null)} />}
      {paymentOpen && <PaymentModal total={totals.total} onClose={() => setPaymentOpen(false)} onConfirm={completePayment} />}
      <BarcodeScannerModal visible={scannerOpen} prewarmedStream={prewarmedStreamRef.current} onClose={() => { setScannerOpen(false); prewarmedStreamRef.current = null; }} onManual={() => { setScannerOpen(false); prewarmedStreamRef.current = null; barcodeInputRef.current?.focus(); }} onScanned={handleScannerCode} />
    </section>
  );
}

function BarcodeScannerModal({ visible, prewarmedStream, onClose, onManual, onScanned }: { visible: boolean; prewarmedStream?: MediaStream | null; onClose: () => void; onManual?: () => void; onScanned: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const isProcessingRef = useRef(false);
  const [message, setMessage] = useState("Starting camera...");
  const [torchOn, setTorchOn] = useState(false);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;

    const isStreamActive = (stream: MediaStream) => stream.getTracks().some((track) => track.readyState === "live");

    const stopCamera = () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      controlsRef.current?.stop();
      controlsRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const handleCode = (value: string) => {
      if (isProcessingRef.current) return;
      isProcessingRef.current = true;
      navigator.vibrate?.(100);
      stopCamera();
      onScanned(value);
    };

    async function start() {
      isProcessingRef.current = false;
      setMessage("Starting camera...");

      const method = getScannerMethod();
      if (method === "unsupported") {
        setMessage("Camera barcode scanning is not supported in this browser.");
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      try {
        const stream = prewarmedStream && isStreamActive(prewarmedStream)
          ? prewarmedStream
          : await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
          });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.setAttribute("playsinline", "true");
        video.setAttribute("muted", "true");
        await video.play();
        setMessage("Point at barcode");

        if (method === "barcode-detector") {
          const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
          if (!Detector) return;
          const detector = new Detector({ formats: ["ean_13", "ean_8", "code_128", "code_39", "qr_code", "upc_a", "upc_e"] });
          const detect = async () => {
            if (cancelled || isProcessingRef.current || !videoRef.current) return;
            if (videoRef.current.readyState >= 2) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes[0]?.rawValue) {
                  handleCode(barcodes[0].rawValue);
                  return;
                }
              } catch {
                // Keep scanning; mobile browsers can throw while video warms up.
              }
            }
            frameRef.current = window.requestAnimationFrame(detect);
          };
          video.onloadedmetadata = () => {
            frameRef.current = window.requestAnimationFrame(detect);
          };
          frameRef.current = window.requestAnimationFrame(detect);
          return;
        }

        const reader = new BrowserMultiFormatReader(undefined, {
          delayBetweenScanAttempts: 150,
          delayBetweenScanSuccess: 500,
        });
        controlsRef.current = await reader.decodeFromVideoElement(video, (result) => {
          const value = result?.getText();
          if (value) handleCode(value);
        });
      } catch {
        setMessage("Unable to start camera. Use manual entry.");
      }
    }

    start();
    return () => {
      cancelled = true;
      isProcessingRef.current = false;
      stopCamera();
    };
  }, [visible, prewarmedStream, onScanned]);

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { torch?: boolean };
    if (!capabilities.torch) {
      setMessage("Torch is not supported on this device.");
      return;
    }
    await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
    setTorchOn((value) => !value);
  }

  if (!visible) return null;
  const handleClose = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    isProcessingRef.current = false;
    onClose();
  };
  return createPortal(
    <div className="scanner-modal">
      <video className="scanner-video" ref={videoRef} autoPlay muted playsInline />
      <div className="scanner-topbar"><button onClick={handleClose}>←</button><strong>Scan Barcode</strong><button onClick={toggleTorch}>{torchOn ? "Flash On" : "Flash"}</button></div>
      <div className="scanner-window"><span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" /><span className="scan-line" /></div>
      <div className="scanner-bottom"><p>{message}</p><button onClick={onManual ?? handleClose}>Enter manually</button></div>
    </div>,
    document.body,
  );
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const amount = amountForProduct(product);
  const stockClass = product.stock <= 0 ? "out" : product.stock <= 5 ? "critical" : product.stock <= 20 ? "warning" : "good";
  const stockLabel = product.stock <= 0 ? "Out of Stock" : `${product.stock} ${unitLabel(product.unitType)}${product.stock <= 5 ? " !" : ""}`;
  return (
    <button className={`product-card ${product.stock <= 0 ? "disabled" : ""}`} onClick={onClick} disabled={product.stock <= 0}>
      <div className="card-top"><span className="category-badge">{product.category}</span><GSTPill rate={product.gstRate} /></div>
      <strong>{product.name}</strong><span className="sku">{product.sku}</span>
      <div className="product-price">
        <b>{INR.format(amount.total)}</b>
      </div>
      <span className={`stock-pill ${stockClass}`}>{stockLabel}</span>
    </button>
  );
}

function OrderLineRow({ line }: { line: OrderLine }) {
  const { setOrder } = useApp();
  const amount = amountForLine(line);
  const [fabricPiecesDraft, setFabricPiecesDraft] = useState(line.type === "fabric" ? String(line.pieces) : "");
  const [fabricLengthDraft, setFabricLengthDraft] = useState(line.type === "fabric" ? String(line.lengthPerPiece) : "");

  useEffect(() => {
    if (line.type !== "fabric") return;
    setFabricPiecesDraft(String(line.pieces));
    setFabricLengthDraft(String(line.lengthPerPiece));
  }, [line.id, line.type === "fabric" ? line.pieces : 0, line.type === "fabric" ? line.lengthPerPiece : 0]);

  const updateFabric = (patch: Partial<Pick<FabricLine, "pieces" | "lengthPerPiece" | "unit">>) => {
    setOrder((items) =>
      items.map((item) => {
        if (item.id !== line.id || item.type !== "fabric") return item;
        const next = { ...item, ...patch };
        return {
          ...next,
          pieces: Math.max(1, Math.floor(next.pieces)),
          lengthPerPiece: Math.max(0.5, next.lengthPerPiece),
          totalMeters: Math.max(1, Math.floor(next.pieces)) * Math.max(0.5, next.lengthPerPiece) * (next.unit === "yd" ? 0.9144 : 1),
        };
      }),
    );
  };

  if (line.type === "fabric") {
    const commitPiecesDraft = () => {
      const next = Math.max(1, Math.floor(Number(fabricPiecesDraft) || line.pieces));
      setFabricPiecesDraft(String(next));
      updateFabric({ pieces: next });
    };
    const commitLengthDraft = () => {
      const next = Math.max(0.5, Number(fabricLengthDraft) || line.lengthPerPiece);
      setFabricLengthDraft(String(next));
      updateFabric({ lengthPerPiece: next });
    };

    return (
      <div className="order-line">
        <div className="line-main"><strong>{line.product.name}</strong><button className="remove-line" title="Remove item" onClick={() => setOrder((items) => items.filter((item) => item.id !== line.id))}><Trash2 size={15} /></button></div>
        <div className="fabric-inline-edit">
          <label><span>Pieces</span><input type="number" min="1" step="1" value={fabricPiecesDraft} onBlur={commitPiecesDraft} onChange={(e) => {
            const value = e.target.value;
            setFabricPiecesDraft(value);
            const numeric = Number(value);
            if (value !== "" && Number.isFinite(numeric) && numeric >= 1) updateFabric({ pieces: numeric });
          }} /></label>
          <label><span>Length</span><input type="number" min="0.5" step="0.5" value={fabricLengthDraft} onBlur={commitLengthDraft} onChange={(e) => {
            const value = e.target.value;
            setFabricLengthDraft(value);
            const numeric = Number(value);
            if (value !== "" && Number.isFinite(numeric) && numeric >= 0.5) updateFabric({ lengthPerPiece: numeric });
          }} /></label>
          <label><span>Unit</span><select value={line.unit} onChange={(e) => updateFabric({ unit: e.target.value as "m" | "yd" })}><option>m</option><option>yd</option></select></label>
        </div>
        <small>{line.pieces} pcs × {line.lengthPerPiece}{line.unit} = {line.totalMeters.toFixed(2)}m @ {INR.format(line.product.price)}/m</small>
        <small className="line-tax">Base {INR.format(amount.base)} · GST {INR.format(amount.gst)}</small>
        <div className="line-main"><span className="muted">Line total</span><b>{INR.format(amount.total)}</b></div>
      </div>
    );
  }
  const step = line.product.unitType === "piece" ? 1 : 0.5;
  return (
    <div className="order-line">
      <div className="line-main"><strong>{line.product.name}</strong><span className="line-actions"><b>{INR.format(amount.total)}</b><button className="remove-line" title="Remove item" onClick={() => setOrder((items) => items.filter((item) => item.id !== line.id))}><Trash2 size={15} /></button></span></div>
      <small>{INR.format(line.product.price)}/{unitLabel(line.product.unitType)}</small>
      <div className="qty-row">
        <button onClick={() => setOrder((items) => items.flatMap((item) => item.id === line.id ? (line.qty - step > 0 ? [{ ...line, qty: line.qty - step }] : []) : [item]))}>−</button>
        <span>{line.qty}</span>
        <button onClick={() => setOrder((items) => items.map((item) => item.id === line.id ? { ...line, qty: line.qty + step } : item))}>+</button>
        <em>{unitLabel(line.product.unitType)}</em>
      </div>
    </div>
  );
}

function PaymentModal({ total, onClose, onConfirm }: { total: number; onClose: () => void; onConfirm: (customerName: string, paymentMethod: PaymentMethod, payableTotal: number, discountAmount: number) => void | Promise<void> }) {
  const [customerName, setCustomerName] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Card");
  const [discountDraft, setDiscountDraft] = useState("");
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">("percent");
  const [cashReceivedDraft, setCashReceivedDraft] = useState("");
  const discountValue = Math.max(0, Number(discountDraft) || 0);
  const discountAmount = Math.min(total, discountMode === "percent" ? total * (Math.min(discountValue, 100) / 100) : discountValue);
  const payableTotal = Math.max(0, total - discountAmount);
  const cashReceived = Number(cashReceivedDraft) || 0;
  const cashBalance = Math.max(0, cashReceived - payableTotal);
  const cashShort = method === "Cash" && cashReceived < payableTotal;

  return (
    <Modal onClose={onClose} className="payment-modal">
      <div className="modal-head">
        <div>
          <h2>Complete Payment</h2>
          <p>Total Amount: <strong>{INR.format(payableTotal)}</strong></p>
        </div>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <label className="field">
        <span>Customer Name (Optional)</span>
        <input autoFocus value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter customer name" />
      </label>
      <div className="payment-discount">
        <div className="payment-summary-row"><span>Order Total</span><strong>{INR.format(total)}</strong></div>
        <div className="discount-control">
          <label><Percent size={14} /> Discount</label>
          <div className="discount-input">
            <input type="number" min="0" step={discountMode === "percent" ? "1" : "0.01"} value={discountDraft} onChange={(e) => setDiscountDraft(e.target.value)} placeholder="0" />
            <button className={discountMode === "percent" ? "active" : ""} onClick={() => setDiscountMode("percent")}>%</button>
            <button className={discountMode === "amount" ? "active" : ""} onClick={() => setDiscountMode("amount")}>₹</button>
          </div>
        </div>
        {discountAmount > 0 && <div className="payment-summary-row discount-row"><span>Discount</span><strong>-{INR.format(discountAmount)}</strong></div>}
        <div className="payment-summary-row final"><span>Payable</span><strong>{INR.format(payableTotal)}</strong></div>
      </div>
      <div className="payment-tabs">
        {(["Card", "Cash", "QR Code"] as PaymentMethod[]).map((item) => (
          <button key={item} className={method === item ? "active" : ""} onClick={() => setMethod(item)}>{item}</button>
        ))}
      </div>
      {method === "Cash" && (
        <div className="cash-received-box">
          <label className="field">
            <span>Cash Received</span>
            <input type="number" min="0" step="0.01" value={cashReceivedDraft} onChange={(e) => setCashReceivedDraft(e.target.value)} placeholder="Enter amount customer gave" />
          </label>
          <div className="payment-summary-row"><span>Balance to return</span><strong>{INR.format(cashBalance)}</strong></div>
          {cashShort && <small>Received cash must be at least {INR.format(payableTotal)}.</small>}
        </div>
      )}
      <button className="primary full" disabled={cashShort} onClick={() => onConfirm(customerName, method, payableTotal, discountAmount)}>
        Confirm {method} Payment
      </button>
    </Modal>
  );
}

function FabricModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { setOrder, showToast } = useApp();
  const [piecesDraft, setPiecesDraft] = useState("1");
  const [lengthDraft, setLengthDraft] = useState("1");
  const [unit, setUnit] = useState<"m" | "yd">("m");
  const pieces = Math.max(1, Math.floor(Number(piecesDraft) || 1));
  const length = Math.max(0.5, Number(lengthDraft) || 0.5);
  const totalMeters = pieces * length * (unit === "yd" ? 0.9144 : 1);
  const baseAmount = totalMeters * product.price;
  const gstAmount = baseAmount * (product.gstRate / 100);
  const totalAmount = baseAmount + gstAmount;
  return (
    <Modal onClose={onClose} className="fabric-modal">
      <div className="modal-head"><div><h2>Enter Quantity — {product.name}</h2><p>{INR.format(product.price)} per meter · GST {product.gstRate}%</p></div><button onClick={onClose}><X size={20} /></button></div>
      <label className="field-label">No. of Pieces</label>
      <div className="stepper"><button onClick={() => setPiecesDraft(String(Math.max(1, pieces - 1)))}>−</button><input type="number" min="1" step="1" value={piecesDraft} onBlur={() => setPiecesDraft(String(pieces))} onChange={(e) => setPiecesDraft(e.target.value)} /><button onClick={() => setPiecesDraft(String(pieces + 1))}>+</button></div>
      <div className="measurement-fields">
        <label className="field"><span>Length per Piece</span><input type="number" min="0.5" step="0.5" value={lengthDraft} onBlur={() => setLengthDraft(String(length))} onChange={(e) => setLengthDraft(e.target.value)} /></label>
        <label className="field"><span>Unit</span><select value={unit} onChange={(e) => setUnit(e.target.value as "m" | "yd")}><option>m</option><option>yd</option></select></label>
      </div>
      <div className="preview-box">
        <span>{pieces} × {length} {unit} = {totalMeters.toFixed(2)} meters</span>
        <span>{INR.format(product.price)}/m × {totalMeters.toFixed(2)} m = {INR.format(baseAmount)}</span>
        <span>+ GST ({product.gstRate}%): {INR.format(gstAmount)}</span>
        <strong>Total: {INR.format(totalAmount)}</strong>
      </div>
      <div className="modal-actions"><button className="outline" onClick={onClose}>Cancel</button><button className="primary" onClick={() => {
        setOrder((items) => [...items, { id: crypto.randomUUID(), type: "fabric", product, pieces, lengthPerPiece: length, unit, totalMeters }]);
        showToast(`${product.name} added to order`);
        onClose();
      }}>Add to Order →</button></div>
    </Modal>
  );
}

function Sales() {
  const { invoices, setInvoices, staff, products, showToast } = useApp();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("All Methods");
  const [staffFilter, setStaffFilter] = useState("All Staff");
  const [dateFilter, setDateFilter] = useState(() => dateKey(new Date().toISOString()));
  const [selected, setSelected] = useState<{ invoice: Invoice; mode: "view" | "edit" } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const currentUser = staff.find((member) => member.isCurrent) ?? staff[0];
  const access = roleAccess(currentUser.role);
  const filtered = invoices
    .filter((invoice) =>
      `${invoice.id} ${invoice.customer} ${invoice.staff} ${invoice.salespersonName}`.toLowerCase().includes(query.toLowerCase()) &&
      (method === "All Methods" || invoice.payment === method) &&
      (staffFilter === "All Staff" || invoice.staff === staffFilter) &&
      (!dateFilter || dateKey(invoice.date) === dateFilter)
    )
    .sort((a, b) => invoiceTime(b) - invoiceTime(a));
  const filteredTotal = filtered.reduce((sum, invoice) => sum + invoice.total, 0);
  const deleteInvoice = (invoice: Invoice) => {
    if (!access.canDeleteInvoice) return;
    if (window.confirm(`Delete invoice ${invoice.id}? This action cannot be undone.`)) {
      setInvoices((rows) => rows.filter((row) => row.id !== invoice.id));
    }
  };
  const exportRows = (format: "csv" | "pdf") => {
    const stamp = dateFilter || dateKey(new Date().toISOString()) || "sales";
    if (format === "csv") {
      downloadFile(`sales-history-${stamp}.csv`, `\uFEFF${salesCsv(filtered)}`, "text/csv;charset=utf-8");
      setExportOpen(false);
      return;
    }

    const win = window.open("", "_blank", "width=1024,height=720");
    if (!win) {
      window.alert("Please allow pop-ups to export PDF.");
      return;
    }
    win.document.write(salesPdfHtml(filtered));
    win.document.close();
    win.focus();
    win.print();
    setExportOpen(false);
  };
  return (
    <section className="page">
      <PageHeader title="Sales History" subtitle="View and manage transaction records." action={access.canExportSales ? <button className="outline" onClick={() => setExportOpen(true)}>Export</button> : null} />
      <div className="filters"><label className="searchbox"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice, customer, or staff" /></label><select value={method} onChange={(e) => setMethod(e.target.value)}><option>All Methods</option><option>Card</option><option>Cash</option><option>Qr</option></select><select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}><option>All Staff</option>{staff.map((member) => <option key={member.id}>{member.name}</option>)}</select><input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></div>
      <div className="sales-summary">
        <div><span>Total invoices</span><strong>{filtered.length}</strong></div>
        <div><span>Total amount</span><strong>{INR.format(filteredTotal)}</strong></div>
      </div>
      <DataTable headers={["Invoice", "Date", "Customer", "Items", "Total", "Payment", "Status", "Salesperson", "Actions"]}>
        {filtered.length === 0 ? (
          <tr><td className="empty-table" colSpan={9}>No Data Available</td></tr>
        ) : filtered.map((invoice) => (
          <tr key={invoice.id}><td><button className="linkish invoice-link" onClick={() => setSelected({ invoice, mode: "view" })}>{invoice.id}</button></td><td>{invoice.date}</td><td>{invoice.customer}</td><td>{invoice.items}</td><td><strong>{INR.format(invoice.total)}</strong></td><td>{invoice.payment}</td><td><span className={`status ${invoice.status.toLowerCase()}`}>{invoice.status}</span></td><td>{invoice.salespersonName || invoice.staff || "Unassigned"}</td><td className="actions"><button className="safe-action" title="View bill" onClick={() => setSelected({ invoice, mode: "view" })}><Eye size={16} /></button>{access.canEditInvoice ? <button className="safe-action" title="Edit bill" onClick={() => setSelected({ invoice, mode: "edit" })}><Edit size={16} /></button> : null}{access.canDeleteInvoice ? <button className="danger-action" title="Delete invoice" onClick={() => deleteInvoice(invoice)}><Trash2 size={16} /></button> : null}</td></tr>
        ))}
      </DataTable>
      {selected && <InvoiceModal invoice={selected.invoice} mode={selected.mode} canEdit={access.canEditInvoice} staff={staff} products={products} onClose={() => setSelected(null)} onEdit={() => setSelected((current) => current ? { invoice: current.invoice, mode: "edit" } : current)} onSave={(invoice) => {
        setInvoices((rows) => rows.map((row) => row.id === invoice.id ? invoice : row));
        showToast("Invoice updated");
        setSelected(null);
      }} />}
      {exportOpen && (
        <Modal onClose={() => setExportOpen(false)} className="drawer-modal">
          <div className="modal-head"><div><h2>Export Sales History</h2><p>Choose a format for {filtered.length} visible invoice{filtered.length === 1 ? "" : "s"}.</p></div><button onClick={() => setExportOpen(false)}><X size={20} /></button></div>
          <div className="modal-actions"><button className="primary" onClick={() => exportRows("csv")}>Export CSV</button><button className="outline" onClick={() => exportRows("pdf")}>Export PDF</button></div>
        </Modal>
      )}
    </section>
  );
}

function InvoiceModal({ invoice, mode, canEdit, staff, products, onClose, onEdit, onSave }: { invoice: Invoice; mode: "view" | "edit"; canEdit: boolean; staff: Staff[]; products: Product[]; onClose: () => void; onEdit: () => void; onSave: (invoice: Invoice) => void }) {
  const [customer, setCustomer] = useState(invoice.customer);
  const [payment, setPayment] = useState(invoice.payment);
  const [status, setStatus] = useState<Invoice["status"]>(invoice.status);
  const [staffName, setStaffName] = useState(invoice.staff);
  const [manualTotal, setManualTotal] = useState(String(invoice.total));
  const [manualGst, setManualGst] = useState(String(invoice.gst));
  const initialLines = useMemo(() => legacyInvoiceLines(invoice, products), [invoice, products]);
  const [manualOverride, setManualOverride] = useState(!initialLines.length);
  const [lines, setLines] = useState<EditableOrderLine[]>(initialLines);
  const activeLines = persistedLines(lines);
  const lineTotals = summarizeInvoiceLines(activeLines, invoice.discount ?? 0);
  const manualAmount = Math.max(0, Number(manualTotal) || 0);
  const manualGstAmount = Math.max(0, Number(manualGst) || 0);
  const editedTotal = manualOverride ? manualAmount : lineTotals.total;
  const editedGst = manualOverride ? manualGstAmount : lineTotals.gst;
  const selectedStaff = staff.find((member) => member.name === staffName);
  const lineInvoice = activeLines.length ? invoiceWithLines({ ...invoice, customer, payment, status, staff: staffName, salespersonId: selectedStaff?.id ?? invoice.salespersonId ?? "unassigned", salespersonName: staffName || invoice.salespersonName || "Unassigned" }, activeLines) : null;
  const hasEditedRows = lines.length > 0;
  const nextInvoice = { ...(lineInvoice ?? invoice), customer, payment, status, staff: staffName, salespersonId: selectedStaff?.id ?? invoice.salespersonId ?? "unassigned", salespersonName: staffName || invoice.salespersonName || "Unassigned", total: editedTotal, gst: editedGst, ...(hasEditedRows ? { lines: activeLines, items: `${activeLines.length} item${activeLines.length === 1 ? "" : "s"}` } : {}) };
  const viewInvoice = initialLines.length ? { ...invoice, lines: initialLines, items: `${initialLines.length} item${initialLines.length === 1 ? "" : "s"}` } : invoice;
  const selectedProductId = products[0]?.id ?? "";
  const [confirmedLineIds, setConfirmedLineIds] = useState<string[]>([]);

  function addProduct(productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setLines((items) => [
      ...items,
      product.unitType === "meter"
        ? { id: crypto.randomUUID(), type: "fabric", product, pieces: 1, lengthPerPiece: 1, unit: "m", totalMeters: 1, rowState: "new" }
        : { id: crypto.randomUUID(), type: "standard", product, qty: 1, rowState: "new" },
    ]);
    setManualOverride(false);
  }

  function replaceProduct(lineId: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setLines((items) => items.map((line) => {
      if (line.id !== lineId) return line;
      if (product.unitType === "meter") {
        return { id: line.id, type: "fabric", product, pieces: line.type === "fabric" ? line.pieces : 1, lengthPerPiece: line.type === "fabric" ? line.lengthPerPiece : 1, unit: line.type === "fabric" ? line.unit : "m", totalMeters: line.type === "fabric" ? line.totalMeters : 1, rowState: line.rowState };
      }
      return { id: line.id, type: "standard", product, qty: line.type === "standard" ? line.qty : 1, rowState: line.rowState };
    }));
    setManualOverride(false);
  }

  function updateLine(lineId: string, patch: { qty?: number; pieces?: number; lengthPerPiece?: number; unit?: "m" | "yd" }) {
    setLines((items) => items.map((line) => {
      if (line.id !== lineId) return line;
      if (line.type === "fabric") {
        const next = { ...line, ...patch };
        const pieces = Math.max(1, Math.floor(Number(next.pieces) || 1));
        const lengthPerPiece = Math.max(0.5, Number(next.lengthPerPiece) || 0.5);
        const unit = next.unit === "yd" ? "yd" : "m";
        return { ...next, pieces, lengthPerPiece, unit, totalMeters: pieces * lengthPerPiece * (unit === "yd" ? 0.9144 : 1) };
      }
      const qty = Math.max(0.5, Number(patch.qty ?? line.qty) || 1);
      return { ...line, qty };
    }));
    setManualOverride(false);
  }

  function returnLine(lineId: string) {
    setLines((items) => items.map((line) => line.id === lineId ? { ...line, rowState: isReturnedLine(line) ? undefined : "returned" } : line));
    setManualOverride(false);
  }

  function confirmLine(lineId: string) {
    const line = lines.find((item) => item.id === lineId);
    if (!line || isReturnedLine(line)) return;
    const isValid = line.type === "standard" ? line.qty > 0 : line.pieces > 0 && line.lengthPerPiece > 0;
    if (!isValid) return;
    setLines((items) => items.map((item) => item.id === lineId ? { ...item, rowState: undefined } : item));
    setManualOverride(false);
    setConfirmedLineIds((ids) => [...ids.filter((id) => id !== lineId), lineId]);
    window.setTimeout(() => setConfirmedLineIds((ids) => ids.filter((id) => id !== lineId)), 500);
  }

  function useProductTotal() {
    setManualOverride(false);
    setManualTotal(String(lineTotals.total.toFixed(2)));
    setManualGst(String(lineTotals.gst.toFixed(2)));
  }

  if (mode === "view") {
    return (
      <Modal onClose={onClose} className="invoice-modal">
        <div className="modal-head"><div><h2>Invoice {invoice.id}</h2><p>Total Amount: <strong>{INR.format(invoice.total)}</strong></p></div><button onClick={onClose}><X size={20} /></button></div>
        <div className="bill-view">
          <div className="bill-view-grid">
            <div><span>Date</span><strong>{viewInvoice.date}</strong></div>
            <div><span>Customer</span><strong>{viewInvoice.customer}</strong></div>
            <div><span>Payment</span><strong>{viewInvoice.payment}</strong></div>
            <div><span>Status</span><strong>{viewInvoice.status}</strong></div>
            <div><span>Processed by</span><strong>{viewInvoice.salespersonName || viewInvoice.staff || "Unassigned"}</strong></div>
            <div><span>Items</span><strong>{viewInvoice.items}</strong></div>
          </div>
          <div className="bill-view-lines">
            <strong>Bill Products</strong>
            {viewInvoice.lines?.length ? viewInvoice.lines.map((line) => {
              const amount = amountForLine(line);
              return <div className="bill-view-line" key={line.id}><div><strong>{line.product.name}</strong><span>{linePriceLabel(line)}</span></div><span>{INR.format(amount.total)}</span></div>;
            }) : <div className="empty compact">Product lines are not available for this invoice. The saved bill total is shown below.</div>}
          </div>
          <div className="bill-view-total"><span>Total Amount</span><strong>{INR.format(viewInvoice.total)}</strong></div>
        </div>
        <div className="modal-actions"><button className="outline" onClick={() => printInvoice(viewInvoice)}>Print Bill</button>{canEdit ? <button className="primary" onClick={onEdit}>Edit Bill</button> : null}<button className="outline" onClick={onClose}>Close</button></div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} className="invoice-modal">
      <div className="modal-head"><div><h2>Invoice {invoice.id}</h2><p>Total Amount: <strong>{INR.format(editedTotal)}</strong></p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid two"><TextField label="Customer" value={customer} onChange={setCustomer} /><label className="field"><span>Payment</span><select value={payment} onChange={(e) => setPayment(e.target.value)}><option>Card</option><option>Cash</option><option>Qr</option></select></label></div>
      <div className="form-grid two"><label className="field"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value as Invoice["status"])}><option>Completed</option><option>Refunded</option></select></label><label className="field"><span>Staff</span><select value={staffName} onChange={(e) => setStaffName(e.target.value)}>{staff.map((member) => <option key={member.id}>{member.name}</option>)}</select></label></div>
      <div className="form-grid"><TextField label="Bill Total" type="number" value={manualOverride ? manualTotal : String(lineTotals.total.toFixed(2))} onChange={(value) => { setManualOverride(true); setManualTotal(value); }} /></div>
      <button className="outline full use-product-total" disabled={!activeLines.length} onClick={useProductTotal}>Use Product Total</button>
      <div className="bill-editor">
        <div className="bill-editor-head"><strong>Edit / Exchange Products</strong><label><span>Add product</span><select defaultValue="" onChange={(e) => { addProduct(e.target.value || selectedProductId); e.currentTarget.value = ""; }}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label></div>
        {lines.length ? lines.map((line) => {
          const returned = isReturnedLine(line);
          const confirmed = confirmedLineIds.includes(line.id);
          const isNew = line.rowState === "new";
          return (
            <div className={`bill-line-editor ${isNew ? "new-line" : ""} ${returned ? "returned-line" : ""} ${confirmed ? "confirmed-line" : ""}`} key={line.id}>
              <label className="bill-product-field"><span>Product</span><select disabled={returned} value={line.product.id} onChange={(e) => replaceProduct(line.id, e.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              <div className="bill-line-controls">
                {line.type === "standard" ? <label className="bill-number-field qty-stepper-field"><span>Qty</span><div className="bill-qty-stepper"><button type="button" disabled={returned} onClick={() => {
                  const step = line.product.unitType === "piece" ? 1 : 0.5;
                  updateLine(line.id, { qty: Math.max(step, line.qty - step) });
                }}>−</button><input readOnly={returned} type="number" min={line.product.unitType === "piece" ? "1" : "0.5"} step={line.product.unitType === "piece" ? "1" : "0.5"} value={line.qty} onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })} /><button type="button" disabled={returned} onClick={() => {
                  const step = line.product.unitType === "piece" ? 1 : 0.5;
                  updateLine(line.id, { qty: line.qty + step });
                }}>+</button></div></label> : <>
                  <label className="bill-number-field"><span>Pieces</span><input readOnly={returned} type="number" min="1" step="1" value={line.pieces} onChange={(e) => updateLine(line.id, { pieces: Number(e.target.value) })} /></label>
                  <label className="bill-number-field length-field"><span>Length</span><input readOnly={returned} type="number" min="0.5" step="0.5" value={line.lengthPerPiece} onChange={(e) => updateLine(line.id, { lengthPerPiece: Number(e.target.value) })} /></label>
                </>}
                <div className="line-price-badge">{linePriceLabel(line)}</div>
                <div className="bill-row-actions">{!isNew ? <button className={`outline return-line ${returned ? "undo-line" : ""}`} onClick={() => returnLine(line.id)}>{returned ? "Undo" : "Return"}</button> : null}<button className="primary add-line" disabled={returned} onClick={() => confirmLine(line.id)}>{confirmed ? <Check size={15} /> : null}Add</button></div>
              </div>
            </div>
          );
        }) : <div className="empty compact">No product lines saved for this older invoice. Add products above or edit the manual total.</div>}
      </div>
      <div className="demo-box">
        <span>Date: {invoice.date}</span>
        <span>Items: {nextInvoice.items}</span>
        <span>Total: {INR.format(nextInvoice.total)}</span>
      </div>
      <div className="modal-actions"><button className="outline" onClick={() => printInvoice(nextInvoice)}>Print Bill</button><button className="outline" onClick={() => setStatus(status === "Refunded" ? "Completed" : "Refunded")}>{status === "Refunded" ? "Mark Completed" : "Mark Refunded"}</button><button className="primary" onClick={() => onSave(nextInvoice)}>Save Changes</button></div>
    </Modal>
  );
}

function Inventory() {
  const { products, setProducts, showToast } = useApp();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [barcodePreview, setBarcodePreview] = useState<Product | null>(null);
  const [printProducts, setPrintProducts] = useState<Product[] | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const rows = products.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()));
  const selectedProducts = products.filter((product) => selectedIds.includes(product.id));
  const fixProductCodes = () => {
    const migrated = migrateProductCodes(products);
    setProducts(migrated.products as Product[]);
    showToast(migrated.fixedCount ? `Fixed ${migrated.fixedCount} product code(s)` : "Product codes already look good");
  };
  return (
    <section className="page">
      <PageHeader title="Inventory" subtitle="Manage your products and stock levels." action={<div className="toolbar-actions">{bulkMode ? <><button className="outline" onClick={() => { setBulkMode(false); setSelectedIds([]); }}>Cancel</button><button className="primary" disabled={!selectedIds.length} onClick={() => setPrintProducts(selectedProducts)}>{selectedIds.length} selected · Print Labels</button></> : <><button className="outline" onClick={fixProductCodes}>Fix Codes</button><button className="outline" onClick={() => setBulkMode(true)}>Print Labels</button><button className="primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} />Add Product</button></>}</div>} />
      <label className="searchbox top-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search inventory..." /></label>
      <DataTable headers={[...(bulkMode ? ["Select"] : []), "Product Name", "SKU", "Category", "Unit", "Price", "GST", "Stock", "Actions"]}>
        {rows.map((p) => <tr key={p.id}>{bulkMode ? <td><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id))} /></td> : null}<td><strong>{p.name}</strong>{p.barcode ? <button className="barcode-mini" title="View barcode" onClick={() => setBarcodePreview(p)}><ScanBarcode size={15} /></button> : null}</td><td className="linkish">{p.sku}</td><td>{p.category}</td><td>{unitLabel(p.unitType)}</td><td>{INR.format(p.price)}</td><td><GSTPill rate={p.gstRate} /></td><td><span className={`stock-pill ${p.stock <= 10 ? "low" : ""}`}>{p.stock}</span></td><td className="actions"><button onClick={() => { setEditing(p); setOpen(true); }}><Edit size={16} /></button><button onClick={() => setPrintProducts([p])} title="Print labels"><ScanBarcode size={16} /></button><button onClick={() => setProducts((items) => items.filter((item) => item.id !== p.id))}><Trash2 size={16} /></button></td></tr>)}
      </DataTable>
      {open && <ProductModal product={editing} onClose={() => setOpen(false)} onSave={(product) => {
        setProducts((items) => editing ? items.map((item) => item.id === editing.id ? product : item) : [...items, product]);
        showToast(editing ? "Product updated" : "Product created");
        setOpen(false);
      }} />}
      {barcodePreview && <BarcodePreviewModal product={barcodePreview} onClose={() => setBarcodePreview(null)} onPrint={() => setPrintProducts(barcodePreview ? [barcodePreview] : null)} onCopied={() => showToast("Copied!")} />}
      {printProducts && <PrintLabelsModal products={printProducts} onClose={() => setPrintProducts(null)} />}
    </section>
  );
}

function ProductModal({ product, onClose, onSave }: { product: Product | null; onClose: () => void; onSave: (product: Product) => void }) {
  const { products } = useApp();
  const [form, setForm] = useState<Product>(() => {
    const id = product?.id ?? crypto.randomUUID();
    const category = product?.category ?? "";
    return product ?? { id, name: "", sku: generateUniqueSKU(category || "GEN", products, id), category, gstRate: 0, price: 0, stock: 0, unitType: "piece", barcode: generateUniqueBarcode(products, id) };
  });
  const [gstEnabled, setGstEnabled] = useState(form.gstRate > 0);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [skuEdited, setSkuEdited] = useState(false);
  const [barcodeEdited, setBarcodeEdited] = useState(false);
  const [skuError, setSkuError] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const required = form.name && form.category && form.price > 0 && form.stock >= 0 && form.unitType && form.sku && form.barcode && !skuError && !barcodeError;
  const update = <K extends keyof Product>(key: K, value: Product[K]) => setForm((draft) => ({ ...draft, [key]: value }));
  const barcodeValue = form.barcode?.trim() ?? "";
  const barcodePreview = barcodeValue.length >= 8 ? safeBarcodeSVG(barcodeValue) : "";
  const regenerateSKU = (category = form.category || "GEN") => {
    update("sku", generateUniqueSKU(category, products, form.id));
    setSkuEdited(false);
  };
  const regenerateBarcode = () => {
    update("barcode", generateUniqueBarcode(products, form.id));
    setBarcodeEdited(false);
  };
  const updateCategory = (value: string) => {
    setForm((draft) => ({ ...draft, category: value, sku: product ? draft.sku : generateUniqueSKU(value || "GEN", products, draft.id) }));
  };
  useEffect(() => {
    const nextSKU = form.sku.trim();
    if (!nextSKU) {
      setSkuError("SKU is required");
    } else if (!isSKUUnique(nextSKU, products, form.id)) {
      setSkuError("SKU already used by another product");
    } else {
      setSkuError("");
    }

    const nextBarcode = form.barcode.trim();
    if (!nextBarcode) {
      setBarcodeError("Barcode is required");
    } else if (!isValidEAN13(nextBarcode)) {
      setBarcodeError("Invalid EAN-13 barcode");
    } else if (!isBarcodeUnique(nextBarcode, products, form.id)) {
      setBarcodeError("Barcode already assigned to another product");
    } else {
      setBarcodeError("");
    }
  }, [form.sku, form.barcode, form.id, products]);
  const saveProduct = () => {
    const nextProduct = { ...form, sku: form.sku.trim().toUpperCase(), barcode: form.barcode.trim() };
    const skuOk = Boolean(nextProduct.sku) && isSKUUnique(nextProduct.sku, products, nextProduct.id);
    const barcodeOk = Boolean(nextProduct.barcode) && isValidEAN13(nextProduct.barcode) && isBarcodeUnique(nextProduct.barcode, products, nextProduct.id);
    setSkuError(skuOk ? "" : "Duplicate or missing SKU — click regenerate");
    setBarcodeError(barcodeOk ? "" : "Duplicate or invalid barcode — click regenerate");
    if (nextProduct.name && nextProduct.category && nextProduct.price > 0 && nextProduct.stock >= 0 && nextProduct.unitType && skuOk && barcodeOk) {
      onSave(nextProduct);
    }
  };
  return (
    <Modal onClose={onClose} className="product-modal">
      <div className="modal-head"><h2>{product ? "Edit Product" : "Add New Product"}</h2><button onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid two"><TextField label="Product Name" value={form.name} onChange={(v) => update("name", v)} placeholder="e.g. Cotton T-Shirt" /><TextField label="Category" value={form.category} onChange={updateCategory} placeholder="e.g. Apparel" /></div>
      <div className="form-grid three"><TextField label="Price (₹)" type="number" value={String(form.price)} onChange={(v) => update("price", Number(v))} /><TextField label="Stock Level" type="number" value={String(form.stock)} onChange={(v) => update("stock", Number(v))} /><label className="field"><span>Unit Type</span><select value={form.unitType} onChange={(e) => update("unitType", e.target.value as UnitType)}><option value="piece">Piece (Integer)</option><option value="kg">Kg (Decimal)</option><option value="meter">Meter (Decimal)</option><option value="liter">Liter (Decimal)</option></select>{form.unitType === "meter" && <small>ℹ Fabric Quantity Modal will appear at POS checkout</small>}</label></div>
      <div className="form-grid two">
        <label className="field"><span>SKU {skuEdited ? <em className="edited-note">Edited — verify uniqueness</em> : null}</span><div className="code-field-row"><input className="mono-input" value={form.sku} onChange={(event) => { setSkuEdited(true); update("sku", event.target.value.toUpperCase()); }} placeholder="APP-047823" /><button className="outline icon-only" type="button" title="Regenerate SKU" onClick={() => regenerateSKU()}>↻</button></div>{skuError ? <small className="field-error">{skuError}</small> : <small>Auto-generated from category and kept unique.</small>}</label>
        <label className="field"><span>Barcode {barcodeEdited ? <em className="edited-note">Edited — verify uniqueness</em> : null}</span><div className="barcode-field-row"><input className="mono-input" value={form.barcode} onChange={(event) => { setBarcodeEdited(true); update("barcode", event.target.value.replace(/\D/g, "").slice(0, 13)); }} placeholder="8901234567890" /><button className="outline icon-only" type="button" title="Regenerate barcode" onClick={regenerateBarcode}>↻</button>{isMobileBrowser() ? <button className="outline" type="button" onClick={() => setScannerOpen(true)}>Scan</button> : null}</div>{barcodeError ? <small className="field-error">{barcodeError}</small> : <small>Unique EAN-13 barcode for printing and scanning.</small>}</label>
      </div>
      {barcodePreview ? <div className="barcode-preview" dangerouslySetInnerHTML={{ __html: barcodePreview }} /> : null}
      <div className="toggle-row"><strong>Enable GST Tax</strong><button className={`switch ${gstEnabled ? "on" : ""}`} onClick={() => { setGstEnabled(!gstEnabled); update("gstRate", !gstEnabled ? 5 : 0); }}><span /></button></div>
      {gstEnabled && <label className="field"><span>GST Rate (%)</span><select value={form.gstRate} onChange={(e) => update("gstRate", Number(e.target.value))}><option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option></select></label>}
      <div className="modal-actions end"><button className="primary" disabled={!required} onClick={saveProduct}>{product ? "Update Product" : "Create Product"}</button></div>
      <BarcodeScannerModal visible={scannerOpen} onClose={() => setScannerOpen(false)} onScanned={(value) => { setBarcodeEdited(true); update("barcode", value.replace(/\D/g, "").slice(0, 13)); setScannerOpen(false); }} />
    </Modal>
  );
}

function BarcodePreviewModal({ product, onClose, onPrint, onCopied }: { product: Product; onClose: () => void; onPrint: () => void; onCopied: () => void }) {
  const value = product.barcode || product.sku;
  const svg = safeBarcodeSVG(value, { height: 100, width: 2.5 });
  return (
    <Modal onClose={onClose} className="drawer-modal">
      <div className="modal-head"><div><h2>{product.name}</h2><p>Product Barcode</p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="barcode-large" dangerouslySetInnerHTML={{ __html: svg }} />
      <code className="barcode-number">{value}</code>
      <p className="muted">SKU: {product.sku}</p>
      <div className="modal-actions"><button className="primary" onClick={onPrint}>Print Labels</button><button className="outline" onClick={async () => { await navigator.clipboard?.writeText(value); onCopied(); }}>Copy</button></div>
    </Modal>
  );
}

function PrintLabelsModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const [copies, setCopies] = useState(1);
  const [size, setSize] = useState<LabelSize>("medium");
  const first = products[0];
  const previewSvg = first ? safeBarcodeSVG(first.barcode || first.sku, { height: size === "large" ? 55 : size === "small" ? 30 : 40, fontSize: 8 }) : "";
  return (
    <Modal onClose={onClose} className="drawer-modal">
      <div className="modal-head"><div><h2>Print Barcode Labels</h2><p>{products.length === 1 ? products[0].name : `${products.length} products selected`}</p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="label-control-row"><span>Copies per product</span><div className="mini-stepper"><button onClick={() => setCopies((value) => Math.max(1, value - 1))}>−</button><strong>{copies}</strong><button onClick={() => setCopies((value) => Math.min(200, value + 1))}>+</button></div></div>
      <div className="label-size-row">{(["small", "medium", "large"] as LabelSize[]).map((item) => <button key={item} className={`chip ${size === item ? "active" : ""}`} onClick={() => setSize(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div>
      {first ? <div className="label-preview"><strong>{first.name}</strong><div dangerouslySetInnerHTML={{ __html: previewSvg }} /><span>{INR.format(first.price)} · {first.sku}</span></div> : null}
      <div className="modal-actions"><button className="outline" onClick={onClose}>Cancel</button><button className="primary" onClick={() => printLabels(products.map((product) => ({ product, copies, size })))}>Print</button></div>
    </Modal>
  );
}

function DateRangeFilter({ mode, setMode, customFrom, setCustomFrom, customTo, setCustomTo }: { mode: DateRangeMode; setMode: (mode: DateRangeMode) => void; customFrom: string; setCustomFrom: (value: string) => void; customTo: string; setCustomTo: (value: string) => void }) {
  return (
    <div className="range-filter">
      {(["today", "week", "month", "custom"] as DateRangeMode[]).map((item) => <button key={item} className={`chip ${mode === item ? "active" : ""}`} onClick={() => setMode(item)}>{item === "today" ? "Today" : item === "week" ? "This Week" : item === "month" ? "This Month" : "Custom"}</button>)}
      {mode === "custom" ? <><input type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} /><input type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} /></> : null}
    </div>
  );
}

function Performance() {
  const { invoices, staff, attendance, setAttendance, showToast } = useApp();
  const [tab, setTab] = useState<"sales" | "attendance">("sales");
  const [rangeMode, setRangeMode] = useState<DateRangeMode>("today");
  const [customFrom, setCustomFrom] = useState(dateInputKey(new Date()));
  const [customTo, setCustomTo] = useState(dateInputKey(new Date()));
  const range = rangeBounds(rangeMode, customFrom, customTo);
  const owner = staff.find((member) => member.role === "Owner") ?? staff[0];

  return (
    <section className="page">
      <PageHeader title="Performance" subtitle="Owner-only sales performance and attendance management." action={<DateRangeFilter mode={rangeMode} setMode={setRangeMode} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />} />
      <div className="tab-row"><button className={tab === "sales" ? "active" : ""} onClick={() => setTab("sales")}>Sales Performance</button><button className={tab === "attendance" ? "active" : ""} onClick={() => setTab("attendance")}>Attendance</button></div>
      {tab === "sales" ? <SalesPerformanceTab invoices={invoices} staff={staff} range={range} rangeMode={rangeMode} /> : <AttendanceTab staff={staff} owner={owner} attendance={attendance} setAttendance={setAttendance} showToast={showToast} range={range} rangeMode={rangeMode} customFrom={customFrom} customTo={customTo} />}
    </section>
  );
}

function SalesPerformanceTab({ invoices, staff, range, rangeMode }: { invoices: Invoice[]; staff: Staff[]; range: { from: Date; to: Date }; rangeMode: DateRangeMode }) {
  const [selected, setSelected] = useState<string | null>(null);
  const filtered = invoices.filter((invoice) => {
    const time = new Date(invoice.date).getTime();
    return time >= range.from.getTime() && time <= range.to.getTime();
  });
  const stats = Object.values(filtered.reduce((acc, invoice) => {
    const id = invoice.salespersonId || "unassigned";
    const name = invoice.salespersonName || invoice.staff || "Unassigned";
    if (!acc[id]) acc[id] = { salespersonId: id, salespersonName: name, salesCount: 0, totalRevenue: 0, returnsCount: 0, returnsValue: 0 };
    if (invoice.status === "Refunded") {
      acc[id].returnsCount += 1;
      acc[id].returnsValue += invoice.total;
    } else {
      acc[id].salesCount += 1;
      acc[id].totalRevenue += invoice.total;
    }
    return acc;
  }, {} as Record<string, { salespersonId: string; salespersonName: string; salesCount: number; totalRevenue: number; returnsCount: number; returnsValue: number }>))
    .map((row) => ({ ...row, avgSaleValue: row.salesCount ? row.totalRevenue / row.salesCount : 0, netRevenue: row.totalRevenue - row.returnsValue }))
    .sort((a, b) => (a.salespersonId === "unassigned" ? 1 : b.salespersonId === "unassigned" ? -1 : b.netRevenue - a.netRevenue));
  const totalSales = stats.reduce((sum, row) => sum + row.totalRevenue, 0);
  const salesCount = stats.reduce((sum, row) => sum + row.salesCount, 0);
  const top = stats[0];
  const activeToday = new Set(filtered.map((invoice) => invoice.salespersonId || "unassigned")).size;
  const exportRows = () => {
    const rows = [["Rank", "Name", "Role", "Sales Count", "Total Revenue", "Avg Sale", "Returns Count", "Returns Value", "Net Revenue"], ...stats.map((row, index) => {
      const member = staff.find((item) => item.id === row.salespersonId);
      return [index + 1, row.salespersonName, member?.role ?? "Unassigned", row.salesCount, row.totalRevenue.toFixed(2), row.avgSaleValue.toFixed(2), row.returnsCount, row.returnsValue.toFixed(2), row.netRevenue.toFixed(2)];
    })];
    downloadFile(`performance_${rangeMode}_${Date.now()}.csv`, `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
  };
  const selectedRows = selected ? filtered.filter((invoice) => (invoice.salespersonId || "unassigned") === selected).sort((a, b) => invoiceTime(b) - invoiceTime(a)) : [];

  return (
    <>
      <div className="performance-actions"><button className="outline" onClick={exportRows}>Export CSV</button></div>
      <div className="performance-cards">
        <div><span>Top Performer</span><strong>{top?.salespersonName ?? "No sales"}</strong><small>{top ? `${INR.format(top.netRevenue)} in ${top.salesCount} sales` : "No transactions"}</small></div>
        <div><span>Total Sales</span><strong>{INR.format(totalSales)}</strong><small>{salesCount} transactions</small></div>
        <div><span>Active Today</span><strong>{activeToday}</strong><small>Out of {staff.length} members</small></div>
        <div><span>Avg Sale Value</span><strong>{INR.format(salesCount ? totalSales / salesCount : 0)}</strong><small>Across all staff</small></div>
      </div>
      <DataTable headers={["Rank", "Salesperson", "Sales Count", "Total Revenue", "Avg Sale", "Returns", "Net Revenue"]}>
        {stats.length ? stats.map((row, index) => {
          const member = staff.find((item) => item.id === row.salespersonId);
          return <tr key={row.salespersonId} onClick={() => setSelected(row.salespersonId)} className={row.salespersonId === "unassigned" ? "muted-row" : ""}><td><span className="rank-badge">{index + 1}</span></td><td><div className="person-cell"><div className="avatar sm">{staffInitials(row.salespersonName)}</div><strong>{row.salespersonName}</strong><small>{member?.role ?? "Unassigned"}</small></div></td><td>{row.salesCount}</td><td>{INR.format(row.totalRevenue)}</td><td>{INR.format(row.avgSaleValue)}</td><td className={row.returnsCount ? "red-text" : "muted"}>{row.returnsCount} · {INR.format(row.returnsValue)}</td><td><strong className="green-text">{INR.format(row.netRevenue)}</strong></td></tr>;
        }) : <tr><td className="empty-table" colSpan={7}>No performance data for this range.</td></tr>}
      </DataTable>
      {selected ? <Modal onClose={() => setSelected(null)} className="drawer-modal"><div className="modal-head"><div><h2>{stats.find((row) => row.salespersonId === selected)?.salespersonName}</h2><p>Sales in selected date range</p></div><button onClick={() => setSelected(null)}><X size={20} /></button></div><div className="demo-box">{selectedRows.length ? selectedRows.map((invoice) => <span key={invoice.id}>{invoice.date} · {invoice.id} · {invoice.items} · {INR.format(invoice.total)} · {invoice.status}</span>) : <span>No sales found.</span>}</div></Modal> : null}
    </>
  );
}

function AttendanceTab({ staff, owner, attendance, setAttendance, showToast, range, rangeMode, customFrom, customTo }: { staff: Staff[]; owner: Staff; attendance: AttendanceRecord[]; setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>; showToast: AppState["showToast"]; range: { from: Date; to: Date }; rangeMode: DateRangeMode; customFrom: string; customTo: string }) {
  const [subtab, setSubtab] = useState<"mark" | "report" | "summary">("mark");
  return (
    <>
      <div className="tab-row sub"><button className={subtab === "mark" ? "active" : ""} onClick={() => setSubtab("mark")}>Mark Attendance</button><button className={subtab === "report" ? "active" : ""} onClick={() => setSubtab("report")}>Attendance Report</button><button className={subtab === "summary" ? "active" : ""} onClick={() => setSubtab("summary")}>Monthly Summary</button></div>
      {subtab === "mark" ? <MarkAttendance staff={staff} owner={owner} attendance={attendance} setAttendance={setAttendance} showToast={showToast} /> : subtab === "report" ? <AttendanceReport staff={staff} attendance={attendance} range={range} rangeMode={rangeMode} /> : <MonthlySummary staff={staff} attendance={attendance} customFrom={customFrom} customTo={customTo} />}
    </>
  );
}

function MarkAttendance({ staff, owner, attendance, setAttendance, showToast }: { staff: Staff[]; owner: Staff; attendance: AttendanceRecord[]; setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>; showToast: AppState["showToast"] }) {
  const [date, setDate] = useState(dateInputKey(new Date()));
  const recordsForDate = attendance.filter((record) => record.date === date);
  const makeDrafts = () => staff.map((member) => recordsForDate.find((record) => record.staffId === member.id) ?? { id: `${date}-${member.id}`, staffId: member.id, staffName: member.name, date, status: "present" as AttendanceStatus, checkInTime: "09:30", checkOutTime: "18:00", hoursWorked: 8.5, markedBy: owner.id, markedAt: new Date().toISOString() });
  const [drafts, setDrafts] = useState<AttendanceRecord[]>(makeDrafts);
  useEffect(() => setDrafts(makeDrafts()), [date, attendance, staff]);
  const update = (staffId: string, patch: Partial<AttendanceRecord>) => setDrafts((rows) => rows.map((row) => {
    if (row.staffId !== staffId) return row;
    const next = { ...row, ...patch };
    return { ...next, hoursWorked: hoursBetween(next.checkInTime, next.checkOutTime) };
  }));
  const copyYesterday = () => {
    const prev = new Date(date);
    prev.setDate(prev.getDate() - 1);
    const key = dateInputKey(prev);
    const previous = attendance.filter((record) => record.date === key);
    if (!previous.length) return;
    setDrafts(staff.map((member) => {
      const old = previous.find((record) => record.staffId === member.id);
      return old ? { ...old, id: `${date}-${member.id}`, date, staffName: member.name, markedAt: new Date().toISOString(), updatedAt: new Date().toISOString() } : drafts.find((record) => record.staffId === member.id)!;
    }));
  };
  const save = () => {
    const timestamp = new Date().toISOString();
    const nextDrafts = drafts.map((record) => ({ ...record, date, markedBy: owner.id, markedAt: record.markedAt || timestamp, updatedAt: timestamp }));
    setAttendance((rows) => [...rows.filter((record) => record.date !== date), ...nextDrafts]);
    showToast(`Attendance saved for ${date}`);
  };
  return (
    <div className="attendance-panel">
      <div className="attendance-head"><strong>Attendance — {longDate(new Date(date))}</strong><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
      {recordsForDate.length ? <div className="success-banner">Attendance marked for this date — tap to edit</div> : null}
      <div className="attendance-actions"><button className="outline" onClick={() => setDrafts((rows) => rows.map((row) => ({ ...row, status: "present", checkInTime: row.checkInTime || "09:30", checkOutTime: row.checkOutTime || "18:00", hoursWorked: hoursBetween(row.checkInTime || "09:30", row.checkOutTime || "18:00") })))}>Mark All Present</button><button className="outline" onClick={copyYesterday}>Copy Yesterday</button></div>
      <div className="attendance-list">{drafts.map((record) => <AttendanceRow key={record.staffId} record={record} staff={staff.find((member) => member.id === record.staffId)} update={update} />)}</div>
      <button className="primary full" onClick={save}>Save Attendance</button>
    </div>
  );
}

function AttendanceRow({ record, staff, update }: { record: AttendanceRecord; staff?: Staff; update: (staffId: string, patch: Partial<AttendanceRecord>) => void }) {
  const showTime = ["present", "late", "half-day"].includes(record.status);
  return (
    <div className={`attendance-row ${record.status}`}>
      <div className="person-cell"><div className="avatar sm">{staffInitials(record.staffName)}</div><strong>{record.staffName}</strong><small>{staff?.role}</small></div>
      <div className="status-pills">{(["present", "absent", "half-day", "late", "leave"] as AttendanceStatus[]).map((status) => <button key={status} className={`${status} ${record.status === status ? "active" : ""}`} onClick={() => update(record.staffId, { status })}>{statusShort(status)}</button>)}</div>
      {showTime ? <><input type="time" value={record.checkInTime ?? ""} onChange={(event) => update(record.staffId, { checkInTime: event.target.value })} /><input type="time" value={record.checkOutTime ?? ""} onChange={(event) => update(record.staffId, { checkOutTime: event.target.value })} /><small>{record.hoursWorked === undefined ? "Invalid time" : `${record.hoursWorked} hrs`}</small></> : <span className="muted">No hours</span>}
      <input value={record.notes ?? ""} onChange={(event) => update(record.staffId, { notes: event.target.value })} placeholder="Note" />
    </div>
  );
}

function AttendanceReport({ staff, attendance, range, rangeMode }: { staff: Staff[]; attendance: AttendanceRecord[]; range: { from: Date; to: Date }; rangeMode: DateRangeMode }) {
  const [staffId, setStaffId] = useState("All Staff");
  const [view, setView] = useState<"list" | "calendar">("list");
  const rows = attendance.filter((record) => {
    const time = new Date(record.date).getTime();
    return time >= range.from.getTime() && time <= range.to.getTime() && (staffId === "All Staff" || record.staffId === staffId);
  }).sort((a, b) => b.date.localeCompare(a.date));
  const exportRows = () => {
    const data = [["Date", "Staff Name", "Role", "Status", "Check-in", "Check-out", "Hours Worked", "Notes"], ...rows.map((record) => [record.date, record.staffName, staff.find((member) => member.id === record.staffId)?.role ?? "", statusLabel(record.status), record.checkInTime ?? "", record.checkOutTime ?? "", record.hoursWorked ?? "", record.notes ?? ""])];
    downloadFile(`attendance_${rangeMode}_${Date.now()}.csv`, `\uFEFF${data.map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
  };
  return (
    <div className="attendance-panel">
      <div className="filters"><select value={staffId} onChange={(event) => setStaffId(event.target.value)}><option>All Staff</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><div className="tab-row compact"><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}>List View</button><button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>Calendar View</button></div><button className="outline" onClick={exportRows}>Export Attendance</button></div>
      {view === "list" ? <DataTable headers={["Date", "Staff Name", "Status", "Check-in", "Check-out", "Hours", "Notes"]}>{rows.length ? rows.map((record) => <tr key={record.id}><td>{longDate(new Date(record.date))}</td><td>{record.staffName}</td><td><span className={`attendance-badge ${record.status}`}>{statusLabel(record.status)}</span></td><td>{record.checkInTime ?? "--"}</td><td>{record.checkOutTime ?? "--"}</td><td>{record.hoursWorked ?? "--"}</td><td>{record.notes ?? ""}</td></tr>) : <tr><td className="empty-table" colSpan={7}>No attendance records found.</td></tr>}</DataTable> : <AttendanceCalendar records={rows} staff={staff} month={range.from} />}</div>
  );
}

function AttendanceCalendar({ records, staff, month }: { records: AttendanceRecord[]; staff: Staff[]; month: Date }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: offset + total }, (_, index) => index < offset ? null : new Date(month.getFullYear(), month.getMonth(), index - offset + 1));
  return <div className="attendance-calendar">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <strong key={day}>{day}</strong>)}{cells.map((day, index) => <div key={index} className="calendar-cell">{day ? <><b>{day.getDate()}</b><div>{staff.map((member) => {
    const record = records.find((row) => row.staffId === member.id && row.date === dateInputKey(day));
    return <span key={member.id} title={`${member.name}: ${record ? statusLabel(record.status) : "No record"}`} className={`dot ${record?.status ?? "none"}`} />;
  })}</div></> : null}</div>)}</div>;
}

function MonthlySummary({ staff, attendance, customFrom }: { staff: Staff[]; attendance: AttendanceRecord[]; customFrom: string; customTo: string }) {
  const [month, setMonth] = useState(customFrom.slice(0, 7));
  const monthDate = new Date(`${month}-01T00:00:00`);
  const totalDays = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const rows = staff.map((member) => {
    const records = attendance.filter((record) => record.staffId === member.id && record.date.startsWith(month));
    const present = records.filter((record) => record.status === "present").length;
    const absent = records.filter((record) => record.status === "absent").length;
    const half = records.filter((record) => record.status === "half-day").length;
    const late = records.filter((record) => record.status === "late").length;
    const leave = records.filter((record) => record.status === "leave").length;
    const hours = records.reduce((sum, record) => sum + (record.hoursWorked ?? 0), 0);
    const percentage = totalDays ? ((present + late + half * 0.5) / totalDays) * 100 : 0;
    return { member, present, absent, half, late, leave, hours, percentage, salaryDays: present + late + half * 0.5 + leave };
  });
  const perfect = rows.filter((row) => row.percentage >= 100).length;
  const avg = rows.length ? rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length : 0;
  const mostAbsent = [...rows].sort((a, b) => b.absent - a.absent)[0];
  const exportRows = () => {
    const data = [["Staff", "Role", "Present", "Absent", "Half-Day", "Late", "Leave", "Total Hours", "Attendance %", "Salary Days"], ...rows.map((row) => [row.member.name, row.member.role, row.present, row.absent, row.half, row.late, row.leave, row.hours.toFixed(2), row.percentage.toFixed(2), row.salaryDays])];
    downloadFile(`attendance-summary_${month}_${Date.now()}.csv`, `\uFEFF${data.map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
  };
  return (
    <div className="attendance-panel">
      <div className="attendance-head"><button className="outline" onClick={() => setMonth(dateInputKey(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)).slice(0, 7))}>Prev</button><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><button className="outline" onClick={() => setMonth(dateInputKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)).slice(0, 7))}>Next</button><button className="outline" onClick={exportRows}>Export Summary</button></div>
      <div className="performance-cards"><div><span>Working Days</span><strong>{totalDays}</strong><small>Calendar days</small></div><div><span>Perfect Attendance</span><strong>{perfect}</strong><small>Staff at 100%</small></div><div><span>Avg Attendance</span><strong>{avg.toFixed(1)}%</strong><small>Across team</small></div><div><span>Most Absent</span><strong>{mostAbsent?.member.name ?? "None"}</strong><small>{mostAbsent?.absent ?? 0} absent days</small></div></div>
      <DataTable headers={["Staff", "Present", "Absent", "Half-Day", "Late", "Leave", "Hours", "Attendance %", "Salary Days"]}>{rows.map((row) => <tr key={row.member.id}><td>{row.member.name}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.half}</td><td>{row.late}</td><td>{row.leave}</td><td>{row.hours.toFixed(1)}</td><td><span className={`attendance-percent ${row.percentage >= 90 ? "good" : row.percentage >= 75 ? "warn" : "bad"}`}>{row.percentage.toFixed(1)}%</span></td><td><input className="salary-days-input" type="number" defaultValue={row.salaryDays} /></td></tr>)}</DataTable>
    </div>
  );
}

function Customers() {
  const { customers } = useApp();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const rows = customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="page">
      <PageHeader title="Customers" subtitle="Manage your customer base and view their history." action={<button className="primary"><Plus size={16} />Add Customer</button>} />
      <label className="searchbox top-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers..." /></label>
      <DataTable headers={["Customer Name", "Contact Info", "Total Spent", "Last Visit", "Actions"]}>
        {rows.map((c) => <tr key={c.email}><td><div className="person-cell"><div className="avatar sm">{c.name[0]}</div><strong>{c.name}</strong></div></td><td><span>{c.email}</span><small>{c.phone}</small></td><td>{INR.format(c.spent)}</td><td>{c.lastVisit}</td><td><button className="link-button" onClick={() => setSelected(c)}><Eye size={16} />View History</button></td></tr>)}
      </DataTable>
      {selected && <Modal onClose={() => setSelected(null)} className="drawer-modal"><div className="modal-head"><h2>{selected.name} History</h2><button onClick={() => setSelected(null)}><X size={20} /></button></div><p className="muted">Recent invoices for {selected.email}</p><div className="demo-box"><span>INV-0001 · Card · {INR.format(119.98)}</span><span>INV-0003 · Card · {INR.format(259.97)}</span></div></Modal>}
    </section>
  );
}

function Reports() {
  const { invoices, expenses, setExpenses, showToast } = useApp();
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [expenseOpen, setExpenseOpen] = useState(false);
  const activeInvoices = period === "day" ? invoices.slice(0, 2) : invoices;
  const activeExpenses = period === "day" ? expenses.slice(0, 2) : period === "week" ? expenses.slice(0, 3) : expenses;
  const incoming = activeInvoices.filter((invoice) => invoice.status === "Completed").reduce((sum, invoice) => sum + invoice.total, 0);
  const outgoing = activeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netCash = incoming - outgoing;
  const gstPayable = activeInvoices.filter((invoice) => invoice.status === "Completed").reduce((sum, invoice) => sum + invoice.gst, 0);
  const deductibleExpenses = activeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const taxableSales = Math.max(0, incoming - gstPayable);
  const auditChecks = [
    { label: "GST payable", value: INR.format(gstPayable), detail: "Tax collected from completed invoices", tone: "info" },
    { label: "Deductible expenses", value: INR.format(deductibleExpenses), detail: "Recorded outgoing business expenses", tone: "warning" },
    { label: "Taxable sales after GST", value: INR.format(taxableSales), detail: "Sales amount before GST settlement", tone: "critical" },
  ] as const;
  const chartData = period === "month" ? monthlyData : weeklyData;
  const chartKey = period === "month" ? "month" : "day";
  const periodTitle = period === "day" ? "Day Sales" : period === "week" ? "Weekly Sales" : "Monthly Sales";

  return (
    <section className="page">
      <PageHeader title="Reports" subtitle="Sales, cash flow, expenses, and audit activity." action={<button className="primary" onClick={() => setExpenseOpen(true)}><Plus size={16} />Add Expense</button>} />
      <div className="tabs"><button className={period === "day" ? "active" : ""} onClick={() => setPeriod("day")}>Day Sales</button><button className={period === "week" ? "active" : ""} onClick={() => setPeriod("week")}>Weekly Sales</button><button className={period === "month" ? "active" : ""} onClick={() => setPeriod("month")}>Monthly Sales</button></div>
      <div className="cashflow-grid">
        <div className="card cash-card"><span>Incoming Sales</span><strong>{INR.format(incoming)}</strong><small>{activeInvoices.length} invoices</small></div>
        <div className="card cash-card"><span>Outgoing Expenses</span><strong>{INR.format(outgoing)}</strong><small>{activeExpenses.length} expenses</small></div>
        <div className="card cash-card"><span>Net Cash Flow</span><strong className={netCash >= 0 ? "green-text" : "red-text"}>{INR.format(netCash)}</strong><small>{periodTitle}</small></div>
      </div>
      <div className="report-grid">
        <div className="card chart-card report-chart-card"><h2>{periodTitle}</h2><RevenueChart data={chartData} xKey={chartKey} height={390} /></div>
        <div className="card audit-card"><h2>Business Audit</h2>{auditChecks.map((item) => <div className="audit-row" key={item.label}><div><strong>{item.label}</strong><span>{item.detail}</span></div><span className={`audit-pill ${item.tone}`}>{item.value}</span></div>)}</div>
      </div>
      <DataTable headers={["Invoice", "Date", "Customer", "Total Amount", "Payment", "Status"]}>
        {activeInvoices.map((invoice) => <tr key={invoice.id}><td className="linkish">{invoice.id}</td><td>{invoice.date}</td><td>{invoice.customer}</td><td><strong>{INR.format(invoice.total)}</strong></td><td>{invoice.payment}</td><td><span className={`status ${invoice.status.toLowerCase()}`}>{invoice.status}</span></td></tr>)}
      </DataTable>
      <DataTable headers={["Expense", "Date", "Category", "Vendor", "Amount", "Payment"]}>
        {activeExpenses.map((expense) => <tr key={expense.id}><td className="linkish">{expense.id}</td><td>{expense.date}</td><td>{expense.category}</td><td>{expense.vendor}</td><td><strong>{INR.format(expense.amount)}</strong></td><td>{expense.payment}</td></tr>)}
      </DataTable>
      <DataTable headers={["Audit Item", "Basis", "Amount", "Business Note"]}>
        {auditChecks.map((item) => <tr key={item.label}><td className="linkish">{item.label}</td><td>{periodTitle}</td><td><strong>{item.value}</strong></td><td>{item.detail}</td></tr>)}
      </DataTable>
      {expenseOpen && <ExpenseModal onClose={() => setExpenseOpen(false)} onSave={(expense) => {
        setExpenses((items) => [expense, ...items]);
        setExpenseOpen(false);
        showToast(`${expense.id} added`);
      }} />}
    </section>
  );
}

function ExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (expense: Expense) => void }) {
  const [category, setCategory] = useState("Inventory");
  const [otherCategory, setOtherCategory] = useState("");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [payment, setPayment] = useState("Cash");
  const valid = Number(amount) > 0;
  const savedCategory = category === "Other" && otherCategory.trim() ? otherCategory.trim() : category;

  return (
    <Modal onClose={onClose} className="drawer-modal">
      <div className="modal-head"><div><h2>Add Expense</h2><p>Record outgoing cash for reports.</p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid two"><label className="field"><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value)}><option>Inventory</option><option>Rent</option><option>Utilities</option><option>Packaging</option><option>Maintenance</option><option>Salary</option><option>Other</option></select></label><TextField label="Vendor / Note" value={vendor} onChange={setVendor} placeholder="e.g. Supplier Hub" /></div>
      {category === "Other" && <TextField label="Other Category (Optional)" value={otherCategory} onChange={setOtherCategory} placeholder="e.g. Travel, repairs" />}
      <div className="form-grid two"><TextField label="Amount" type="number" value={amount} onChange={setAmount} placeholder="0.00" /><label className="field"><span>Payment</span><select value={payment} onChange={(e) => setPayment(e.target.value)}><option>Cash</option><option>Card</option><option>UPI</option><option>Bank</option></select></label></div>
      <div className="modal-actions end"><button className="outline" onClick={onClose}>Cancel</button><button className="primary" disabled={!valid} onClick={() => valid && onSave({ id: `EXP-${String(Date.now()).slice(-4)}`, date: "Jun 5, 2026 5:30 PM", category: savedCategory, vendor: vendor.trim() || "-", amount: Number(amount), payment })}>Save Expense</button></div>
    </Modal>
  );
}

function StaffPage() {
  const { staff, setStaff, showToast } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const rows = staff.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="page">
      <PageHeader title="User Management" subtitle="Manage staff access and roles for your store." action={<button className="primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} />Add Staff Member</button>} />
      <label className="searchbox top-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search users..." /></label>
      <DataTable headers={["Name", "Email", "Role", "Actions"]}>
        {rows.map((s) => <tr key={s.id}><td><div className="person-cell"><div className="avatar sm">{s.name[0]}</div><strong>{s.name}</strong>{s.isCurrent && <span className="you-badge">You</span>}</div></td><td>{s.email}</td><td><span className={`role ${s.role.toLowerCase()}`}>{s.role}</span></td><td className="actions"><button onClick={() => { setEditing(s); setOpen(true); }}><Edit size={16} /></button><button onClick={() => setStaff((items) => items.filter((item) => item.id !== s.id))}><Trash2 size={16} /></button></td></tr>)}
      </DataTable>
      {open && <StaffModal staff={editing} onClose={() => setOpen(false)} onSave={(member) => {
        setStaff((items) => editing ? items.map((item) => item.id === editing.id ? member : item) : [...items, member]);
        showToast(editing ? "Staff account updated" : "Staff account created");
        setOpen(false);
      }} />}
    </section>
  );
}

function StaffModal({ staff, onClose, onSave }: { staff: Staff | null; onClose: () => void; onSave: (staff: Staff) => void }) {
  const [name, setName] = useState(staff?.name ?? "");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [role, setRole] = useState<StaffRole>(staff?.role ?? "Cashier");
  const [password, setPassword] = useState("");
  const valid = name && email && role && (staff ? true : password.length >= 8);
  return (
    <Modal onClose={onClose} className="staff-modal">
      <div className="modal-head"><div><h2>{staff ? "Edit Staff Member" : "Add New Staff Member"}</h2><p>Create a new account for your staff member.</p></div><button onClick={onClose}><X size={20} /></button></div>
      <IconField label="Full Name" icon={<User size={17} />} value={name} onChange={setName} placeholder="e.g. John Doe" />
      <IconField label="Email Address" icon={<Mail size={17} />} value={email} onChange={setEmail} placeholder="e.g. john@retailflow.com" />
      <label className="field"><span>Role</span><div className="select-wrap"><select value={role} onChange={(e) => setRole(e.target.value === "Cashier (POS Only)" ? "Cashier" : e.target.value as StaffRole)}><option>Cashier (POS Only)</option><option>Salesperson</option><option>Manager</option><option>Owner</option></select><ChevronDown size={17} /></div></label>
      <IconField label="Password" icon={<Lock size={17} />} value={password} onChange={setPassword} placeholder={staff ? "Leave blank to keep current" : "Min. 8 characters"} type="password" />
      <div className="modal-actions end"><button className="primary" disabled={!valid} onClick={() => valid && onSave({ id: staff?.id ?? crypto.randomUUID(), name, email, role, isCurrent: staff?.isCurrent })}>{staff ? "Update Account" : "Create Account"}</button></div>
    </Modal>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="field"><span>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}

function IconField(props: { label: string; icon: React.ReactNode; value: string; onChange: (value: string) => void; placeholder: string; type?: string }) {
  return <label className="field"><span>{props.label}</span><div className="staff-icon-field"><div className="staff-field-icon">{props.icon}</div><input type={props.type ?? "text"} value={props.value} onChange={(e) => props.onChange(e.target.value)} placeholder={props.placeholder} /></div></label>;
}

function Modal({ children, onClose, className }: { children: React.ReactNode; onClose: () => void; className?: string }) {
  return <div className="modal-backdrop" onMouseDown={onClose}><div className={`modal ${className ?? ""}`} onMouseDown={(e) => e.stopPropagation()}>{children}</div></div>;
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return <div className="table-card"><table><thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}

export default App;
