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
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  ClipboardList,
  Download,
  Edit,
  Eye,
  IndianRupee,
  Lock,
  LogOut,
  List,
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
  TrendingUp,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser/cjs";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import "./styles.css";
import DateInput from "./components/DateInput";
import { generateBarcodeSVG } from "./utils/barcodeGenerator";
import { getScannerMethod, isMobileBrowser } from "./utils/barcodeScanner";
import { formatDate, formatDateTime } from "./utils/dateUtils";
import { generateUniqueBarcode, generateUniqueSKU, isBarcodeUnique, isSKUUnique, isValidEAN13, migrateProductCodes } from "./utils/generateProductCodes";
import { LabelSize, printLabels } from "./utils/printLabels";
import type { Supplier } from "./types/supplier";
import type { POItem, POStatus, PurchaseOrder } from "./types/purchaseOrder";
import type { ExpenseCategory, PaymentMode } from "./types/expense";
import type { PurchaseBill, PurchaseBillItem, PurchaseBillPaidVia, PurchaseBillPaymentMode, PurchaseBillPaymentStatus } from "./types/purchaseBill";
import type { StockMovement } from "./types/stockMovement";
import type { AccountType, LedgerEntry } from "./types/ledgerEntry";
import { computePnLFromData } from "./utils/computePnL";
import { computeBalanceSheetFromData } from "./utils/computeBalanceSheet";
import { createBillLedgerEntries, createBillPaymentLedgerEntries, createExpenseLedgerEntry, createSaleLedgerEntries } from "./utils/createLedgerEntries";
import { applyPurchaseBillStock } from "./services/purchaseBillService";

type UnitType = "piece" | "kg" | "meter" | "liter";
type StaffRole = "Owner" | "Manager" | "Cashier" | "Staff";
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
  mrp?: number;
  description?: string;
  stock: number;
  costPrice?: number;
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
  customerId?: string;
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
  category: ExpenseCategory;
  description: string;
  vendor?: string;
  amount: number;
  payment: string;
  paymentMode: PaymentMode;
  receiptNo?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
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
  id: string;
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
  return date.toISOString();
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
  { id: "EXP-0001", date: offsetDate(0, 9, 10), category: "inventory", description: "Emergency stock purchase", vendor: "Supplier Hub", amount: 420, payment: "Bank", paymentMode: "bank_transfer", receiptNo: "R-1021", createdBy: "Admin Owner", createdAt: offsetDate(0, 9, 10) },
  { id: "EXP-0002", date: offsetDate(0, 14, 20), category: "utilities", description: "Electricity and internet", vendor: "Power Board", amount: 72.5, payment: "Cash", paymentMode: "cash", receiptNo: "EB-909", createdBy: "Admin Owner", createdAt: offsetDate(0, 14, 20) },
  { id: "EXP-0003", date: offsetDate(-2, 11, 5), category: "marketing", description: "Festival banner printing", vendor: "CarryBag Co", amount: 118.75, payment: "UPI", paymentMode: "upi", createdBy: "Store Manager", createdAt: offsetDate(-2, 11, 5) },
  { id: "EXP-0004", date: offsetDate(-7, 16, 45), category: "maintenance", description: "POS terminal service", vendor: "POS Service", amount: 95, payment: "Card", paymentMode: "card", createdBy: "Admin Owner", createdAt: offsetDate(-7, 16, 45) },
];

const seedSuppliers: Supplier[] = [
  { id: "sup-1", name: "Northstar Textiles", contactPerson: "Ravi Mehta", phone: "98765 43210", email: "ravi@northstar.example", address: "Peenya Industrial Area, Bengaluru", gstin: "29ABCDE1234F1Z5", paymentTerms: "Net 15", notes: "Primary apparel supplier", createdAt: new Date().toISOString(), isActive: true },
  { id: "sup-2", name: "Metro Footwear Supply", contactPerson: "Nisha Rao", phone: "98450 11223", email: "orders@metrofoot.example", address: "K R Market, Bengaluru", gstin: "29PQRSX6789L1Z2", paymentTerms: "Net 7", notes: "Shoes and accessories", createdAt: new Date().toISOString(), isActive: true },
  { id: "sup-3", name: "Fresh Basket Wholesale", contactPerson: "Amit Shah", phone: "99001 77889", email: "sales@freshbasket.example", address: "Yeshwanthpur APMC Yard", gstin: "29LMNOP2468Q1Z8", paymentTerms: "Immediate", notes: "Groceries and oils", createdAt: new Date().toISOString(), isActive: true },
];

function buildPOItem(product: Product, orderedQty: number, receivedQty: number, unitCost: number): POItem {
  const taxable = orderedQty * unitCost;
  const gst = taxable * (product.gstRate / 100);
  return {
    id: crypto.randomUUID(),
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    orderedQty,
    receivedQty,
    unitCost,
    gstRate: product.gstRate,
    cgst: gst / 2,
    sgst: gst / 2,
    igst: 0,
    lineTotal: taxable + gst,
  };
}

function totalsForPO(items: POItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.orderedQty * item.unitCost, 0);
  const totalCGST = items.reduce((sum, item) => sum + item.cgst, 0);
  const totalSGST = items.reduce((sum, item) => sum + item.sgst, 0);
  const totalIGST = items.reduce((sum, item) => sum + item.igst, 0);
  const totalGST = totalCGST + totalSGST + totalIGST;
  return { subtotal, totalCGST, totalSGST, totalIGST, totalGST, grandTotal: subtotal + totalGST };
}

function buildPurchaseBillItem(product: Product, quantity: number, unitCost: number): PurchaseBillItem {
  const taxable = quantity * unitCost;
  const gst = taxable * (product.gstRate / 100);
  return {
    id: crypto.randomUUID(),
    productId: product.id,
    productName: product.name,
    sku: product.sku,
    quantity,
    unit: unitLabel(product.unitType),
    unitCost,
    gstRate: product.gstRate,
    cgst: gst / 2,
    sgst: gst / 2,
    igst: 0,
    lineTotal: taxable + gst,
    updateStock: true,
  };
}

function totalsForPurchaseBill(items: PurchaseBillItem[]) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  const totalCGST = items.reduce((sum, item) => sum + item.cgst, 0);
  const totalSGST = items.reduce((sum, item) => sum + item.sgst, 0);
  const totalIGST = items.reduce((sum, item) => sum + item.igst, 0);
  const totalGST = totalCGST + totalSGST + totalIGST;
  return { subtotal, totalCGST, totalSGST, totalIGST, totalGST, grandTotal: subtotal + totalGST };
}

function purchaseBillDisplayStatus(bill: PurchaseBill) {
  if (bill.balanceDue > 0 && bill.dueDate && new Date(bill.dueDate) < new Date()) return "overdue";
  if (bill.status === "paid") return "paid";
  if (bill.status === "partial_paid") return "partial";
  if (bill.status === "draft") return "draft";
  return "unpaid";
}

function purchaseBillStatusLabel(status: string) {
  return status === "partial" ? "Partial" : status.charAt(0).toUpperCase() + status.slice(1);
}

function createPurchaseBillSummaryLedgerEntry(bill: PurchaseBill): Omit<LedgerEntry, "id" | "balance"> {
  return {
    date: bill.billDate,
    accountType: "purchases",
    accountName: "Purchase Bills",
    partyId: bill.supplierId,
    description: `Purchase Bill - ${bill.supplierName}${bill.supplierInvoiceNo ? ` (Invoice: ${bill.supplierInvoiceNo})` : ""}`,
    debit: bill.grandTotal,
    credit: bill.amountPaid,
    referenceId: bill.billNo,
    referenceType: "purchase_bill",
    createdAt: new Date().toISOString(),
  };
}

const seedPurchaseOrders: PurchaseOrder[] = (() => {
  const firstItems = [buildPOItem(seedProducts[0], 30, 30, 18), buildPOItem(seedProducts[1], 20, 12, 38)];
  const secondItems = [buildPOItem(seedProducts[2], 12, 0, 66), buildPOItem(seedProducts[4], 10, 0, 92)];
  const firstTotals = totalsForPO(firstItems);
  const secondTotals = totalsForPO(secondItems);
  return [
    { id: "PO-0001", supplierId: seedSuppliers[0].id, supplierName: seedSuppliers[0].name, supplierGSTIN: seedSuppliers[0].gstin, status: "partial", items: firstItems, ...firstTotals, orderDate: offsetDate(-4, 10, 0), expectedDate: dateKey(new Date().toISOString()), notes: "Partial shipment received", createdBy: "Admin Owner", createdAt: offsetDate(-4, 10, 0), updatedAt: offsetDate(-1, 15, 0) },
    { id: "PO-0002", supplierId: seedSuppliers[1].id, supplierName: seedSuppliers[1].name, supplierGSTIN: seedSuppliers[1].gstin, status: "sent", items: secondItems, ...secondTotals, orderDate: offsetDate(-1, 12, 0), expectedDate: dateKey(new Date(Date.now() + 2 * 86400000).toISOString()), notes: "Urgent replenishment", createdBy: "Store Manager", createdAt: offsetDate(-1, 12, 0), updatedAt: offsetDate(-1, 12, 0) },
  ];
})();

const seedAuditEvents: AuditEvent[] = [
  { id: "AUD-001", time: "05/06/2026, 12:15 PM", user: "Admin Owner", area: "Sales", action: "Created invoice and printed bill", severity: "Info" },
  { id: "AUD-002", time: "05/06/2026, 10:40 AM", user: "Store Manager", area: "Inventory", action: "Updated Sunglasses stock level", severity: "Warning" },
  { id: "AUD-003", time: "04/06/2026, 6:05 PM", user: "Jane Cashier", area: "Payments", action: "Marked invoice INV-0004 as refunded", severity: "Critical" },
  { id: "AUD-004", time: "03/06/2026, 9:30 AM", user: "Admin Owner", area: "Staff", action: "Reviewed cashier access", severity: "Info" },
];

const seedCustomers: Customer[] = [
  { id: "c1", name: "Alice Johnson", email: "alice@example.com", phone: "555-0101", spent: 1250.5, lastVisit: "15/10/2023" },
  { id: "c2", name: "Bob Smith", email: "bob@example.com", phone: "555-0102", spent: 450, lastVisit: "20/10/2023" },
  { id: "c3", name: "Charlie Brown", email: "charlie@example.com", phone: "555-0103", spent: 89.99, lastVisit: "22/10/2023" },
];

const seedStaff: Staff[] = [
  { id: "s1", name: "Admin Owner", email: "owner@retailflow.com", role: "Owner", isCurrent: true },
  { id: "s2", name: "Store Manager", email: "manager@retailflow.com", role: "Manager" },
  { id: "s3", name: "Jane Cashier", email: "cashier@retailflow.com", role: "Cashier" },
  { id: "s4", name: "Floor Staff", email: "staff@retailflow.com", role: "Staff" },
];

type AppState = {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  purchaseBills: PurchaseBill[];
  setPurchaseBills: React.Dispatch<React.SetStateAction<PurchaseBill[]>>;
  stockMovements: StockMovement[];
  setStockMovements: React.Dispatch<React.SetStateAction<StockMovement[]>>;
  ledgerEntries: LedgerEntry[];
  setLedgerEntries: React.Dispatch<React.SetStateAction<LedgerEntry[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
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

function downloadCSV(filename: string, rows: Array<Record<string, string | number>>) {
  const headers = Object.keys(rows[0] ?? { Date: "", Description: "", Reference: "", Debit: "", Credit: "", Balance: "" });
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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
    `Date    : ${formatDateTime(invoice.date)}`,
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

function hoursLabel(checkIn?: string, checkOut?: string) {
  const hours = hoursBetween(checkIn, checkOut);
  if (!checkIn || !checkOut) return "";
  return hours === undefined ? "Invalid" : `${hours} hrs`;
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

function salesCsv(invoices: Invoice[], products: Product[]) {
  const headers = ["Invoice", "Date", "Customer", "Items", "Total", "GST", "Payment", "Status", "Staff"];
  const rows = invoices.map((invoice) => [
    invoice.id,
    formatDateTime(invoice.date),
    invoice.customer,
    invoice.items,
    invoiceDisplayTotal(invoice, products).toFixed(2),
    invoice.gst.toFixed(2),
    invoice.payment,
    invoice.status,
    invoice.staff,
  ]);
  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function salesPdfHtml(invoices: Invoice[], products: Product[]) {
  const rows = invoices.map((invoice) => `
    <tr>
      <td>${escapeHtml(invoice.id)}</td>
      <td>${escapeHtml(formatDateTime(invoice.date))}</td>
      <td>${escapeHtml(invoice.customer)}</td>
      <td>${escapeHtml(invoice.items)}</td>
      <td class="num">${escapeHtml(INR.format(invoiceDisplayTotal(invoice, products)))}</td>
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
        <p>${invoices.length} invoice${invoices.length === 1 ? "" : "s"} exported on ${escapeHtml(formatDate(new Date()))}.</p>
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

function orderLineQuantity(line: OrderLine) {
  return line.type === "fabric" ? line.pieces : line.qty;
}

function lineUnitSuffix(line: OrderLine) {
  if (line.type === "fabric") return line.unit;
  return line.product.unitType === "piece" ? "pc" : line.product.unitType === "meter" ? "m" : line.product.unitType === "liter" ? "L" : "kg";
}

function linePriceLabel(line: OrderLine) {
  const gstNote = line.product.gstRate > 0 ? " (incl. GST)" : "";
  return `${lineQuantityLabel(line)} • ${INR.format(amountForProduct(line.product).total)}/${lineUnitSuffix(line)}${gstNote}`;
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

function invoiceDisplayTotal(invoice: Invoice, products: Product[]) {
  const lines = legacyInvoiceLines(invoice, products);
  return lines.length ? summarizeInvoiceLines(lines, invoice.discount ?? 0).total : invoice.total;
}

function entriesWithRunningBalance(existing: LedgerEntry[], entries: Array<Omit<LedgerEntry, "id" | "balance">>) {
  return entries.reduce<LedgerEntry[]>((all, entry) => {
    const balance = all.filter((item) => item.accountType === entry.accountType).reduce((sum, item) => sum + item.debit - item.credit, 0) + entry.debit - entry.credit;
    return [{ ...entry, id: `LED-${String(Date.now()).slice(-6)}-${all.length + 1}`, balance }, ...all];
  }, existing);
}

function roleAccess(role: StaffRole) {
  const isOwner = role === "Owner";
  const isManager = role === "Manager";
  const isCashier = role === "Cashier";
  return {
    canViewDashboard: isOwner,
    canUsePos: true,
    canViewSales: isOwner || isManager || isCashier,
    canViewSalesTotals: isOwner,
    canEditInvoice: isOwner || isManager,
    canDeleteInvoice: isOwner,
    canExportSales: isOwner,
    canManageInventory: isOwner || isManager,
    canDeleteProducts: isOwner,
    canManageProcurement: isOwner || isManager,
    canManagePurchaseBills: isOwner || isManager,
    canDeleteSuppliers: isOwner,
    canManageCustomers: isOwner || isManager,
    canViewExpenses: isOwner,
    canViewPnL: isOwner,
    canViewBalanceSheet: isOwner,
    canViewLedger: isOwner,
    canViewReports: isOwner,
    canViewPerformance: isOwner,
    canManageStaff: isOwner,
    salesScope: isCashier ? "own" : "all",
  };
}

function defaultRouteForRole(role: StaffRole) {
  return role === "Owner" ? "/dashboard" : "/pos";
}

function AppProvider({ children }: { children: React.ReactNode }) {
  const savedSessionEmail = typeof localStorage !== "undefined" ? localStorage.getItem("retailflow-user-email") : null;
  const [products, setProducts] = useState(seedProducts);
  const [invoices, setInvoices] = useState(seedInvoices);
  const [expenses, setExpenses] = useState(seedExpenses);
  const [suppliers, setSuppliers] = useState(seedSuppliers);
  const [purchaseOrders, setPurchaseOrders] = useState(seedPurchaseOrders);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [customers, setCustomers] = useState(seedCustomers);
  const [staff, setStaff] = useState(() => savedSessionEmail ? seedStaff.map((member) => ({ ...member, isCurrent: member.email.toLowerCase() === savedSessionEmail })) : seedStaff);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [order, setOrder] = useState<OrderLine[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = (message: string, action?: ToastState["action"]) => {
    setToast({ message, action });
    window.setTimeout(() => setToast(null), action ? 4200 : 2600);
  };

  const value = useMemo(
    () => ({ products, setProducts, invoices, setInvoices, expenses, setExpenses, suppliers, setSuppliers, purchaseOrders, setPurchaseOrders, purchaseBills, setPurchaseBills, stockMovements, setStockMovements, ledgerEntries, setLedgerEntries, customers, setCustomers, staff, setStaff, attendance, setAttendance, order, setOrder, toast, showToast }),
    [products, invoices, expenses, suppliers, purchaseOrders, purchaseBills, stockMovements, ledgerEntries, customers, staff, attendance, order, toast],
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
    ["cashier@retailflow.com", "password"],
    ["staff@retailflow.com", "password"],
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
      setStaff((items) => [...items.map((member) => ({ ...member, isCurrent: false })), { id: crypto.randomUUID(), name: trimmedName, email: normalizedEmail, role: "Owner", isCurrent: true }]);
      localStorage.setItem("retailflow-auth", "true");
      localStorage.setItem("retailflow-user-email", normalizedEmail);
      onLogin();
      navigate("/dashboard");
      return;
    }

    const users = savedUsers();
    if (credentials.some(([u, p]) => u === normalizedEmail && p === password) || users.some((user) => user.email === normalizedEmail && user.password === password)) {
      setStaff((items) => {
        const next = items.map((member) => ({ ...member, isCurrent: member.email.toLowerCase() === normalizedEmail }));
        if (next.some((member) => member.isCurrent)) return next;
        const savedUser = users.find((user) => user.email === normalizedEmail);
        return [...next, { id: crypto.randomUUID(), name: savedUser?.name ?? normalizedEmail, email: normalizedEmail, role: "Owner", isCurrent: true }];
      });
      localStorage.setItem("retailflow-auth", "true");
      localStorage.setItem("retailflow-user-email", normalizedEmail);
      onLogin();
      const member = seedStaff.find((item) => item.email.toLowerCase() === normalizedEmail);
      navigate(defaultRouteForRole(member?.role ?? "Owner"));
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
            <span>Cashier: cashier@retailflow.com / password</span>
            <span>Staff: staff@retailflow.com / password</span>
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

function useHashTab<T extends string>(allowed: readonly T[], fallback: T) {
  const read = () => {
    const value = window.location.hash.replace("#", "") as T;
    return allowed.includes(value) ? value : fallback;
  };
  const [tab, setTab] = useState<T>(read);
  useEffect(() => {
    const onHash = () => setTab(read());
    window.addEventListener("hashchange", onHash);
    onHash();
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const selectTab = (next: T) => {
    if (window.location.hash !== `#${next}`) window.history.replaceState(null, "", `${window.location.pathname}#${next}`);
    setTab(next);
  };
  return [tab, selectTab] as const;
}

function Shell({ onSignOut }: { onSignOut: () => void }) {
  const { toast, staff } = useApp();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => (typeof localStorage !== "undefined" ? localStorage.getItem("sidebarCollapsed") === "true" : false));
  const currentUser = staff.find((member) => member.isCurrent) ?? staff[0];
  const access = roleAccess(currentUser.role);
  const defaultRoute = defaultRouteForRole(currentUser.role);
  const navItems: Array<{ type?: "section"; label: string; path?: string; icon?: React.ReactNode; allowed: boolean }> = [
    { path: "/dashboard", label: "Dashboard", icon: <BarChart3 size={17} />, allowed: access.canViewDashboard },
    { path: "/pos", label: "Point of Sale", icon: <ShoppingCart size={17} />, allowed: access.canUsePos },
    { path: "/sales", label: "Sales History", icon: <IndianRupee size={17} />, allowed: access.canViewSales },
    { path: "/products", label: "Inventory", icon: <Box size={17} />, allowed: access.canManageInventory },
    { type: "section", label: "Procurement", allowed: access.canManageProcurement },
    { path: "/procurement#suppliers", label: "Procurement", icon: <Truck size={17} />, allowed: access.canManageProcurement },
    { path: "/customers", label: "Customers", icon: <Users size={17} />, allowed: access.canManageCustomers },
    { type: "section", label: "Finance", allowed: access.canViewReports || access.canViewExpenses || access.canViewPnL },
    { path: "/reports", label: "Reports", icon: <BarChart3 size={17} />, allowed: access.canViewReports },
    { path: "/expenses", label: "Expenses", icon: <IndianRupee size={17} />, allowed: access.canViewExpenses },
    { path: "/financials#balance-sheet", label: "Financials", icon: <TrendingUp size={17} />, allowed: access.canViewPnL || access.canViewBalanceSheet || access.canViewLedger },
    { path: "/performance", label: "Performance", icon: <BarChart3 size={17} />, allowed: access.canViewPerformance },
    { path: "/staff", label: "Staff", icon: <User size={17} />, allowed: access.canManageStaff },
  ];

  useEffect(() => {
    const width = sidebarCollapsed ? "64px" : "268px";
    document.documentElement.style.setProperty("--sidebar-width", width);
    localStorage.setItem("sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="store-head">
          <button className="store-brand-toggle" type="button" title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setSidebarCollapsed((value) => !value)}>
            <div className="brand-mark"><Store size={22} /></div>
            {!sidebarCollapsed ? <strong>Retail Demo Store</strong> : null}
          </button>
        </div>
        <nav>
          {navItems.filter((item) => item.allowed).map((item) => (
            item.type === "section"
              ? <div className="nav-section-label" key={`section-${item.label}`}>{item.label}</div>
              : <NavLink key={item.path} end={item.path === "/reports"} title={sidebarCollapsed ? item.label : undefined} className={({ isActive }) => `nav-row ${isActive ? "active" : ""}`} to={item.path ?? "/"}>{item.icon}{!sidebarCollapsed ? <span>{item.label}</span> : null}</NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{currentUser.name[0]}</div>
          {!sidebarCollapsed ? <div><strong>{currentUser.name}</strong><span>{currentUser.role}</span></div> : null}
        </div>
        <button
          className="signout"
          onClick={() => {
            localStorage.removeItem("retailflow-auth");
            localStorage.removeItem("retailflow-user-email");
            onSignOut();
          }}
          title={sidebarCollapsed ? "Sign Out" : undefined}
        ><LogOut size={17} />{!sidebarCollapsed ? <span>Sign Out</span> : null}</button>
      </aside>
      <main className={`content ${location.pathname === "/pos" ? "pos-screen" : ""}`}>
        {location.pathname === "/" ? <Navigate to={defaultRoute} replace /> : (
          <Routes>
            <Route path="/dashboard" element={access.canViewDashboard ? <Dashboard /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/pos" element={access.canUsePos ? <POS /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/sales" element={access.canViewSales ? <Sales /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/products" element={access.canManageInventory ? <Inventory /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/procurement" element={access.canManageProcurement ? <ProcurementScreen /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/suppliers" element={<Navigate to="/procurement#suppliers" replace />} />
            <Route path="/purchase-orders" element={<Navigate to="/procurement#purchase-orders" replace />} />
            <Route path="/purchase-bills" element={<Navigate to="/procurement#purchase-bills" replace />} />
            <Route path="/customers" element={access.canManageCustomers ? <Customers /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/reports" element={access.canViewReports ? <Reports /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/expenses" element={access.canViewExpenses ? <ExpensesScreen /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/financials" element={(access.canViewPnL || access.canViewBalanceSheet || access.canViewLedger) ? <FinancialsScreen /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/reports/pnl" element={<Navigate to="/financials#pl" replace />} />
            <Route path="/reports/balance-sheet" element={<Navigate to="/financials#balance-sheet" replace />} />
            <Route path="/reports/ledger" element={<Navigate to="/financials#ledger" replace />} />
            <Route path="/performance" element={access.canViewPerformance ? <Performance /> : <Navigate to={defaultRoute} replace />} />
            <Route path="/staff" element={access.canManageStaff ? <StaffPage /> : <Navigate to={defaultRoute} replace />} />
            <Route path="*" element={<Navigate to={defaultRoute} replace />} />
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

function useIsMobileViewport(breakpoint = 480) {
  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth < breakpoint : false));

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const handleResize = () => setIsMobile(window.innerWidth < breakpoint);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [breakpoint]);

  return isMobile;
}

function chartYAxis(value: number, isMobile: boolean) {
  if (isMobile && value >= 1000) return `₹${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function RevenueChart({ data, xKey, height = 300 }: { data: Array<Record<string, string | number>>; xKey: string; height?: number }) {
  const isMobile = useIsMobileViewport();
  const chartHeight = isMobile ? 220 : height;

  return (
    <div className="chart-wrap" style={{ height: chartHeight, minHeight: chartHeight }}>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} barCategoryGap="8%" barGap={0} margin={{ top: 12, right: 12, left: isMobile ? -10 : 8, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#E5E7EB" />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} />
          <YAxis tickFormatter={(v) => chartYAxis(Number(v), isMobile)} domain={[0, "dataMax + 100"]} tickLine={false} axisLine={false} />
          <Tooltip formatter={(v) => INR.format(Number(v))} />
          <Bar dataKey="revenue" fill="#2563EB" radius={[8, 8, 0, 0]} maxBarSize={72} minPointSize={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GSTPill({ rate }: { rate: number }) {
  if (!rate) return <span className="muted">—</span>;
  return <span className={`pill gst-${rate}`}>GST {rate}%</span>;
}

function POS() {
  const { products, setProducts, order, setOrder, setInvoices, setStockMovements, setLedgerEntries, customers, setCustomers, staff, showToast } = useApp();
  const location = useLocation();
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
  const initialCustomerId = (location.state as { customerId?: string } | null)?.customerId ?? "";
  const initialCustomer = customers.find((customer) => customer.id === initialCustomerId) ?? null;
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialCustomer?.id ?? "");
  const [customerQuery, setCustomerQuery] = useState(initialCustomer?.name ?? "Walk-in");
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const prewarmedStreamRef = useRef<MediaStream | null>(null);
  const categories = ["All", "Apparel", "Footwear", "Accessories", "Groceries", "Electronics"];
  const filtered = products.filter((p) => (category === "All" || p.category === category) && `${p.name} ${p.sku} ${p.barcode ?? ""}`.toLowerCase().includes(search.toLowerCase()));
  const orderQuantity = order.reduce((sum, line) => sum + orderLineQuantity(line), 0);
  const productOverviewText = search.trim()
    ? `Showing ${filtered.length} product${filtered.length === 1 ? "" : "s"} matching '${search.trim()}'`
    : `Showing ${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
  const totals = order.reduce((acc, line) => {
    const amount = amountForLine(line);
    acc.base += amount.base;
    acc.gst += amount.gst;
    acc.total += amount.total;
    return acc;
  }, { base: 0, gst: 0, total: 0 });
  const normalizeBarcode = (value: string) => value.trim().toLowerCase().replace(/[\s-]/g, "");
  const canCharge = order.length > 0 && selectedSalesperson !== null;
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const customerSearch = customerQuery.trim().toLowerCase();
  const customerMatches = customerSearch && customerSearch !== "walk-in"
    ? customers.filter((customer) => `${customer.name} ${customer.phone}`.toLowerCase().includes(customerSearch)).slice(0, 5)
    : customers.slice(0, 5);

  useEffect(() => {
    const stateCustomerId = (location.state as { customerId?: string } | null)?.customerId;
    if (!stateCustomerId) return;
    const customer = customers.find((item) => item.id === stateCustomerId);
    if (!customer) return;
    setSelectedCustomerId(customer.id);
    setCustomerQuery(customer.name);
  }, [location.state, customers]);

  function choosePosCustomer(customer: Customer | null) {
    setSelectedCustomerId(customer?.id ?? "");
    setCustomerQuery(customer?.name ?? "Walk-in");
    setCustomerDropdownOpen(false);
  }

  function addInlinePosCustomer() {
    const name = customerQuery.trim();
    if (!name || name.toLowerCase() === "walk-in") return;
    const customer: Customer = { id: crypto.randomUUID(), name, email: "", phone: "", spent: 0, lastVisit: "-" };
    setCustomers((items) => [customer, ...items]);
    choosePosCustomer(customer);
    showToast("Customer added successfully");
  }

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

  async function completePayment(paymentMethod: PaymentMethod, payableTotal: number, discountAmount: number) {
    if (!order.length || !selectedSalesperson) {
      setSalespersonTouched(true);
      return;
    }
    const invoiceCustomer = selectedCustomer?.name ?? "Walk-in";
    const invoice: Invoice = {
      id: `INV-${String(Date.now()).slice(-4)}`,
      date: displayDateTime(new Date()),
      customer: invoiceCustomer,
      customerId: selectedCustomer?.id,
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
    setProducts((items) => items.map((product) => {
      const soldQty = order.filter((line) => line.product.id === product.id).reduce((sum, line) => sum + (line.type === "fabric" ? line.totalMeters : line.qty), 0);
      return soldQty ? { ...product, stock: Math.max(0, product.stock - soldQty) } : product;
    }));
    setStockMovements((items) => [
      ...order.map((line) => {
        const soldQty = line.type === "fabric" ? line.totalMeters : line.qty;
        const product = products.find((item) => item.id === line.product.id) ?? line.product;
        return {
          id: `SM-${invoice.id}-${line.id}`,
          productId: product.id,
          productName: product.name,
          type: "sale" as const,
          quantity: -soldQty,
          balanceAfter: Math.max(0, product.stock - soldQty),
          referenceId: invoice.id,
          referenceType: "sale" as const,
          date: new Date().toISOString(),
          notes: `Sale ${invoice.id}`,
          createdBy: selectedSalesperson.name,
        };
      }),
      ...items,
    ]);
    setLedgerEntries((items) => entriesWithRunningBalance(items, createSaleLedgerEntries(invoice)));
    setOrder([]);
    setPaymentOpen(false);
    choosePosCustomer(null);
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
      setOrderWidth(Math.min(520, Math.max(280, nextWidth)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  return (
    <section className="page pos-page">
      <div className="page-header">
        <div>
          <h1>Point of Sale</h1>
        </div>
      </div>
      <div className="pos-layout" style={{ "--order-width": `${orderWidth}px` } as React.CSSProperties}>
      <div className="pos-products">
        <div className={`pos-sticky-header ${isProductGridScrolled ? "scrolled" : ""}`}>
          <div className="pos-action-row">
            <label className="searchbox"><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products or SKU..." /></label>
            <form className="scanbox" onSubmit={scanBarcode}><div className="scan-input-wrap"><ScanBarcode size={15} /><input ref={barcodeInputRef} value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan barcode / SKU to add directly" /></div><button type="submit">Scan</button></form>
          </div>
          <div className="pos-selector-row">
            <div className="salesperson-row">
              <label htmlFor="salesperson-select"><User size={16} /> Salesperson:</label>
              <select id="salesperson-select" value={selectedSalespersonId} onChange={(event) => { setSelectedSalespersonId(event.target.value); setSalespersonTouched(true); }}>
                <option value="">Select salesperson...</option>
                {salespersonOptions.map((member) => <option key={member.id} value={member.id}>{member.name} · {member.role}</option>)}
              </select>
            </div>
            <div className="salesperson-row pos-customer-row">
              <label htmlFor="pos-customer-input"><Users size={16} /> Customer:</label>
              <div className="pos-customer-picker pos-customer-combobox">
                <input
                  id="pos-customer-input"
                  value={customerQuery}
                  onFocus={() => setCustomerDropdownOpen(true)}
                  onBlur={() => window.setTimeout(() => setCustomerDropdownOpen(false), 120)}
                  onChange={(event) => { setCustomerQuery(event.target.value); setSelectedCustomerId(""); setCustomerDropdownOpen(true); }}
                  placeholder="Walk-in or search customer"
                />
                {customerDropdownOpen ? (
                  <div className="pos-customer-dropdown">
                    <button type="button" className={!selectedCustomer ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => choosePosCustomer(null)}>Walk-in</button>
                    {customerMatches.map((customer) => <button type="button" key={customer.id} className={selectedCustomerId === customer.id ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onClick={() => choosePosCustomer(customer)}>{customer.name}{customer.phone ? ` · ${customer.phone}` : ""}</button>)}
                    {customerQuery.trim() && customerQuery.trim().toLowerCase() !== "walk-in" && !selectedCustomer ? <button type="button" className="add-new" onMouseDown={(event) => event.preventDefault()} onClick={addInlinePosCustomer}>+ Add New Customer</button> : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          {salespersonTouched && !selectedSalesperson ? <div className="salesperson-warning">Please select a salesperson to continue</div> : null}
          <div className="category-row"><button className="arrow-btn"><ChevronLeft size={16} /></button><div className="category-pills">{categories.map((c) => <button key={c} className={`chip ${category === c ? "active" : ""}`} onClick={() => setCategory(c)}>{c}</button>)}</div><button className="arrow-btn"><ChevronRight size={16} /></button></div>
        </div>
        <div className="product-scroll-area" onScroll={(event) => setIsProductGridScrolled(event.currentTarget.scrollTop > 10)}>
          <div className="product-overview">
            <span>{productOverviewText}</span>
            {category !== "All" ? <strong>{category}</strong> : null}
          </div>
          <div className="product-grid">
            {filtered.length ? filtered.map((product) => (
              <ProductCard key={product.id} product={product} onClick={() => addProduct(product)} />
            )) : <div className="empty compact">No Data Available</div>}
          </div>
        </div>
      </div>
      <div className="order-resizer" title="Drag to resize current order" onMouseDown={startOrderResize} />
      <aside className="order-panel">
        <div className="order-head"><div className="order-title-wrap"><h2>Current Order</h2>{order.length > 0 ? <span className="order-count-badge">{orderQuantity} item{orderQuantity === 1 ? "" : "s"}</span> : null}</div><button className="danger-light" onClick={() => setOrder([])}><Trash2 size={16} />Clear</button></div>
        <div className="order-lines">
          {order.length === 0 ? <div className="empty-order-state"><div className="empty-order-box"><ShoppingBag size={40} /><strong>No items yet</strong><span>Tap a product to add it to this order</span></div></div> : order.map((line) => <OrderLineRow key={line.id} line={line} />)}
        </div>
        <div className="totals">
          <div className="total-items-row"><span>Total Items</span><strong>{orderQuantity} ({order.length} product{order.length === 1 ? "" : "s"})</strong></div>
          <div><span>Subtotal:</span><strong>{INR.format(totals.base)}</strong></div>
          <div><span>Total GST:</span><strong>{INR.format(totals.gst)}</strong></div>
          <hr />
          <div className="payable"><span>Total Payable:</span><strong>{INR.format(totals.total)}</strong></div>
        </div>
        <button className="primary full charge" disabled={!order.length} onClick={() => canCharge ? setPaymentOpen(true) : setSalespersonTouched(true)}>Charge {INR.format(totals.total)}</button>
      </aside>
      {fabricProduct && <FabricModal product={fabricProduct} onClose={() => setFabricProduct(null)} />}
      {paymentOpen && <PaymentModal total={totals.total} itemCount={orderQuantity} productCount={order.length} onClose={() => setPaymentOpen(false)} onConfirm={completePayment} />}
      <BarcodeScannerModal visible={scannerOpen} prewarmedStream={prewarmedStreamRef.current} onClose={() => { setScannerOpen(false); prewarmedStreamRef.current = null; }} onManual={() => { setScannerOpen(false); prewarmedStreamRef.current = null; barcodeInputRef.current?.focus(); }} onScanned={handleScannerCode} />
      </div>
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

function PaymentModal({ total, itemCount, productCount, onClose, onConfirm }: { total: number; itemCount: number; productCount: number; onClose: () => void; onConfirm: (paymentMethod: PaymentMethod, payableTotal: number, discountAmount: number) => void | Promise<void> }) {
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
          <small className="payment-item-count">{itemCount} item{itemCount === 1 ? "" : "s"} · {productCount} product{productCount === 1 ? "" : "s"}</small>
        </div>
        <button onClick={onClose}><X size={20} /></button>
      </div>
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
      <button className="primary full" disabled={cashShort} onClick={() => onConfirm(method, payableTotal, discountAmount)}>
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
      (!dateFilter || dateKey(invoice.date) === dateFilter) &&
      (access.salesScope !== "own" || invoice.salespersonId === currentUser.id || invoice.staff === currentUser.name || invoice.salespersonName === currentUser.name)
    )
    .sort((a, b) => invoiceTime(b) - invoiceTime(a));
  const filteredTotal = filtered.reduce((sum, invoice) => sum + invoiceDisplayTotal(invoice, products), 0);
  const deleteInvoice = (invoice: Invoice) => {
    if (!access.canDeleteInvoice) return;
    if (window.confirm(`Delete invoice ${invoice.id}? This action cannot be undone.`)) {
      setInvoices((rows) => rows.filter((row) => row.id !== invoice.id));
    }
  };
  const exportRows = (format: "csv" | "pdf") => {
    const stamp = dateFilter || dateKey(new Date().toISOString()) || "sales";
    if (format === "csv") {
      downloadFile(`sales-history-${stamp}.csv`, `\uFEFF${salesCsv(filtered, products)}`, "text/csv;charset=utf-8");
      setExportOpen(false);
      return;
    }

    const win = window.open("", "_blank", "width=1024,height=720");
    if (!win) {
      window.alert("Please allow pop-ups to export PDF.");
      return;
    }
    win.document.write(salesPdfHtml(filtered, products));
    win.document.close();
    win.focus();
    win.print();
    setExportOpen(false);
  };
  return (
    <section className="page sales-page">
      <PageHeader title="Sales History" subtitle="View and manage transaction records." action={access.canExportSales ? <button className="outline sales-export-button" onClick={() => setExportOpen(true)}>Export</button> : null} />
      <div className="filters sales-filters"><label className="searchbox sales-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search invoice, customer, or staff" /></label><select value={method} onChange={(e) => setMethod(e.target.value)}><option>All Methods</option><option>Card</option><option>Cash</option><option>Qr</option></select><select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}><option>All Staff</option>{staff.map((member) => <option key={member.id}>{member.name}</option>)}</select><DateInput value={dateFilter} onChange={(date) => setDateFilter(date ? dateInputKey(date) : "")} /></div>
      <div className="sales-summary">
        <div><span>Total invoices</span><strong>{filtered.length}</strong></div>
        {access.canViewSalesTotals ? <div><span>Total amount</span><strong>{INR.format(filteredTotal)}</strong></div> : null}
      </div>
      <DataTable headers={["Invoice", "Date", "Customer", "Items", "Total", "Payment", "Status", "Salesperson", "Actions"]}>
        {filtered.length === 0 ? (
          <tr><td className="empty-table" colSpan={9}>No Data Available</td></tr>
        ) : filtered.map((invoice) => (
          <tr key={invoice.id}><td><button className="linkish invoice-link" onClick={() => setSelected({ invoice, mode: "view" })}>{invoice.id}</button></td><td>{formatDateTime(invoice.date)}</td><td>{invoice.customer}</td><td>{invoice.items}</td><td><strong>{INR.format(invoiceDisplayTotal(invoice, products))}</strong></td><td>{invoice.payment}</td><td><span className={`status ${invoice.status.toLowerCase()}`}>{invoice.status}</span></td><td>{invoice.salespersonName || invoice.staff || "Unassigned"}</td><td className="actions"><button className="safe-action" title="View bill" onClick={() => setSelected({ invoice, mode: "view" })}><Eye size={16} /></button>{access.canEditInvoice ? <button className="safe-action" title="Edit bill" onClick={() => setSelected({ invoice, mode: "edit" })}><Edit size={16} /></button> : null}{access.canDeleteInvoice ? <button className="danger-action" title="Delete invoice" onClick={() => deleteInvoice(invoice)}><Trash2 size={16} /></button> : null}</td></tr>
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
    const displayedViewTotal = viewInvoice.lines?.length ? summarizeInvoiceLines(viewInvoice.lines, invoice.discount ?? 0).total : viewInvoice.total;
    const viewLineAmounts = viewInvoice.lines?.map((line) => ({ line, amount: amountForLine(line) })) ?? [];
    const viewGst = viewLineAmounts.reduce((sum, item) => sum + item.amount.gst, 0);
    const viewItemCount = viewInvoice.lines?.reduce((sum, line) => sum + orderLineQuantity(line), 0) ?? 0;
    return (
      <Modal onClose={onClose} className="invoice-modal">
        <div className="modal-head"><div><h2>Invoice {invoice.id}</h2><p>Total Amount: <strong>{INR.format(displayedViewTotal)}</strong></p></div><button onClick={onClose}><X size={20} /></button></div>
        <div className="bill-view">
          <div className="bill-view-grid">
            <div><span>Date</span><strong>{formatDateTime(viewInvoice.date)}</strong></div>
            <div><span>Customer</span><strong>{viewInvoice.customer}</strong></div>
            <div><span>Payment</span><strong>{viewInvoice.payment}</strong></div>
            <div><span>Status</span><strong>{viewInvoice.status}</strong></div>
            <div><span>Processed by</span><strong>{viewInvoice.salespersonName || viewInvoice.staff || "Unassigned"}</strong></div>
            <div><span>Items</span><strong>{viewInvoice.items}</strong></div>
          </div>
          <div className="bill-view-lines">
            <strong>Bill Products</strong>
            {viewLineAmounts.length ? (
              <div className="bill-products-table">
                <div className="bill-products-head">
                  <span>Item</span>
                  <span>Qty</span>
                  <span>Rate</span>
                  <span>GST</span>
                  <span>Amount</span>
                </div>
                <div className="bill-products-body bill-table-scroll">
                  {viewLineAmounts.map(({ line, amount }) => {
                    const unitAmount = amountForProduct(line.product);
                    return (
                      <div className="bill-products-row" key={line.id}>
                        <div>
                          <strong>{line.product.name}</strong>
                          <small>{line.product.gstRate > 0 ? `incl. GST ${line.product.gstRate}%` : "No GST"}</small>
                        </div>
                        <span>{lineQuantityLabel(line)}</span>
                        <span>{INR.format(unitAmount.base)}</span>
                        <span className="gst-inline">+{INR.format(amount.gst)}</span>
                        <span>{INR.format(amount.total)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="bill-products-foot">
                  <span>{viewLineAmounts.length} product{viewLineAmounts.length === 1 ? "" : "s"} · {viewItemCount} item{viewItemCount === 1 ? "" : "s"} total</span>
                </div>
              </div>
            ) : <div className="empty compact">Product lines are not available for this invoice. The saved bill total is shown below.</div>}
          </div>
          <div className="bill-view-total bill-view-summary">
            {viewLineAmounts.length ? <>
              <div className="gst-split"><span><em>CGST (50% of GST)</em><em>SGST (50% of GST)</em></span><strong><em>{INR.format(viewGst / 2)}</em><em>{INR.format(viewGst / 2)}</em></strong></div>
              <div><span>Total GST</span><strong>{INR.format(viewGst)}</strong></div>
              <hr />
              <div className="summary-payable"><span>Total Payable (incl. GST)</span><strong>{INR.format(displayedViewTotal)}</strong></div>
            </> : <><span>Total Amount</span><strong>{INR.format(displayedViewTotal)}</strong></>}
          </div>
        </div>
        <div className="modal-actions">{canEdit ? <button className="outline edit-bill-button" onClick={onEdit}>Edit Bill</button> : null}<button className="outline" onClick={() => printInvoice(viewInvoice)}>Print Bill</button><button className="outline" onClick={onClose}>Close</button></div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} className="invoice-modal">
      <div className="modal-head"><div><h2>Invoice {invoice.id}</h2><p>Total Amount: <strong>{INR.format(editedTotal)}</strong></p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid two"><TextField label="Customer" value={customer} onChange={setCustomer} /><label className="field"><span>Payment</span><select value={payment} onChange={(e) => setPayment(e.target.value)}><option>Card</option><option>Cash</option><option>Qr</option></select></label></div>
      <div className="form-grid two"><label className="field"><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value as Invoice["status"])}><option>Completed</option><option>Refunded</option></select></label><label className="field"><span>Staff</span><select value={staffName} onChange={(e) => setStaffName(e.target.value)}>{staff.map((member) => <option key={member.id}>{member.name}</option>)}</select></label></div>
      <div className="bill-total-row"><TextField label="Bill Total" type="number" value={manualOverride ? manualTotal : String(lineTotals.total.toFixed(2))} onChange={(value) => { setManualOverride(true); setManualTotal(value); }} /><button className="primary use-product-total" disabled={!activeLines.length} onClick={useProductTotal}>Use Product Total</button></div>
      <div className="bill-editor">
        <div className="bill-editor-head compact"><strong>Edit / Exchange Products</strong><label><span>Add product</span><select defaultValue="" onChange={(e) => { addProduct(e.target.value || selectedProductId); e.currentTarget.value = ""; }}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label></div>
        {lines.length ? (
          <div className="bill-edit-table">
            <div className="bill-edit-head">{["Product", "Qty", "Price", "Action"].map((heading) => <span key={heading}>{heading}</span>)}</div>
            <div className="bill-edit-body bill-table-scroll">
              {lines.map((line) => {
                const returned = isReturnedLine(line);
                const confirmed = confirmedLineIds.includes(line.id);
                const isNew = line.rowState === "new";
                return (
                  <div className={`bill-edit-row ${isNew ? "new-line" : ""} ${returned ? "returned-line" : ""} ${confirmed ? "confirmed-line" : ""}`} key={line.id}>
                    <select className="bill-edit-product" disabled={returned} value={line.product.id} onChange={(e) => replaceProduct(line.id, e.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
                    <div className="bill-edit-qty">
                      {line.type === "standard" ? <>
                        <button type="button" disabled={returned} onClick={() => {
                          const step = line.product.unitType === "piece" ? 1 : 0.5;
                          updateLine(line.id, { qty: Math.max(step, line.qty - step) });
                        }}>−</button>
                        <input readOnly={returned} type="number" min={line.product.unitType === "piece" ? "1" : "0.5"} step={line.product.unitType === "piece" ? "1" : "0.5"} value={line.qty} onChange={(e) => updateLine(line.id, { qty: Number(e.target.value) })} />
                        <button type="button" disabled={returned} onClick={() => {
                          const step = line.product.unitType === "piece" ? 1 : 0.5;
                          updateLine(line.id, { qty: line.qty + step });
                        }}>+</button>
                      </> : <>
                        <input readOnly={returned} type="number" min="1" step="1" value={line.pieces} onChange={(e) => updateLine(line.id, { pieces: Number(e.target.value) })} />
                        <input readOnly={returned} type="number" min="0.5" step="0.5" value={line.lengthPerPiece} onChange={(e) => updateLine(line.id, { lengthPerPiece: Number(e.target.value) })} />
                      </>}
                    </div>
                    <div className="bill-edit-price"><span>{INR.format(amountForProduct(line.product).total)}/{lineUnitSuffix(line)}</span>{line.product.gstRate > 0 ? <small>incl. GST</small> : null}</div>
                    <div className="bill-edit-actions">{!isNew ? <button className={`return-line ${returned ? "undo-line" : ""}`} onClick={() => returnLine(line.id)}>{returned ? "Undo" : "Return"}</button> : null}<button className="add-line" disabled={returned} onClick={() => confirmLine(line.id)}>{confirmed ? <Check size={15} /> : null}Add</button></div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <div className="empty compact">No product lines saved for this older invoice. Add products above or edit the manual total.</div>}
      </div>
      <div className="demo-box">
        <span>Date: {formatDateTime(invoice.date)}</span>
        <span>Items: {nextInvoice.items}</span>
        <span>Total: {INR.format(nextInvoice.total)}</span>
      </div>
      <div className="modal-actions"><button className="outline" onClick={() => printInvoice(nextInvoice)}>Print Bill</button><button className="outline" onClick={() => setStatus(status === "Refunded" ? "Completed" : "Refunded")}>{status === "Refunded" ? "Mark Completed" : "Mark Refunded"}</button><button className="primary" onClick={() => onSave(nextInvoice)}>Save Changes</button></div>
    </Modal>
  );
}

function Inventory() {
  const { products, setProducts, staff, showToast } = useApp();
  const currentUser = staff.find((member) => member.isCurrent) ?? staff[0];
  const access = roleAccess(currentUser.role);
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
        {rows.length ? rows.map((p) => <tr key={p.id}>{bulkMode ? <td><input type="checkbox" checked={selectedIds.includes(p.id)} onChange={(event) => setSelectedIds((ids) => event.target.checked ? [...ids, p.id] : ids.filter((id) => id !== p.id))} /></td> : null}<td><strong>{p.name}</strong>{p.barcode ? <button className="barcode-mini" title="View barcode" onClick={() => setBarcodePreview(p)}><ScanBarcode size={15} /></button> : null}</td><td className="linkish">{p.sku}</td><td>{p.category}</td><td>{unitLabel(p.unitType)}</td><td>{INR.format(p.price)}</td><td><GSTPill rate={p.gstRate} /></td><td><span className={`stock-pill ${p.stock <= 10 ? "low" : ""}`}>{p.stock}</span></td><td className="actions"><button onClick={() => { setEditing(p); setOpen(true); }}><Edit size={16} /></button><button onClick={() => setPrintProducts([p])} title="Print labels"><ScanBarcode size={16} /></button>{access.canDeleteProducts ? <button onClick={() => setProducts((items) => items.filter((item) => item.id !== p.id))}><Trash2 size={16} /></button> : null}</td></tr>) : <tr><td className="empty-table" colSpan={bulkMode ? 9 : 8}>No Data Available</td></tr>}
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
  const [salesInfoEnabled, setSalesInfoEnabled] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [skuEdited, setSkuEdited] = useState(false);
  const [barcodeEdited, setBarcodeEdited] = useState(false);
  const [skuError, setSkuError] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const required = form.name && form.category && form.price > 0 && form.stock >= 0 && form.unitType && form.sku && form.barcode && !skuError && !barcodeError;
  const update = <K extends keyof Product>(key: K, value: Product[K]) => setForm((draft) => ({ ...draft, [key]: value }));
  const barcodeValue = form.barcode?.trim() ?? "";
  const barcodePreview = barcodeValue.length >= 8 ? safeBarcodeSVG(barcodeValue) : "";
  const categoryOptions = Array.from(new Set(["Apparel", "Footwear", "Accessories", "Groceries", "Electronics", ...products.map((item) => item.category).filter(Boolean)]));
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
      <section className="product-form-section">
        <h3>Basic Info</h3>
        <div className="product-form-grid">
          <label className="field product-field-full"><span>Product Name</span><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. Cotton T-Shirt" /></label>
          <label className="field"><span>Category</span><select value={form.category} onChange={(event) => updateCategory(event.target.value)}><option value="">Select category</option>{categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
          <label className="field"><span>Unit Type</span><select value={form.unitType} onChange={(event) => update("unitType", event.target.value as UnitType)}><option value="piece">Piece</option><option value="kg">Kg</option><option value="meter">Metre</option><option value="liter">Litre</option></select>{form.unitType === "meter" && <small>Fabric quantity will be captured at checkout.</small>}</label>
          <label className="field"><span>SKU {skuEdited ? <em className="edited-note">Edited</em> : null}</span><div className="code-field-row"><input className="mono-input" value={form.sku} onChange={(event) => { setSkuEdited(true); update("sku", event.target.value.toUpperCase()); }} placeholder="APP-047823" /><button className="outline icon-only" type="button" title="Regenerate SKU" onClick={() => regenerateSKU()}>↻</button></div>{skuError ? <small className="field-error">{skuError}</small> : null}</label>
          <label className="field"><span>Barcode {barcodeEdited ? <em className="edited-note">Edited</em> : null}</span><div className="barcode-field-row"><input className="mono-input" value={form.barcode} onChange={(event) => { setBarcodeEdited(true); update("barcode", event.target.value.replace(/\D/g, "").slice(0, 13)); }} placeholder="8901234567890" /><button className="outline icon-only" type="button" title="Regenerate barcode" onClick={regenerateBarcode}>↻</button>{isMobileBrowser() ? <button className="outline" type="button" onClick={() => setScannerOpen(true)}>Scan</button> : null}</div>{barcodeError ? <small className="field-error">{barcodeError}</small> : null}</label>
          {barcodePreview ? <div className="barcode-preview product-field-full" dangerouslySetInnerHTML={{ __html: barcodePreview }} /> : null}
        </div>
      </section>
      <section className="product-form-section">
        <label className="product-section-toggle"><input type="checkbox" checked={salesInfoEnabled} onChange={(event) => setSalesInfoEnabled(event.target.checked)} /><span>Sales Information</span></label>
        {salesInfoEnabled ? <div className="product-form-grid">
          <label className="field"><span>Selling Price*</span><div className="price-prefix-field"><span>₹</span><input type="number" value={String(form.price)} onChange={(event) => update("price", Number(event.target.value))} /></div></label>
          <label className="field"><span>MRP</span><input type="number" value={String(form.mrp ?? "")} onChange={(event) => update("mrp", event.target.value === "" ? undefined : Number(event.target.value))} /></label>
          <label className="field product-field-full"><span>Description</span><textarea value={form.description ?? ""} onChange={(event) => update("description", event.target.value)} placeholder="Add product description" /></label>
        </div> : null}
      </section>
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
      <div className="range-filter-pills">
        {(["today", "week", "month", "custom"] as DateRangeMode[]).map((item) => <button key={item} className={`chip ${mode === item ? "active" : ""}`} onClick={() => setMode(item)}>{item === "today" ? "Today" : item === "week" ? "This Week" : item === "month" ? "This Month" : "Custom"}</button>)}
      </div>
      {mode === "custom" ? <div className="custom-date-row"><label><span>From</span><DateInput value={customFrom} onChange={(date) => setCustomFrom(date ? dateInputKey(date) : "")} /></label><label><span>To</span><DateInput value={customTo} onChange={(date) => setCustomTo(date ? dateInputKey(date) : "")} /></label></div> : null}
    </div>
  );
}

function getPerformanceStats(invoices: Invoice[], products: Product[], range: { from: Date; to: Date }) {
  const filtered = invoices.filter((invoice) => {
    const time = new Date(invoice.date).getTime();
    return time >= range.from.getTime() && time <= range.to.getTime();
  });
  const stats = Object.values(filtered.reduce((acc, invoice) => {
    const id = invoice.salespersonId || "unassigned";
    const name = invoice.salespersonName || invoice.staff || "Unassigned";
    const total = invoiceDisplayTotal(invoice, products);
    if (!acc[id]) acc[id] = { salespersonId: id, salespersonName: name, salesCount: 0, totalRevenue: 0, returnsCount: 0, returnsValue: 0 };
    if (invoice.status === "Refunded") {
      acc[id].returnsCount += 1;
      acc[id].returnsValue += total;
    } else {
      acc[id].salesCount += 1;
      acc[id].totalRevenue += total;
    }
    return acc;
  }, {} as Record<string, { salespersonId: string; salespersonName: string; salesCount: number; totalRevenue: number; returnsCount: number; returnsValue: number }>))
    .map((row) => ({ ...row, avgSaleValue: row.salesCount ? row.totalRevenue / row.salesCount : 0, netRevenue: row.totalRevenue - row.returnsValue }))
    .sort((a, b) => (a.salespersonId === "unassigned" ? 1 : b.salespersonId === "unassigned" ? -1 : b.netRevenue - a.netRevenue));
  return { filtered, stats };
}

function Performance() {
  const { invoices, products, staff, attendance, setAttendance, showToast } = useApp();
  const [tab, setTab] = useState<"sales" | "attendance">("sales");
  const [rangeMode, setRangeMode] = useState<DateRangeMode>("today");
  const [customFrom, setCustomFrom] = useState(dateInputKey(new Date()));
  const [customTo, setCustomTo] = useState(dateInputKey(new Date()));
  const range = rangeBounds(rangeMode, customFrom, customTo);
  const owner = staff.find((member) => member.role === "Owner") ?? staff[0];
  const { stats } = getPerformanceStats(invoices, products, range);
  const exportRows = () => {
    const rows = [["Rank", "Name", "Role", "Sales Count", "Total Revenue", "Avg Sale", "Returns Count", "Returns Value", "Net Revenue"], ...stats.map((row, index) => {
      const member = staff.find((item) => item.id === row.salespersonId);
      return [index + 1, row.salespersonName, member?.role ?? "Unassigned", row.salesCount, row.totalRevenue.toFixed(2), row.avgSaleValue.toFixed(2), row.returnsCount, row.returnsValue.toFixed(2), row.netRevenue.toFixed(2)];
    })];
    downloadFile(`performance_${rangeMode}_${Date.now()}.csv`, `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`, "text/csv;charset=utf-8");
  };

  return (
    <section className="page">
      <PageHeader title="Performance" subtitle="Owner-only sales performance and attendance management." action={<DateRangeFilter mode={rangeMode} setMode={setRangeMode} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />} />
      <div className="performance-tab-row">
        <div className="performance-tabs"><button className={tab === "sales" ? "active" : ""} onClick={() => setTab("sales")}>Sales Performance</button><button className={tab === "attendance" ? "active" : ""} onClick={() => setTab("attendance")}>Attendance</button></div>
        {tab === "sales" ? <button className="outline export-csv-btn" onClick={exportRows}>Export CSV</button> : null}
      </div>
      {tab === "sales" ? <SalesPerformanceTab invoices={invoices} products={products} staff={staff} range={range} /> : <AttendanceTab staff={staff} owner={owner} attendance={attendance} setAttendance={setAttendance} showToast={showToast} range={range} rangeMode={rangeMode} customFrom={customFrom} customTo={customTo} />}
    </section>
  );
}

function SalesPerformanceTab({ invoices, products, staff, range }: { invoices: Invoice[]; products: Product[]; staff: Staff[]; range: { from: Date; to: Date } }) {
  const [selected, setSelected] = useState<string | null>(null);
  const { filtered, stats } = getPerformanceStats(invoices, products, range);
  const totalSales = stats.reduce((sum, row) => sum + row.totalRevenue, 0);
  const salesCount = stats.reduce((sum, row) => sum + row.salesCount, 0);
  const top = stats[0];
  const activeToday = new Set(filtered.map((invoice) => invoice.salespersonId || "unassigned")).size;
  const selectedRows = selected ? filtered.filter((invoice) => (invoice.salespersonId || "unassigned") === selected).sort((a, b) => invoiceTime(b) - invoiceTime(a)) : [];

  return (
    <>
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
      {selected ? <Modal onClose={() => setSelected(null)} className="drawer-modal"><div className="modal-head"><div><h2>{stats.find((row) => row.salespersonId === selected)?.salespersonName}</h2><p>Sales in selected date range</p></div><button onClick={() => setSelected(null)}><X size={20} /></button></div><div className="demo-box">{selectedRows.length ? selectedRows.map((invoice) => <span key={invoice.id}>{formatDateTime(invoice.date)} · {invoice.id} · {invoice.items} · {INR.format(invoiceDisplayTotal(invoice, products))} · {invoice.status}</span>) : <span>No sales found.</span>}</div></Modal> : null}
    </>
  );
}

function AttendanceTab({ staff, owner, attendance, setAttendance, showToast, range, rangeMode, customFrom, customTo }: { staff: Staff[]; owner: Staff; attendance: AttendanceRecord[]; setAttendance: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>; showToast: AppState["showToast"]; range: { from: Date; to: Date }; rangeMode: DateRangeMode; customFrom: string; customTo: string }) {
  const [subtab, setSubtab] = useState<"mark" | "report" | "summary">("mark");
  return (
    <>
      <div className="attendance-subtabs"><button className={subtab === "mark" ? "active" : ""} onClick={() => setSubtab("mark")}>Mark Attendance</button><button className={subtab === "report" ? "active" : ""} onClick={() => setSubtab("report")}>Attendance Report</button><button className={subtab === "summary" ? "active" : ""} onClick={() => setSubtab("summary")}>Monthly Summary</button></div>
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
      <div className="attendance-head"><strong>Attendance — {formatDate(date)}</strong><DateInput value={date} onChange={(nextDate) => setDate(nextDate ? dateInputKey(nextDate) : "")} /></div>
      {recordsForDate.length ? <div className="success-banner">Attendance marked for this date — tap to edit</div> : null}
      <div className="attendance-actions"><button className="outline" onClick={() => setDrafts((rows) => rows.map((row) => ({ ...row, status: "present", checkInTime: row.checkInTime || "09:30", checkOutTime: row.checkOutTime || "18:00", hoursWorked: hoursBetween(row.checkInTime || "09:30", row.checkOutTime || "18:00") })))}>Mark All Present</button><button className="outline" onClick={copyYesterday}>Copy Yesterday</button></div>
      <div className="attendance-list">{drafts.map((record) => <AttendanceRow key={record.staffId} record={record} staff={staff.find((member) => member.id === record.staffId)} update={update} />)}</div>
      <button className="primary full" onClick={save}>Save Attendance</button>
    </div>
  );
}

function AttendanceRow({ record, staff, update }: { record: AttendanceRecord; staff?: Staff; update: (staffId: string, patch: Partial<AttendanceRecord>) => void }) {
  const showTime = ["present", "late", "half-day"].includes(record.status);
  const duration = hoursLabel(record.checkInTime, record.checkOutTime);
  return (
    <div className={`attendance-row ${record.status}`}>
      <div className="person-cell"><div className="avatar sm">{staffInitials(record.staffName)}</div><strong>{record.staffName}</strong><small>{staff?.role}</small></div>
      <div className="status-pills">{(["present", "absent", "half-day", "late", "leave"] as AttendanceStatus[]).map((status) => <button key={status} className={`${status} ${record.status === status ? "active" : ""}`} onClick={() => update(record.staffId, { status })}>{statusShort(status)}</button>)}</div>
      {showTime ? <div className="time-section"><span><input className="attendance-time-input" type="time" value={record.checkInTime ?? ""} onChange={(event) => update(record.staffId, { checkInTime: event.target.value })} /></span><span><input className="attendance-time-input" type="time" value={record.checkOutTime ?? ""} onChange={(event) => update(record.staffId, { checkOutTime: event.target.value })} /></span><small className={duration === "Invalid" ? "red-text" : ""}>{duration || "--"}</small></div> : <span className="muted">No hours</span>}
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
      <div className="attendance-toolbar"><select value={staffId} onChange={(event) => setStaffId(event.target.value)}><option>All Staff</option>{staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><div className="attendance-toolbar-bottom"><div className="view-toggle"><button className={view === "list" ? "active" : ""} onClick={() => setView("list")}><List size={14} />List View</button><button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}><CalendarDays size={14} />Calendar View</button></div><button className="outline attendance-export" onClick={exportRows}><Download size={16} /><span>Export Attendance</span></button></div></div>
      {view === "list" ? <DataTable headers={["Date", "Staff Name", "Status", "Check-in", "Check-out", "Hours", "Notes"]}>{rows.length ? rows.map((record) => <tr key={record.id}><td>{formatDate(record.date)}</td><td>{record.staffName}</td><td><span className={`attendance-badge ${record.status}`}>{statusLabel(record.status)}</span></td><td>{record.checkInTime ?? "--"}</td><td>{record.checkOutTime ?? "--"}</td><td>{record.hoursWorked ?? "--"}</td><td>{record.notes ?? ""}</td></tr>) : <tr><td className="empty-table" colSpan={7}>No attendance records found.</td></tr>}</DataTable> : <AttendanceCalendar records={rows} staff={staff} month={range.from} />}</div>
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
      <div className="attendance-head monthly-summary-head"><div className="month-nav-group"><button className="outline" onClick={() => setMonth(dateInputKey(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)).slice(0, 7))}>Prev</button><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><button className="outline" onClick={() => setMonth(dateInputKey(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)).slice(0, 7))}>Next</button></div><button className="outline" onClick={exportRows}>Export Summary</button></div>
      <div className="performance-cards"><div><span>Working Days</span><strong>{totalDays}</strong><small>Calendar days</small></div><div><span>Perfect Attendance</span><strong>{perfect}</strong><small>Staff at 100%</small></div><div><span>Avg Attendance</span><strong>{avg.toFixed(1)}%</strong><small>Across team</small></div><div><span>Most Absent</span><strong>{mostAbsent?.member.name ?? "None"}</strong><small>{mostAbsent?.absent ?? 0} absent days</small></div></div>
      <DataTable headers={["Staff", "Present", "Absent", "Half-Day", "Late", "Leave", "Hours", "Attendance %", "Salary Days"]}>{rows.map((row) => <tr key={row.member.id}><td>{row.member.name}</td><td>{row.present}</td><td>{row.absent}</td><td>{row.half}</td><td>{row.late}</td><td>{row.leave}</td><td>{row.hours.toFixed(1)}</td><td><span className={`attendance-percent ${row.percentage >= 90 ? "good" : row.percentage >= 75 ? "warn" : "bad"}`}>{row.percentage.toFixed(1)}%</span></td><td><input className="salary-days-input" type="number" defaultValue={row.salaryDays} /></td></tr>)}</DataTable>
    </div>
  );
}

function Customers() {
  const { customers, setCustomers, invoices, staff, products, showToast } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const rows = customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  const customerInvoices = (customer: Customer) => {
    return invoices.filter((invoice) => invoice.customerId === customer.id || (!invoice.customerId && invoice.customer !== "Walk-in" && invoice.customer === customer.name));
  };
  const customerTotalSpent = (customer: Customer) => customerInvoices(customer).reduce((sum, invoice) => sum + invoiceDisplayTotal(invoice, products), 0);
  const customerLastVisit = (customer: Customer) => {
    const recent = [...customerInvoices(customer)].sort((a, b) => invoiceTime(b) - invoiceTime(a))[0];
    return recent ? formatDateTime(recent.date) : "-";
  };
  const historyInvoices = selected ? customerInvoices(selected) : [];
  return (
    <section className="page">
      <PageHeader title="Customers" subtitle="Manage your customer base and view their history." action={<button className="primary" onClick={() => setAddOpen(true)}><Plus size={16} />Add Customer</button>} />
      <label className="searchbox top-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search customers..." /></label>
      <DataTable headers={["Customer Name", "Contact Info", "Total Spent", "Last Visit", "Actions"]}>
        {rows.length ? rows.map((c) => <tr key={c.email || c.id}><td><div className="person-cell"><div className="avatar sm">{c.name[0]}</div><strong>{c.name}</strong></div></td><td><span>{c.email}</span><small>{c.phone}</small></td><td>{INR.format(customerTotalSpent(c))}</td><td>{customerLastVisit(c)}</td><td><button className="link-button" onClick={() => setSelected(c)}><Eye size={16} />View History</button></td></tr>) : <tr><td className="empty-table" colSpan={5}>No Data Available</td></tr>}
      </DataTable>
      {selected && <Modal onClose={() => setSelected(null)} className="drawer-modal"><div className="modal-head"><h2>{selected.name} History</h2><div className="modal-head-actions"><button className="outline" onClick={() => { const customerId = selected.id; setSelected(null); navigate("/pos", { state: { customerId } }); }}>New Bill</button><button onClick={() => setSelected(null)}><X size={20} /></button></div></div><p className="muted">Recent invoices for {selected.email}</p><div className="demo-box">{historyInvoices.length ? historyInvoices.map((invoice) => <div className="customer-invoice-row" key={invoice.id}><span>{invoice.id} · {invoice.payment} · {INR.format(invoiceDisplayTotal(invoice, products))}</span><button type="button" onClick={() => setHistoryInvoice(invoice)}><Eye size={15} />View</button></div>) : <div className="history-empty">No Data Available</div>}</div></Modal>}
      {historyInvoice ? <InvoiceModal invoice={historyInvoice} mode="view" canEdit={false} staff={staff} products={products} onClose={() => setHistoryInvoice(null)} onEdit={() => undefined} onSave={() => undefined} /> : null}
      {addOpen ? <CustomerModal onClose={() => setAddOpen(false)} onSave={(customer) => { setCustomers((items) => [customer, ...items]); setAddOpen(false); showToast("Customer added successfully"); }} /> : null}
    </section>
  );
}

function CustomerModal({ onClose, onSave }: { onClose: () => void; onSave: (customer: Customer) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const nameValid = name.trim().length > 0;
  const save = () => {
    setTouched(true);
    if (!nameValid) return;
    onSave({ id: crypto.randomUUID(), name: name.trim(), email: email.trim(), phone: phone.trim(), spent: 0, lastVisit: "-" });
  };
  return (
    <Modal onClose={onClose} className="drawer-modal">
      <div className="modal-head"><h2>Add Customer</h2><button onClick={onClose}><X size={20} /></button></div>
      <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Customer name" />{touched && !nameValid ? <small className="field-error">Name field cannot be empty</small> : null}</label>
      <label className="field"><span>Email</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Optional" /></label>
      <label className="field"><span>Phone</span><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Optional" /></label>
      <div className="modal-actions end"><button className="outline" onClick={onClose}>Cancel</button><button className="primary" onClick={save}>Save Customer</button></div>
    </Modal>
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
        {activeInvoices.map((invoice) => <tr key={invoice.id}><td className="linkish">{invoice.id}</td><td>{formatDateTime(invoice.date)}</td><td>{invoice.customer}</td><td><strong>{INR.format(invoice.total)}</strong></td><td>{invoice.payment}</td><td><span className={`status ${invoice.status.toLowerCase()}`}>{invoice.status}</span></td></tr>)}
      </DataTable>
      <DataTable headers={["Expense", "Date", "Category", "Vendor", "Amount", "Payment"]}>
        {activeExpenses.map((expense) => <tr key={expense.id}><td className="linkish">{expense.id}</td><td>{formatDateTime(expense.date)}</td><td>{expense.category}</td><td>{expense.vendor}</td><td><strong>{INR.format(expense.amount)}</strong></td><td>{expense.payment}</td></tr>)}
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
  const [category, setCategory] = useState<ExpenseCategory>("inventory");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("cash");
  const valid = Number(amount) > 0;

  return (
    <Modal onClose={onClose} className="drawer-modal">
      <div className="modal-head"><div><h2>Add Expense</h2><p>Record outgoing cash for reports.</p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid two"><label className="field"><span>Category</span><select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>{Object.entries(expenseCategoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><TextField label="Vendor / Note" value={vendor} onChange={setVendor} placeholder="e.g. Supplier Hub" /></div>
      <TextField label="Description" value={description} onChange={setDescription} placeholder="e.g. Stock purchase" />
      <div className="form-grid two"><TextField label="Amount" type="number" value={amount} onChange={setAmount} placeholder="0.00" /><label className="field"><span>Payment</span><select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}>{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <div className="modal-actions end"><button className="outline" onClick={onClose}>Cancel</button><button className="primary" disabled={!valid} onClick={() => valid && onSave({ id: `EXP-${String(Date.now()).slice(-4)}`, date: new Date().toISOString(), category, description: description.trim() || expenseCategoryLabels[category], vendor: vendor.trim() || "-", amount: Number(amount), payment: paymentLabels[paymentMode], paymentMode, createdBy: "Admin Owner", createdAt: new Date().toISOString() })}>Save Expense</button></div>
    </Modal>
  );
}

const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  rent: "Rent",
  utilities: "Utilities",
  salary: "Salary",
  inventory: "Inventory",
  marketing: "Marketing",
  maintenance: "Maintenance",
  transport: "Transport",
  miscellaneous: "Miscellaneous",
  other: "Other",
};

function expenseCategoryLabel(category: string) {
  return expenseCategoryLabels[category as ExpenseCategory] ?? category;
}

const supplierPaymentTermLabels: Record<NonNullable<Supplier["paymentTerms"]>, string> = {
  Immediate: "Pay Immediately",
  "Net 7": "Pay within 7 days",
  "Net 15": "Pay within 15 days",
  "Net 30": "Pay within 30 days",
};

const paymentLabels: Record<PaymentMode, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
  card: "Card",
  cheque: "Cheque",
};

function nextCode(prefix: string, items: Array<{ id: string }>) {
  const max = items.reduce((value, item) => {
    const number = Number(item.id.replace(`${prefix}-`, ""));
    return Number.isFinite(number) ? Math.max(value, number) : value;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

function ProcurementScreen() {
  const { suppliers, setSuppliers, purchaseOrders, setPurchaseOrders, purchaseBills, setPurchaseBills, products, setProducts, staff, setStockMovements, setLedgerEntries, showToast } = useApp();
  const [tab, setTab] = useHashTab(["suppliers", "purchase-orders", "purchase-bills"] as const, "suppliers");
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierEditing, setSupplierEditing] = useState<Supplier | null>(null);
  const [poOpen, setPoOpen] = useState(false);
  const [poEditing, setPoEditing] = useState<PurchaseOrder | null>(null);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const [billOpen, setBillOpen] = useState(false);
  const [billEditing, setBillEditing] = useState<PurchaseBill | null>(null);
  const [poStatusFilter, setPoStatusFilter] = useState<"all" | POStatus>("all");
  const [poSupplierFilter, setPoSupplierFilter] = useState("all");
  const currentUser = staff.find((member) => member.isCurrent) ?? staff[0];
  const access = roleAccess(currentUser.role);
  const now = new Date();
  const ordersThisMonth = purchaseOrders.filter((po) => new Date(po.orderDate).getMonth() === now.getMonth() && new Date(po.orderDate).getFullYear() === now.getFullYear()).length;
  const totalPayable = purchaseBills.reduce((sum, bill) => sum + bill.balanceDue, 0);
  const paidThisMonth = purchaseBills.filter((bill) => bill.paymentDate && new Date(bill.paymentDate).getMonth() === now.getMonth() && new Date(bill.paymentDate).getFullYear() === now.getFullYear()).reduce((sum, bill) => sum + bill.amountPaid, 0);
  const pendingBills = purchaseBills.filter((bill) => bill.balanceDue > 0).length;
  const overdueBills = purchaseBills.filter((bill) => bill.balanceDue > 0 && bill.dueDate && new Date(bill.dueDate) < now).length;
  const statRows = tab === "suppliers"
    ? [["Total suppliers", suppliers.length], ["Orders this month", ordersThisMonth], ["Total payable", INR.format(totalPayable)], ["Paid this month", INR.format(paidThisMonth)]]
    : tab === "purchase-orders"
      ? [["Draft", purchaseOrders.filter((po) => po.status === "draft").length], ["Sent", purchaseOrders.filter((po) => po.status === "sent").length], ["Received", purchaseOrders.filter((po) => po.status === "received").length], ["Cancelled", purchaseOrders.filter((po) => po.status === "cancelled").length]]
      : [["Total payable", INR.format(totalPayable)], ["Paid this month", INR.format(paidThisMonth)], ["Pending bills", pendingBills], ["Overdue", overdueBills]];
  const newLabel = tab === "suppliers" ? "New supplier" : tab === "purchase-orders" ? "New order" : "New bill";
  const filteredPurchaseOrders = purchaseOrders.filter((po) => (poStatusFilter === "all" || po.status === poStatusFilter) && (poSupplierFilter === "all" || po.supplierId === poSupplierFilter));
  const openNew = () => {
    if (tab === "suppliers") { setSupplierEditing(null); setSupplierOpen(true); }
    if (tab === "purchase-orders") { setPoEditing(null); setPoOpen(true); }
    if (tab === "purchase-bills") { setBillEditing(null); setBillOpen(true); }
  };
  const confirmBill = (bill: PurchaseBill) => {
    const status: PurchaseBill["status"] = bill.balanceDue <= 0 ? "paid" : bill.amountPaid > 0 ? "partial_paid" : "confirmed";
    const confirmed = { ...bill, status };
    const stockUpdate = applyPurchaseBillStock(products, confirmed);
    setProducts(stockUpdate.products as Product[]);
    setStockMovements((items) => [...stockUpdate.movements, ...items]);
    setLedgerEntries((items) => entriesWithRunningBalance(items, createBillLedgerEntries(confirmed)));
    setPurchaseBills((items) => items.map((item) => item.id === bill.id ? confirmed : item));
    showToast(`${bill.billNo} confirmed`);
  };
  const markPaid = (bill: PurchaseBill) => {
    const paymentAmount = bill.balanceDue;
    const amountPaid = Math.min(bill.grandTotal, bill.amountPaid + paymentAmount);
    const updated: PurchaseBill = { ...bill, amountPaid, balanceDue: Math.max(0, bill.grandTotal - amountPaid), status: "paid", paymentDate: new Date().toISOString(), paymentMode: bill.paymentMode ?? "bank_transfer" };
    setLedgerEntries((items) => entriesWithRunningBalance(items, createBillPaymentLedgerEntries(updated, paymentAmount)));
    setPurchaseBills((items) => items.map((item) => item.id === bill.id ? updated : item));
    showToast(`${bill.billNo} marked paid`);
  };
  const savePurchaseBill = (bill: PurchaseBill) => {
    setPurchaseBills((items) => billEditing ? items.map((item) => item.id === billEditing.id ? bill : item) : [bill, ...items]);
    setLedgerEntries((items) => {
      const withoutBill = items.filter((entry) => entry.referenceId !== bill.id && entry.referenceId !== bill.billNo);
      const entries = [createPurchaseBillSummaryLedgerEntry(bill)];
      return entriesWithRunningBalance(withoutBill, entries);
    });
    setBillOpen(false);
    showToast(`${bill.billNo} saved`);
  };

  return (
    <section className="page tab-page">
      <PageHeader title="Procurement" subtitle="Manage suppliers, purchase orders, and purchased bills." action={<button className="primary" onClick={openNew}><Plus size={16} />{newLabel}</button>} />
      <div className="tab-bar"><button className={tab === "suppliers" ? "active" : ""} onClick={() => setTab("suppliers")}>Suppliers</button><button className={tab === "purchase-orders" ? "active" : ""} onClick={() => setTab("purchase-orders")}>Purchase orders</button><button className={tab === "purchase-bills" ? "active" : ""} onClick={() => setTab("purchase-bills")}>Purchased Bills</button></div>
      <div className="cashflow-grid procurement-stats summary-fade">{statRows.map(([label, value]) => <div className="card cash-card" key={label}><span>{label}</span><strong>{value}</strong><small>{tab === "purchase-bills" ? "purchased bills" : tab.replace("-", " ")}</small></div>)}</div>
      {tab === "suppliers" ? <DataTable headers={["Name", "Contact", "Phone", "GSTIN", "Orders", "Balance", "Actions"]}>{suppliers.length ? suppliers.map((supplier) => {
        const orders = purchaseOrders.filter((po) => po.supplierId === supplier.id && po.status !== "cancelled");
        const balance = purchaseBills.filter((bill) => bill.supplierId === supplier.id).reduce((sum, bill) => sum + bill.balanceDue, 0);
        return <tr key={supplier.id}><td><strong>{supplier.name}</strong><small>{supplierPaymentTermLabels[supplier.paymentTerms ?? "Immediate"]}</small></td><td>{supplier.contactPerson || "-"}</td><td>{supplier.phone}</td><td>{supplier.gstin || "-"}</td><td>{orders.length}</td><td><strong>{INR.format(balance)}</strong></td><td className="actions"><button title="Edit" onClick={() => { setSupplierEditing(supplier); setSupplierOpen(true); }}><Pencil size={16} /></button>{access.canDeleteSuppliers ? <button title="Delete" onClick={() => { setSuppliers((items) => items.filter((item) => item.id !== supplier.id)); showToast("Supplier deleted"); }}><Trash2 size={16} /></button> : null}</td></tr>;
      }) : <tr><td className="empty-table" colSpan={7}>No Data Available</td></tr>}</DataTable> : null}
      {tab === "purchase-orders" ? <>
        <div className="po-header-toolbar procurement-filter-row"><select className="filter-select" value={poStatusFilter} onChange={(event) => setPoStatusFilter(event.target.value as "all" | POStatus)}><option value="all">All Status</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="partial">Partial</option><option value="received">Received</option><option value="cancelled">Cancelled</option></select><select className="filter-select" value={poSupplierFilter} onChange={(event) => setPoSupplierFilter(event.target.value)}><option value="all">All Suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div>
        <DataTable headers={["PO No.", "Date", "Supplier", "Items", "Total", "Status", "Actions"]}>{filteredPurchaseOrders.length ? filteredPurchaseOrders.map((po) => <tr key={po.id}><td className="linkish">{po.id}</td><td>{formatDate(po.orderDate)}</td><td>{po.supplierName}</td><td>{po.items.length} items</td><td><strong>{INR.format(po.grandTotal)}</strong></td><td><span className={`po-status ${po.status}`}>{po.status}</span></td><td className="actions"><button title="View / Edit" onClick={() => { setPoEditing(po); setPoOpen(true); }}><Eye size={16} /></button>{po.status !== "received" && po.status !== "cancelled" ? <button title="Receive Goods" onClick={() => setReceiving(po)}><PackagePlus size={16} /></button> : null}<button title="Cancel" onClick={() => setPurchaseOrders((items) => items.map((item) => item.id === po.id ? { ...item, status: "cancelled", updatedAt: new Date().toISOString() } : item))}><Trash2 size={16} /></button></td></tr>) : <tr><td className="empty-table" colSpan={7}>No Data Available</td></tr>}</DataTable>
      </> : null}
      {tab === "purchase-bills" ? <DataTable headers={["Bill No", "Date", "Supplier", "Invoice No", "Total", "Paid", "Paid On", "Balance", "Status", "Actions"]}>{purchaseBills.length ? purchaseBills.map((bill) => {
        const displayStatus = purchaseBillDisplayStatus(bill);
        return <tr key={bill.id}><td className="linkish">{bill.billNo}</td><td>{formatDate(bill.billDate)}</td><td>{bill.supplierName}</td><td>{bill.supplierInvoiceNo || "-"}</td><td><strong>{INR.format(bill.grandTotal)}</strong></td><td>{INR.format(bill.amountPaid)}</td><td>{bill.paymentDate && (displayStatus === "paid" || displayStatus === "partial") ? formatDate(bill.paymentDate) : "-"}</td><td><strong>{INR.format(bill.balanceDue)}</strong></td><td><span className={`po-status ${displayStatus}`}>{purchaseBillStatusLabel(displayStatus)}</span></td><td className="actions"><button title="View / Edit" onClick={() => { setBillEditing(bill); setBillOpen(true); }}><Eye size={16} /></button>{bill.status === "draft" ? <button title="Confirm Bill" onClick={() => confirmBill(bill)}><Check size={16} /></button> : null}{bill.balanceDue > 0 ? <button title="Mark Paid" onClick={() => markPaid(bill)}><IndianRupee size={16} /></button> : null}<button title="Delete" onClick={() => setPurchaseBills((items) => items.filter((item) => item.id !== bill.id))}><Trash2 size={16} /></button></td></tr>;
      }) : <tr><td className="empty-table" colSpan={10}>No Data Available</td></tr>}</DataTable> : null}
      {supplierOpen ? <SupplierModal supplier={supplierEditing} onClose={() => setSupplierOpen(false)} onSave={(supplier) => { setSuppliers((items) => supplierEditing ? items.map((item) => item.id === supplierEditing.id ? supplier : item) : [supplier, ...items]); showToast(supplierEditing ? "Supplier updated" : "Supplier added"); setSupplierOpen(false); }} /> : null}
      {poOpen ? <PurchaseOrderModal po={poEditing} products={products} suppliers={suppliers} purchaseOrders={purchaseOrders} onClose={() => setPoOpen(false)} onSave={(po) => { setPurchaseOrders((items) => poEditing ? items.map((item) => item.id === poEditing.id ? po : item) : [po, ...items]); showToast(`${po.id} saved`); setPoOpen(false); }} /> : null}
      {billOpen ? <PurchaseBillModal bill={billEditing} bills={purchaseBills} purchaseOrders={purchaseOrders} suppliers={suppliers} products={products} onClose={() => setBillOpen(false)} onSave={savePurchaseBill} /> : null}
      {receiving ? <ReceiveGoodsModal po={receiving} onClose={() => setReceiving(null)} onReceive={(received) => {
        let updatedCount = 0;
        setPurchaseOrders((items) => items.map((po) => po.id !== receiving.id ? po : { ...po, items: po.items.map((item) => { const addQty = received[item.id] ?? 0; if (addQty > 0) updatedCount += 1; return { ...item, receivedQty: Math.min(item.orderedQty, item.receivedQty + addQty) }; }), updatedAt: new Date().toISOString() }));
        setProducts((items) => items.map((product) => { const poItem = receiving.items.find((item) => item.productId === product.id); const addQty = poItem ? received[poItem.id] ?? 0 : 0; return addQty > 0 ? { ...product, stock: product.stock + addQty, costPrice: poItem?.unitCost } : product; }));
        showToast(`Stock updated for ${updatedCount} products`);
        setReceiving(null);
      }} /> : null}
    </section>
  );
}

function SuppliersScreen() {
  const { suppliers, setSuppliers, purchaseOrders, staff, showToast } = useApp();
  const navigate = useNavigate();
  const currentUser = staff.find((member) => member.isCurrent) ?? staff[0];
  const access = roleAccess(currentUser.role);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [open, setOpen] = useState(false);
  const rows = suppliers.filter((supplier) => `${supplier.name} ${supplier.phone} ${supplier.gstin ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <section className="page">
      <PageHeader title="Suppliers" subtitle="Manage your product suppliers." action={<button className="primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} />Add Supplier</button>} />
      <label className="searchbox top-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search supplier, phone, or GSTIN" /></label>
      <DataTable headers={["Name", "Contact", "Phone", "GSTIN", "Orders", "Balance", "Actions"]}>
        {rows.length ? rows.map((supplier) => {
          const orders = purchaseOrders.filter((po) => po.supplierId === supplier.id && po.status !== "cancelled");
          const balance = orders.filter((po) => po.status !== "received").reduce((sum, po) => sum + po.grandTotal, 0);
          return <tr key={supplier.id}><td><strong>{supplier.name}</strong><small>{supplierPaymentTermLabels[supplier.paymentTerms ?? "Immediate"]}</small></td><td>{supplier.contactPerson || "-"}</td><td>{supplier.phone}</td><td>{supplier.gstin || "-"}</td><td>{orders.length}</td><td><strong>{INR.format(balance)}</strong></td><td className="actions"><button title="Edit" onClick={() => { setEditing(supplier); setOpen(true); }}><Pencil size={16} /></button><button title="View Orders" onClick={() => navigate("/purchase-orders")}><Eye size={16} /></button>{access.canDeleteSuppliers ? <button title="Delete" onClick={() => { setSuppliers((items) => items.filter((item) => item.id !== supplier.id)); showToast("Supplier deleted"); }}><Trash2 size={16} /></button> : null}</td></tr>;
        }) : <tr><td className="empty-table" colSpan={7}>No Data Available</td></tr>}
      </DataTable>
      {open ? <SupplierModal supplier={editing} onClose={() => setOpen(false)} onSave={(supplier) => {
        setSuppliers((items) => editing ? items.map((item) => item.id === editing.id ? supplier : item) : [supplier, ...items]);
        showToast(editing ? "Supplier updated" : "Supplier added");
        setOpen(false);
      }} /> : null}
    </section>
  );
}

function SupplierModal({ supplier, onClose, onSave }: { supplier: Supplier | null; onClose: () => void; onSave: (supplier: Supplier) => void }) {
  const [form, setForm] = useState<Supplier>(supplier ?? { id: crypto.randomUUID(), name: "", phone: "", paymentTerms: "Immediate", createdAt: new Date().toISOString(), isActive: true });
  const valid = form.name.trim() && form.phone.trim() && (!form.gstin || form.gstin.trim().length >= 13);
  const update = <K extends keyof Supplier>(key: K, value: Supplier[K]) => setForm((draft) => ({ ...draft, [key]: value }));
  return (
    <Modal onClose={onClose} className="drawer-modal">
      <div className="modal-head"><div><h2>{supplier ? "Edit Supplier" : "Add Supplier"}</h2><p>Supplier profile and payment details.</p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid two"><TextField label="Supplier Name" value={form.name} onChange={(value) => update("name", value)} /><TextField label="Contact Person" value={form.contactPerson ?? ""} onChange={(value) => update("contactPerson", value)} /></div>
      <div className="form-grid two"><TextField label="Phone" value={form.phone} onChange={(value) => update("phone", value)} /><TextField label="Email" type="email" value={form.email ?? ""} onChange={(value) => update("email", value)} /></div>
      <div className="form-grid two"><TextField label="GSTIN" value={form.gstin ?? ""} onChange={(value) => update("gstin", value.toUpperCase().slice(0, 15))} /><label className="field"><span className="label-with-info">Payment Terms <span className="info-icon" title="Payment Terms define how many days the supplier allows before payment is due">ⓘ</span></span><select value={form.paymentTerms ?? "Immediate"} onChange={(event) => update("paymentTerms", event.target.value as Supplier["paymentTerms"])}>{Object.entries(supplierPaymentTermLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <label className="field"><span>Address</span><textarea value={form.address ?? ""} onChange={(event) => update("address", event.target.value)} placeholder="Supplier address" /></label>
      <label className="field"><span>Notes</span><textarea value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value)} placeholder="Internal notes" /></label>
      <div className="modal-actions end"><button className="outline" onClick={onClose}>Cancel</button><button className="primary" disabled={!valid} onClick={() => valid && onSave({ ...form, name: form.name.trim(), phone: form.phone.trim() })}>Save Supplier</button></div>
    </Modal>
  );
}

function PurchaseOrdersScreen() {
  const { purchaseOrders, setPurchaseOrders, suppliers, products, setProducts, showToast } = useApp();
  const [status, setStatus] = useState<"all" | POStatus>("all");
  const [supplierId, setSupplierId] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const rows = purchaseOrders.filter((po) => (status === "all" || po.status === status) && (supplierId === "all" || po.supplierId === supplierId));

  return (
    <section className="page purchase-orders-page">
      <div className="po-page-header"><div className="po-header-top"><div><h1>Purchase Orders</h1><p>Track stock procurement from suppliers.</p></div><button className="primary po-new-button" onClick={() => { setEditing(null); setOpen(true); }}><span>+</span><span>New PO</span></button></div><div className="po-header-toolbar"><select className="filter-select" value={status} onChange={(event) => setStatus(event.target.value as "all" | POStatus)}><option value="all">All Status</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="partial">Partial</option><option value="received">Received</option><option value="cancelled">Cancelled</option></select><select className="filter-select" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}><option value="all">All Suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></div></div>
      <DataTable headers={["PO No.", "Date", "Supplier", "Items", "Total", "Status", "Actions"]}>
        {rows.length ? rows.map((po) => <tr key={po.id}><td className="linkish">{po.id}</td><td>{formatDate(po.orderDate)}</td><td>{po.supplierName}</td><td>{po.items.length} items</td><td><strong>{INR.format(po.grandTotal)}</strong></td><td><span className={`po-status ${po.status}`}>{po.status}</span></td><td className="actions"><button title="View / Edit" onClick={() => { setEditing(po); setOpen(true); }}><Eye size={16} /></button>{po.status === "draft" ? <button title="Edit Draft" onClick={() => { setEditing(po); setOpen(true); }}><Edit size={16} /></button> : null}{po.status !== "received" && po.status !== "cancelled" ? <button title="Receive Goods" onClick={() => setReceiving(po)}><PackagePlus size={16} /></button> : null}<button title="Cancel" onClick={() => setPurchaseOrders((items) => items.map((item) => item.id === po.id ? { ...item, status: "cancelled", updatedAt: new Date().toISOString() } : item))}><Trash2 size={16} /></button></td></tr>) : <tr><td className="empty-table" colSpan={7}>No Data Available</td></tr>}
      </DataTable>
      {open ? <PurchaseOrderModal po={editing} products={products} suppliers={suppliers} purchaseOrders={purchaseOrders} onClose={() => setOpen(false)} onSave={(po) => {
        setPurchaseOrders((items) => editing ? items.map((item) => item.id === editing.id ? po : item) : [po, ...items]);
        showToast(`${po.id} saved`);
        setOpen(false);
      }} /> : null}
      {receiving ? <ReceiveGoodsModal po={receiving} onClose={() => setReceiving(null)} onReceive={(received) => {
        let updatedCount = 0;
        setPurchaseOrders((items) => items.map((po) => {
          if (po.id !== receiving.id) return po;
          const nextItems = po.items.map((item) => {
            const addQty = received[item.id] ?? 0;
            if (addQty > 0) updatedCount += 1;
            return { ...item, receivedQty: Math.min(item.orderedQty, item.receivedQty + addQty) };
          });
          const allReceived = nextItems.every((item) => item.receivedQty >= item.orderedQty);
          const hasReceived = nextItems.some((item) => item.receivedQty > 0);
          return { ...po, items: nextItems, status: allReceived ? "received" : hasReceived ? "partial" : po.status, receivedDate: allReceived ? new Date().toISOString() : po.receivedDate, updatedAt: new Date().toISOString() };
        }));
        setProducts((items) => items.map((product) => {
          const poItem = receiving.items.find((item) => item.productId === product.id);
          const addQty = poItem ? received[poItem.id] ?? 0 : 0;
          return addQty > 0 ? { ...product, stock: product.stock + addQty, costPrice: poItem?.unitCost } : product;
        }));
        showToast(`Stock updated for ${updatedCount} products`);
        setReceiving(null);
      }} /> : null}
    </section>
  );
}

function PurchaseBillsScreen() {
  const { purchaseBills, setPurchaseBills, purchaseOrders, suppliers, products, setProducts, setStockMovements, setLedgerEntries, showToast } = useApp();
  const [status, setStatus] = useState<PurchaseBill["status"] | "all">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseBill | null>(null);
  const rows = purchaseBills.filter((bill) => status === "all" || bill.status === status);
  const now = new Date();
  const totalPayable = purchaseBills.reduce((sum, bill) => sum + bill.balanceDue, 0);
  const paidThisMonth = purchaseBills.filter((bill) => bill.paymentDate && new Date(bill.paymentDate).getMonth() === now.getMonth() && new Date(bill.paymentDate).getFullYear() === now.getFullYear()).reduce((sum, bill) => sum + bill.amountPaid, 0);
  const pendingBills = purchaseBills.filter((bill) => bill.balanceDue > 0).length;
  const overdueBills = purchaseBills.filter((bill) => bill.balanceDue > 0 && bill.dueDate && new Date(bill.dueDate) < now).length;

  function saveBill(bill: PurchaseBill) {
    setPurchaseBills((items) => editing ? items.map((item) => item.id === editing.id ? bill : item) : [bill, ...items]);
    setLedgerEntries((items) => {
      const withoutBill = items.filter((entry) => entry.referenceId !== bill.id && entry.referenceId !== bill.billNo);
      const entries = [createPurchaseBillSummaryLedgerEntry(bill)];
      return entriesWithRunningBalance(withoutBill, entries);
    });
    setOpen(false);
    setEditing(null);
    showToast(`${bill.billNo} saved`);
  }

  function confirmBill(bill: PurchaseBill) {
    const status: PurchaseBill["status"] = bill.balanceDue <= 0 ? "paid" : bill.amountPaid > 0 ? "partial_paid" : "confirmed";
    const confirmed = { ...bill, status };
    const stockUpdate = applyPurchaseBillStock(products, confirmed);
    setProducts(stockUpdate.products as Product[]);
    setStockMovements((items) => [...stockUpdate.movements, ...items]);
    setLedgerEntries((items) => entriesWithRunningBalance(items, createBillLedgerEntries(confirmed)));
    setPurchaseBills((items) => items.map((item) => item.id === bill.id ? confirmed : item));
    showToast(`${bill.billNo} confirmed`);
  }

  function markPaid(bill: PurchaseBill) {
    const paymentAmount = bill.balanceDue;
    const amountPaid = Math.min(bill.grandTotal, bill.amountPaid + paymentAmount);
    const updated: PurchaseBill = { ...bill, amountPaid, balanceDue: Math.max(0, bill.grandTotal - amountPaid), status: "paid", paymentDate: new Date().toISOString(), paymentMode: bill.paymentMode ?? "bank_transfer" };
    setLedgerEntries((items) => entriesWithRunningBalance(items, createBillPaymentLedgerEntries(updated, paymentAmount)));
    setPurchaseBills((items) => items.map((item) => item.id === bill.id ? updated : item));
    showToast(`${bill.billNo} marked paid`);
  }

  return (
    <section className="page">
      <PageHeader title="Purchase Bills" subtitle="Record supplier invoices and manage payables" action={<div className="toolbar"><select value={status} onChange={(event) => setStatus(event.target.value as PurchaseBill["status"] | "all")}><option value="all">All</option><option value="draft">Draft</option><option value="confirmed">Confirmed</option><option value="paid">Paid</option><option value="partial_paid">Partial Paid</option></select><button className="primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} />New Bill</button></div>} />
      <div className="cashflow-grid"><div className="card cash-card"><span>Total Payable</span><strong className="red-text">{INR.format(totalPayable)}</strong><small>Money owed</small></div><div className="card cash-card"><span>Paid This Month</span><strong className="green-text">{INR.format(paidThisMonth)}</strong><small>Supplier payments</small></div><div className="card cash-card"><span>Pending Bills</span><strong>{pendingBills}</strong><small>Bills with balance</small></div><div className="card cash-card"><span>Overdue Bills</span><strong className="red-text">{overdueBills}</strong><small>Past due date</small></div></div>
      <DataTable headers={["Bill No", "Date", "Supplier", "Invoice No", "Total", "Paid", "Balance", "Status", "Actions"]}>
        {rows.length ? rows.map((bill) => <tr key={bill.id}><td className="linkish">{bill.billNo}</td><td>{formatDate(bill.billDate)}</td><td>{bill.supplierName}</td><td>{bill.supplierInvoiceNo || "-"}</td><td><strong>{INR.format(bill.grandTotal)}</strong></td><td>{INR.format(bill.amountPaid)}</td><td><strong>{INR.format(bill.balanceDue)}</strong></td><td><span className={`po-status ${bill.status === "partial_paid" ? "partial" : bill.status}`}>{bill.status.replace("_", " ")}</span></td><td className="actions"><button title="View / Edit" onClick={() => { setEditing(bill); setOpen(true); }}><Eye size={16} /></button>{bill.status === "draft" ? <button title="Confirm Bill" onClick={() => confirmBill(bill)}><Check size={16} /></button> : null}{bill.balanceDue > 0 ? <button title="Mark Paid" onClick={() => markPaid(bill)}><IndianRupee size={16} /></button> : null}<button title="Delete" onClick={() => setPurchaseBills((items) => items.filter((item) => item.id !== bill.id))}><Trash2 size={16} /></button></td></tr>) : <tr><td className="empty-table" colSpan={9}>No Data Available</td></tr>}
      </DataTable>
      {open ? <PurchaseBillModal bill={editing} bills={purchaseBills} purchaseOrders={purchaseOrders} suppliers={suppliers} products={products} onClose={() => setOpen(false)} onSave={saveBill} /> : null}
    </section>
  );
}

function PurchaseBillModal({ bill, bills, purchaseOrders, suppliers, products, onClose, onSave }: { bill: PurchaseBill | null; bills: PurchaseBill[]; purchaseOrders: PurchaseOrder[]; suppliers: Supplier[]; products: Product[]; onClose: () => void; onSave: (bill: PurchaseBill) => void }) {
  const [supplierId, setSupplierId] = useState(bill?.supplierId ?? suppliers[0]?.id ?? "");
  const [supplierName, setSupplierName] = useState(bill?.supplierName ?? suppliers[0]?.name ?? "");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState(bill?.supplierInvoiceNo ?? "");
  const [linkedPOId, setLinkedPOId] = useState(bill?.linkedPOId ?? "");
  const [billDate, setBillDate] = useState(dateKey(bill?.billDate ?? new Date().toISOString()));
  const [dueDate, setDueDate] = useState(bill?.dueDate ? dateKey(bill.dueDate) : "");
  const [notes, setNotes] = useState(bill?.notes ?? "");
  const [amountPaid, setAmountPaid] = useState(String(bill?.amountPaid ?? 0));
  const [paymentMode, setPaymentMode] = useState<PurchaseBillPaymentMode>(bill?.paymentMode ?? "credit");
  const [paymentStatus, setPaymentStatus] = useState<PurchaseBillPaymentStatus>(bill?.paymentStatus ?? (bill?.status === "paid" ? "paid" : bill?.status === "partial_paid" ? "partial" : "unpaid"));
  const [paidOn, setPaidOn] = useState(bill?.paymentDate ? dateKey(bill.paymentDate) : "");
  const [paidVia, setPaidVia] = useState<PurchaseBillPaidVia>(bill?.paidVia ?? (bill?.paymentMode && bill.paymentMode !== "credit" ? bill.paymentMode : ""));
  const [items, setItems] = useState<PurchaseBillItem[]>(bill?.items ?? (products[0] ? [buildPurchaseBillItem(products[0], 1, products[0].costPrice ?? products[0].price * 0.65)] : []));
  const supplier = suppliers.find((item) => item.id === supplierId);
  const totals = totalsForPurchaseBill(items);
  const paid = paymentStatus === "paid" ? totals.grandTotal : paymentStatus === "unpaid" ? 0 : Math.min(totals.grandTotal, Number(amountPaid) || 0);
  const autoReminderDates = dueDate && paymentStatus !== "paid" ? [15, 10, 5].map((days) => {
    const reminderDate = new Date(dueDate);
    reminderDate.setDate(reminderDate.getDate() - days);
    return { days, date: reminderDate };
  }) : [];

  function linkPO(poId: string) {
    setLinkedPOId(poId);
    const po = purchaseOrders.find((item) => item.id === poId);
    if (!po) return;
    setSupplierId(po.supplierId);
    setSupplierName(po.supplierName);
    setItems(po.items.map((item) => ({
      id: crypto.randomUUID(),
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      quantity: item.receivedQty || item.orderedQty,
      unit: "piece",
      unitCost: item.unitCost,
      gstRate: item.gstRate,
      cgst: item.cgst,
      sgst: item.sgst,
      igst: item.igst,
      lineTotal: item.lineTotal,
      updateStock: true,
    })));
  }

  function updateItem(id: string, patch: Partial<PurchaseBillItem>) {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const merged = { ...item, ...patch };
      const taxable = merged.quantity * merged.unitCost;
      const gst = taxable * (merged.gstRate / 100);
      return { ...merged, cgst: gst / 2, sgst: gst / 2, igst: 0, lineTotal: taxable + gst };
    }));
  }

  function selectProduct(id: string, productId: string) {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setItems((current) => current.map((item) => item.id === id ? { ...buildPurchaseBillItem(product, item.quantity, product.costPrice ?? product.price * 0.65), id } : item));
  }

  function save(status: PurchaseBill["status"]) {
    const vendor = supplier?.name ?? supplierName.trim();
    if (!vendor || !items.length) return;
    const paymentDrivenStatus: PurchaseBill["status"] = status === "draft" ? "draft" : paymentStatus === "paid" ? "paid" : paymentStatus === "partial" ? "partial_paid" : "confirmed";
    const paymentDate = paid > 0 ? new Date(paidOn || new Date().toISOString()).toISOString() : undefined;
    onSave({ id: bill?.id ?? crypto.randomUUID(), billNo: bill?.billNo ?? `BILL-${String(bills.length + 1).padStart(4, "0")}`, supplierId: supplier?.id, supplierName: vendor, supplierGSTIN: supplier?.gstin, supplierInvoiceNo, linkedPOId: linkedPOId || undefined, status: paymentDrivenStatus, items, ...totals, amountPaid: paid, balanceDue: Math.max(0, totals.grandTotal - paid), billDate: new Date(billDate).toISOString(), dueDate: dueDate ? new Date(dueDate).toISOString() : undefined, paymentMode: paidVia && paidVia !== "card" ? paidVia : paymentMode, paymentDate, paymentStatus, paidVia, reminders: autoReminderDates.map((reminder) => ({ days: reminder.days, date: reminder.date.toISOString(), triggered: false })), notes, createdBy: "Admin Owner", createdAt: bill?.createdAt ?? new Date().toISOString() });
  }

  return (
    <Modal onClose={onClose} className="wide-modal">
      <div className="modal-head"><div><h2>{bill ? bill.billNo : "New Purchase Bill"}</h2><p>Supplier invoice, stock update, and payment tracking.</p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid three"><label className="field"><span>Supplier</span><select value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setSupplierName(suppliers.find((item) => item.id === event.target.value)?.name ?? ""); }}><option value="">Free text supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><TextField label="Supplier Invoice No" value={supplierInvoiceNo} onChange={setSupplierInvoiceNo} /><label className="field"><span>Link to Purchase Order</span><select value={linkedPOId} onChange={(event) => linkPO(event.target.value)}><option value="">No linked PO</option>{purchaseOrders.map((po) => <option key={po.id} value={po.id}>{po.id} · {po.supplierName}</option>)}</select></label></div>
      {!supplierId ? <TextField label="Supplier Name" value={supplierName} onChange={setSupplierName} /> : null}
      {linkedPOId ? <div className="demo-box">Imported from {linkedPOId}</div> : null}
      <div className="form-grid three"><TextField label="Bill Date" type="date" value={billDate} onChange={setBillDate} /><TextField label="Due Date" type="date" value={dueDate} onChange={setDueDate} /><TextField label="Amount Paid" type="number" value={amountPaid} onChange={setAmountPaid} /></div>
      <div className="form-grid three">
        <label className="field"><span>Payment Status *</span><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as PurchaseBillPaymentStatus)}><option value="unpaid">Unpaid</option><option value="partial">Partially Paid</option><option value="paid">Paid</option></select></label>
        {paymentStatus === "paid" || paymentStatus === "partial" ? <TextField label="Paid On" type="date" value={paidOn} onChange={setPaidOn} /> : <div />}
        {paymentStatus === "paid" || paymentStatus === "partial" ? <label className="field"><span>Paid Via</span><select value={paidVia} onChange={(event) => setPaidVia(event.target.value as PurchaseBillPaidVia)}><option value="">Select method</option><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="card">Card</option></select></label> : <div />}
      </div>
      {paymentStatus === "partial" ? <div className="form-grid two"><TextField label="Amount Paid (₹)" type="number" value={amountPaid} onChange={setAmountPaid} /><label className="field"><span>Balance Due (₹)</span><input type="number" readOnly value={Math.max(0, totals.grandTotal - paid).toFixed(2)} /></label></div> : null}
      <label className="field"><span>Payment Mode</span><select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as PurchaseBillPaymentMode)}><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="upi">UPI</option><option value="cheque">Cheque</option><option value="credit">Credit</option></select></label>
      <div className="po-items"><div className="po-items-head"><strong>Items</strong><button className="outline" onClick={() => products[0] && setItems((current) => [...current, buildPurchaseBillItem(products[0], 1, products[0].costPrice ?? products[0].price * 0.65)])}>Add Item</button></div>{items.map((item) => <div className="po-item-row" key={item.id}><label><span>Product</span><select value={item.productId ?? ""} onChange={(event) => selectProduct(item.id, event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label><span>Qty</span><input type="number" min="0" value={item.quantity} onChange={(event) => updateItem(item.id, { quantity: Number(event.target.value) || 0 })} /></label><label><span>Unit</span><input value={item.unit} onChange={(event) => updateItem(item.id, { unit: event.target.value })} /></label><label><span>Unit Cost</span><input type="number" min="0" value={item.unitCost} onChange={(event) => updateItem(item.id, { unitCost: Number(event.target.value) || 0 })} /></label><label><span>GST %</span><select value={item.gstRate} onChange={(event) => updateItem(item.id, { gstRate: Number(event.target.value) })}><option value={0}>0</option><option value={5}>5</option><option value={12}>12</option><option value={18}>18</option><option value={28}>28</option></select></label><label className="stock-checkbox-field"><span>Update Stock</span><input type="checkbox" checked={item.updateStock} onChange={(event) => updateItem(item.id, { updateStock: event.target.checked })} /></label><strong>{INR.format(item.lineTotal)}</strong><button className="danger-light" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}>Remove</button><small>CGST {INR.format(item.cgst)} · SGST {INR.format(item.sgst)}</small></div>)}</div>
      <div className="totals-box"><span>Subtotal <strong>{INR.format(totals.subtotal)}</strong></span><span>Total GST <strong>{INR.format(totals.totalGST)}</strong></span><span>Grand Total <strong>{INR.format(totals.grandTotal)}</strong></span><span>Balance Due <strong>{INR.format(Math.max(0, totals.grandTotal - paid))}</strong></span></div>
      {autoReminderDates.length ? <div className="payment-reminder-box auto-reminder-box"><div className="auto-reminder-title">Auto Payment Reminders Scheduled</div>{autoReminderDates.map((reminder) => {
        const isPast = reminder.date < new Date();
        return <div className={`auto-reminder-row ${isPast ? "past" : ""}`} key={reminder.days}><span>{reminder.days} days before due ({formatDate(reminder.date)})</span><strong>{isPast ? "Passed" : "Scheduled"}</strong></div>;
      })}<div className="auto-reminder-foot">Due: {formatDate(dueDate)} · Balance: {INR.format(Math.max(0, totals.grandTotal - paid))}</div></div> : null}
      <label className="field"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <div className="modal-actions"><button className="outline" onClick={onClose}>Cancel</button><button className="outline" onClick={() => save("draft")}>Save as Draft</button><button className="primary" onClick={() => save(paid >= totals.grandTotal ? "paid" : paid > 0 ? "partial_paid" : "confirmed")}>Confirm Bill</button></div>
    </Modal>
  );
}

function PurchaseOrderModal({ po, suppliers, products, purchaseOrders, onClose, onSave }: { po: PurchaseOrder | null; suppliers: Supplier[]; products: Product[]; purchaseOrders: PurchaseOrder[]; onClose: () => void; onSave: (po: PurchaseOrder) => void }) {
  const [supplierId, setSupplierId] = useState(po?.supplierId ?? suppliers[0]?.id ?? "");
  const [orderDate, setOrderDate] = useState(dateKey(po?.orderDate ?? new Date().toISOString()));
  const [expectedDate, setExpectedDate] = useState(po?.expectedDate ?? "");
  const [notes, setNotes] = useState(po?.notes ?? "");
  const [items, setItems] = useState<POItem[]>(po?.items ?? (products[0] ? [buildPOItem(products[0], 1, 0, Math.round(products[0].price * 0.65 * 100) / 100)] : []));
  const supplier = suppliers.find((item) => item.id === supplierId);
  const totals = totalsForPO(items);
  const updateItem = (id: string, next: Partial<POItem>) => setItems((current) => current.map((item) => {
    if (item.id !== id) return item;
    const merged = { ...item, ...next };
    return { ...buildPOItem({ ...products.find((product) => product.id === merged.productId)!, gstRate: merged.gstRate, name: merged.productName, sku: merged.sku }, merged.orderedQty, merged.receivedQty, merged.unitCost), id: item.id };
  }));
  const selectProduct = (id: string, productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    setItems((current) => current.map((item) => item.id === id ? { ...buildPOItem(product, item.orderedQty, item.receivedQty, product.costPrice ?? Math.round(product.price * 0.65 * 100) / 100), id: item.id } : item));
  };
  const save = (status: POStatus) => {
    if (!supplier || !items.length) return;
    onSave({ id: po?.id ?? nextCode("PO", purchaseOrders), supplierId: supplier.id, supplierName: supplier.name, supplierGSTIN: supplier.gstin, status, items, ...totals, orderDate: new Date(orderDate).toISOString(), expectedDate, notes, createdBy: "Admin Owner", createdAt: po?.createdAt ?? new Date().toISOString(), updatedAt: new Date().toISOString() });
  };
  return (
    <Modal onClose={onClose} className="wide-modal">
      <div className="modal-head"><div><h2>{po ? po.id : "New Purchase Order"}</h2><p>Supplier order, GST breakdown, and receiving workflow.</p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid three"><label className="field"><span>Supplier</span><select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label><TextField label="Order Date" type="date" value={orderDate} onChange={setOrderDate} /><TextField label="Expected Delivery" type="date" value={expectedDate} onChange={setExpectedDate} /></div>
      <label className="field"><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <div className="po-items"><div className="po-items-head"><strong>Items</strong><button className="outline" onClick={() => products[0] && setItems((current) => [...current, buildPOItem(products[0], 1, 0, products[0].costPrice ?? products[0].price * 0.65)])}>Add Another Item</button></div>{items.map((item) => <div className="po-item-row" key={item.id}><label><span>Product</span><select value={item.productId} onChange={(event) => selectProduct(item.id, event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label><span>SKU</span><input readOnly value={item.sku} /></label><label><span>Qty</span><input type="number" min="0" step="1" value={item.orderedQty} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateItem(item.id, { orderedQty: Number.parseFloat(event.target.value) || 0 })} /></label><label><span>Unit Cost ₹</span><input type="number" min="0" step="0.01" value={item.unitCost} onFocus={(event) => event.currentTarget.select()} onChange={(event) => updateItem(item.id, { unitCost: Number.parseFloat(event.target.value) || 0 })} /></label><label><span>GST %</span><select value={item.gstRate} onChange={(event) => updateItem(item.id, { gstRate: Number(event.target.value) })}><option value={0}>0</option><option value={5}>5</option><option value={12}>12</option><option value={18}>18</option><option value={28}>28</option></select></label><strong>{INR.format(item.lineTotal)}</strong><button className="danger-light" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))}>Remove</button><small>CGST {INR.format(item.cgst)} · SGST {INR.format(item.sgst)}</small></div>)}</div>
      <div className="totals-box"><span>Subtotal <strong>{INR.format(totals.subtotal)}</strong></span><span>Total CGST <strong>{INR.format(totals.totalCGST)}</strong></span><span>Total SGST <strong>{INR.format(totals.totalSGST)}</strong></span><span>Grand Total <strong>{INR.format(totals.grandTotal)}</strong></span></div>
      <div className="modal-actions"><button className="outline" onClick={onClose}>Cancel</button><button className="outline" disabled={!supplier || !items.length} onClick={() => save("draft")}>Save as Draft</button><button className="primary" disabled={!supplier || !items.length} onClick={() => save("sent")}>Send to Supplier</button></div>
    </Modal>
  );
}

function ReceiveGoodsModal({ po, onClose, onReceive }: { po: PurchaseOrder; onClose: () => void; onReceive: (received: Record<string, number>) => void }) {
  const [received, setReceived] = useState<Record<string, number>>({});
  return (
    <Modal onClose={onClose} className="drawer-modal">
      <div className="modal-head"><div><h2>Receive Goods</h2><p>{po.id} · {po.supplierName}</p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="receive-list">{po.items.map((item) => {
        const remaining = Math.max(0, item.orderedQty - item.receivedQty);
        return <div className="receive-row" key={item.id}><div><strong>{item.productName}</strong><span>Ordered {item.orderedQty} · Received {item.receivedQty} · Pending {remaining}</span></div><input type="number" min="0" max={remaining} defaultValue={0} onFocus={(event) => event.currentTarget.select()} onChange={(event) => setReceived((draft) => ({ ...draft, [item.id]: Math.min(remaining, Number.parseInt(event.target.value, 10) || 0) }))} /></div>;
      })}</div>
      <div className="modal-actions end"><button className="outline" onClick={onClose}>Cancel</button><button className="primary" onClick={() => onReceive(received)}>Confirm Receipt</button></div>
    </Modal>
  );
}

function ExpensesScreen() {
  const { expenses, setExpenses, setLedgerEntries, showToast } = useApp();
  const [mode, setMode] = useState<DateRangeMode>("month");
  const [customFrom, setCustomFrom] = useState(dateKey(new Date().toISOString()));
  const [customTo, setCustomTo] = useState(dateKey(new Date().toISOString()));
  const [category, setCategory] = useState<"all" | ExpenseCategory>("all");
  const [editing, setEditing] = useState<Expense | null>(null);
  const [open, setOpen] = useState(false);
  const range = rangeBounds(mode, customFrom, customTo);
  const periodExpenses = expenses.filter((expense) => new Date(expense.date) >= range.from && new Date(expense.date) <= range.to && (category === "all" || expense.category === category));
  const total = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = Object.entries(periodExpenses.reduce<Record<string, number>>((totals, expense) => ({ ...totals, [expense.category]: (totals[expense.category] ?? 0) + expense.amount }), {})).sort((a, b) => b[1] - a[1]);
  const largest = byCategory[0];
  const avgDaily = total / Math.max(1, Math.ceil((range.to.getTime() - range.from.getTime()) / 86400000));
  const monthlyExpenseData = monthlyData.map((item, index) => ({ month: item.month, revenue: 280 + index * 75 + (index % 2 ? 90 : 0) }));
  return (
    <section className="page">
      <div className="page-header expenses-page-header">
        <div><h1>Expenses</h1><p>Track operating expenses and category trends.</p></div>
        <button className="primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus size={16} />Add Expense</button>
        <div className="expenses-filter-inline"><DateRangeFilter mode={mode} setMode={setMode} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} /></div>
      </div>
      <div className="cashflow-grid"><div className="card cash-card"><span>Total Expenses</span><strong>{INR.format(total)}</strong><small>{periodExpenses.length} records</small></div><div className="card cash-card"><span>Largest Category</span><strong>{largest ? expenseCategoryLabels[largest[0] as ExpenseCategory] : "-"}</strong><small>{largest ? INR.format(largest[1]) : "No spend"}</small></div><div className="card cash-card"><span>Avg Daily Expense</span><strong>{INR.format(avgDaily)}</strong><small>Selected period</small></div></div>
      <div className="report-grid"><div className="card"><h2>Category Breakdown</h2><div className="category-breakdown">{byCategory.map(([name, amount]) => <div className="category-row-item" key={name}><div><strong>{expenseCategoryLabel(name)}</strong><span>{Math.round((amount / Math.max(total, 1)) * 100)}%</span></div><div className="progress"><i style={{ width: `${Math.round((amount / Math.max(total, 1)) * 100)}%` }} /></div><b>{INR.format(amount)}</b></div>)}</div></div><div className="card chart-card"><h2>Monthly Expense Trend</h2><RevenueChart data={monthlyExpenseData} xKey="month" height={260} /></div></div>
      <div className="section-head"><h2>All Expenses</h2><label className="field compact"><select value={category} onChange={(event) => setCategory(event.target.value as "all" | ExpenseCategory)}><option value="all">All Categories</option>{Object.entries(expenseCategoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <DataTable headers={["Date", "Description", "Category", "Vendor", "Amount", "Payment", "Actions"]}>
        {periodExpenses.length ? periodExpenses.map((expense) => <tr key={expense.id}><td>{formatDate(expense.date)}</td><td><strong>{expense.description}</strong><small>{expense.receiptNo ?? ""}</small></td><td><span className={`expense-badge ${expense.category}`}>{expenseCategoryLabel(expense.category)}</span></td><td>{expense.vendor ?? "-"}</td><td><strong>{INR.format(expense.amount)}</strong></td><td>{paymentLabels[expense.paymentMode]}</td><td className="actions"><button onClick={() => { setEditing(expense); setOpen(true); }}><Edit size={16} /></button><button onClick={() => { setExpenses((items) => items.filter((item) => item.id !== expense.id)); showToast("Expense deleted"); }}><Trash2 size={16} /></button></td></tr>) : <tr><td colSpan={7}><div className="empty compact">No expenses recorded. Add your first expense.</div></td></tr>}
      </DataTable>
      {open ? <ExpenseEditorModal expense={editing} expenses={expenses} onClose={() => setOpen(false)} onSave={(expense) => {
        setExpenses((items) => editing ? items.map((item) => item.id === editing.id ? expense : item) : [expense, ...items]);
        setLedgerEntries((items) => entriesWithRunningBalance(items, createExpenseLedgerEntry(expense)));
        showToast(editing ? "Expense updated" : "Expense recorded");
        setOpen(false);
      }} /> : null}
    </section>
  );
}

function ExpenseEditorModal({ expense, expenses, onClose, onSave }: { expense: Expense | null; expenses: Expense[]; onClose: () => void; onSave: (expense: Expense) => void }) {
  const [form, setForm] = useState<Expense>(expense ?? { id: nextCode("EXP", expenses), category: "inventory", description: "", amount: 0, paymentMode: "cash", payment: "Cash", vendor: "", date: new Date().toISOString(), createdBy: "Admin Owner", createdAt: new Date().toISOString() });
  const [customCategory, setCustomCategory] = useState("");
  const update = <K extends keyof Expense>(key: K, value: Expense[K]) => setForm((draft) => ({ ...draft, [key]: value }));
  const valid = form.description.trim() && form.amount > 0;
  const finalCategory = form.category === "other" ? (customCategory.trim() || "other") : form.category;
  return (
    <Modal onClose={onClose} className="drawer-modal">
      <div className="modal-head"><div><h2>{expense ? "Edit Expense" : "Add Expense"}</h2><p>Record outgoing cash with category reporting.</p></div><button onClick={onClose}><X size={20} /></button></div>
      <div className="form-grid two"><TextField label="Date" type="date" value={dateKey(form.date)} onChange={(value) => update("date", new Date(value).toISOString())} /><label className="field"><span>Category</span><select value={form.category} onChange={(event) => update("category", event.target.value as ExpenseCategory)}>{Object.entries(expenseCategoryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>{form.category === "other" && <div style={{ marginTop: "8px" }}><input type="text" placeholder="Enter category (optional)" value={customCategory} onChange={(event) => setCustomCategory(event.target.value)} style={{ width: "100%", height: "36px", padding: "0 10px", border: "0.5px solid #e5e7eb", borderRadius: "6px", fontSize: "13px", fontFamily: "inherit", color: "#111827" }} /><span style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px", display: "block" }}>This field is optional</span></div>}</label></div>
      <TextField label="Description" value={form.description} onChange={(value) => update("description", value)} placeholder="e.g. Staff salary, rent, electricity" />
      <div className="form-grid two"><TextField label="Amount ₹" type="number" value={String(form.amount)} onChange={(value) => update("amount", Number(value))} /><label className="field"><span>Payment Mode</span><select value={form.paymentMode} onChange={(event) => { const value = event.target.value as PaymentMode; update("paymentMode", value); update("payment", paymentLabels[value]); }}>{Object.entries(paymentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <div className="form-grid two"><TextField label="Vendor / Paid To" value={form.vendor ?? ""} onChange={(value) => update("vendor", value)} /><TextField label="Receipt No." value={form.receiptNo ?? ""} onChange={(value) => update("receiptNo", value)} /></div>
      <label className="field"><span>Notes</span><textarea value={form.notes ?? ""} onChange={(event) => update("notes", event.target.value)} /></label>
      <div className="modal-actions end"><button className="outline" onClick={onClose}>Cancel</button><button className="primary" disabled={!valid} onClick={() => valid && onSave({ ...form, category: finalCategory as ExpenseCategory })}>Save Expense</button></div>
    </Modal>
  );
}

function PnLScreen({ embedded = false }: { embedded?: boolean }) {
  const { invoices, purchaseOrders, purchaseBills, expenses, products } = useApp();
  const [mode, setMode] = useState<DateRangeMode>("month");
  const [customFrom, setCustomFrom] = useState(dateKey(new Date().toISOString()));
  const [customTo, setCustomTo] = useState(dateKey(new Date().toISOString()));
  const range = rangeBounds(mode, customFrom, customTo);
  const report = computePnLFromData({ from: range.from, to: range.to, sales: invoices, purchases: purchaseOrders, purchaseBills, expenses, products });
  const pnlRows = [
    ["Gross Sales", report.grossRevenue],
    ["Less: Returns", -report.returnsValue],
    ["Net Revenue", report.netRevenue],
    ["Purchases", report.purchasesValue],
    ["Cost of Goods Sold", report.cogs],
    ["Gross Profit", report.grossProfit],
    ["Total Expenses", report.totalExpenses],
    ["Net Profit", report.netProfit],
    ["Output GST", report.outputGST],
    ["Input GST", -report.inputGST],
    ["Net GST Payable", report.netGSTPayable],
  ];
  const exportCSV = () => {
    const csv = ["Line,Amount", ...pnlRows.map(([label, amount]) => `${label},${amount}`)].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "profit-and-loss.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportPDF = () => {
    const rows = pnlRows.map(([label, amount]) => `<tr><td>${label}</td><td class="amount">${INR.format(Number(amount))}</td></tr>`).join("");
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(`<!doctype html><html><head><title>P&L Report</title><style>body{font-family:Inter,Arial,sans-serif;padding:32px;color:#111827}h1{font-size:22px}table{width:100%;border-collapse:collapse}td{padding:10px 12px;border-bottom:1px solid #E5E7EB}.amount{text-align:right;font-weight:700}</style></head><body><h1>Profit & Loss Report</h1><p>${formatDate(range.from)} to ${formatDate(range.to)}</p><table>${rows}</table></body></html>`);
      w.document.close();
      w.print();
    }
  };
  return (
    <section className={embedded ? "tab-page pnl-page" : "page pnl-page"}>
      {!embedded ? <PageHeader title="Profit & Loss" subtitle="Financial performance overview." /> : null}
      <div className="pnl-toolbar-row">
        <DateRangeFilter mode={mode} setMode={setMode} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
        <div className="pnl-export-actions"><button className="outline form-control" onClick={exportCSV}><Download size={16} />Export CSV</button><button className="primary form-control" onClick={exportPDF}>Export PDF</button></div>
      </div>
      <div className="pnl-kpi-row"><div className="card cash-card pnl-kpi-card"><span>Net Revenue</span><strong>{INR.format(report.netRevenue)}</strong><small>Sales minus returns</small></div><div className="card cash-card pnl-kpi-card"><span>Gross Profit</span><strong className={report.grossProfit >= 0 ? "green-text" : "red-text"}>{INR.format(report.grossProfit)}</strong><small>{report.grossMarginPct.toFixed(1)}% margin</small></div><div className="card cash-card pnl-kpi-card"><span>Total Expenses</span><strong>{INR.format(report.totalExpenses)}</strong><small>Operating spend</small></div><div className="card cash-card pnl-kpi-card"><span>Net Profit</span><strong className={report.netProfit >= 0 ? "green-text" : "red-text"}>{INR.format(report.netProfit)}</strong><small>{report.netMarginPct.toFixed(1)}% net margin</small></div></div>
      <div className="report-grid"><div className="card pnl-statement"><h2>P&L Statement</h2><StatementSection title="Revenue" rows={[["Gross Sales", report.grossRevenue], ["Less: Returns", -report.returnsValue], ["Net Revenue", report.netRevenue]]} /><StatementSection title="Cost of Goods Sold" rows={[["Purchases", report.purchasesValue], ["Closing Stock", report.closingStock], ["Cost of Goods Sold", report.cogs]]} /><StatementSection title="Operating Expenses" rows={[...report.expensesByCategory.map((item) => [expenseCategoryLabels[item.category as ExpenseCategory] ?? item.category, item.amount] as [string, number]), ["Total Expenses", report.totalExpenses]]} /><StatementSection title="GST Summary" rows={[["Output GST", report.outputGST], ["Input GST", -report.inputGST], ["Net GST Payable", report.netGSTPayable]]} /><div className={`statement-total ${report.netProfit >= 0 ? "profit" : "loss"}`}><span>Net Profit</span><strong>{INR.format(report.netProfit)}</strong></div></div><div className="card chart-card"><h2>Revenue vs Expenses</h2><ResponsiveContainer width="100%" height={300}><BarChart data={monthlyData.map((item, index) => ({ month: item.month, revenue: item.revenue, expenses: 500 + index * 120, profit: item.revenue - (500 + index * 120) }))} barCategoryGap="16%" margin={{ top: 10, right: 20, left: 0, bottom: 0 }}><CartesianGrid vertical={false} stroke="#E5E7EB" /><XAxis dataKey="month" /><YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k`} /><Tooltip formatter={(value) => INR.format(Number(value))} /><Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={52} /><Bar dataKey="expenses" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={52} /></BarChart></ResponsiveContainer></div></div>
    </section>
  );
}

function FinancialsScreen() {
  const [tab, setTab] = useHashTab(["balance-sheet", "pl", "ledger"] as const, "balance-sheet");
  return (
    <section className="page tab-page">
      <PageHeader title="Financials" subtitle="Financial reports, position, and transaction history." />
      <div className="tab-bar"><button className={tab === "balance-sheet" ? "active" : ""} onClick={() => setTab("balance-sheet")}>Balance sheet</button><button className={tab === "pl" ? "active" : ""} onClick={() => setTab("pl")}>P&L report</button><button className={tab === "ledger" ? "active" : ""} onClick={() => setTab("ledger")}>Ledger</button></div>
      {tab === "balance-sheet" ? <BalanceSheetPanel /> : tab === "pl" ? <PnLScreen embedded /> : <LedgerPanel />}
    </section>
  );
}

function BalanceSheetScreen() {
  return (
    <section className="page">
      <PageHeader title="Balance Sheet" subtitle="Financial position as of today" />
      <BalanceSheetPanel />
    </section>
  );
}

function BalanceSheetPanel() {
  const { invoices, purchaseOrders, purchaseBills, expenses, products } = useApp();
  const [asOf, setAsOf] = useState(dateKey(new Date().toISOString()));
  const statement = computeBalanceSheetFromData({ asOfDate: new Date(asOf), sales: invoices, purchaseOrders, purchaseBills, expenses, products });
  const assets = statement.assets.currentAssets;
  const liabilities = statement.liabilities.currentLiabilities;
  return (
    <>
      <div className="tab-toolbar"><DateInput value={asOf} onChange={(date) => setAsOf(date ? dateInputKey(date) : "")} style={{ height: "32px", borderRadius: "6px" }} /><button className="outline form-control push-right" onClick={() => window.print()}><Download size={16} />Export PDF</button></div>
      {!statement.isBalanced ? <div className="warning-banner"><AlertTriangle size={16} />Balance Sheet does not balance — check entries</div> : <div className="demo-box">Balance Sheet is balanced</div>}
      <div className="financial-grid">
        <div className="card pnl-statement">
          <h2>Assets</h2>
          <StatementSection title="Current Assets" rows={[["Cash in Hand", assets.cash], ["Bank Balance", assets.bankBalance], ["UPI/Card Receipts", assets.upiBalance], ["Accounts Receivable", assets.accountsReceivable], ["Inventory (Stock)", assets.inventory], ["Total Current Assets", assets.totalCurrentAssets]]} />
          <StatementSection title="Fixed Assets" rows={[["Total Fixed Assets", statement.assets.fixedAssets.totalFixedAssets]]} />
          <div className="statement-total profit"><span>Total Assets</span><strong>{INR.format(statement.assets.totalAssets)}</strong></div>
        </div>
        <div className="card pnl-statement">
          <h2>Liabilities</h2>
          <StatementSection title="Current Liabilities" rows={[["Accounts Payable", liabilities.accountsPayable], ["GST Payable", liabilities.gstPayable], ["Total Liabilities", liabilities.totalCurrentLiabilities]]} />
          <StatementSection title="Equity" rows={[["Opening Capital", statement.equity.openingCapital], ["Net Profit", statement.equity.netProfit], ["Less: Drawings", -statement.equity.drawings], ["Total Equity", statement.equity.totalEquity]]} />
          <div className="statement-total profit"><span>Total Liabilities + Equity</span><strong>{INR.format(statement.totalLiabilitiesAndEquity)}</strong></div>
        </div>
      </div>
    </>
  );
}

function LedgerScreen() {
  return (
    <section className="page">
      <PageHeader title="Ledger" subtitle="Complete transaction history by account" />
      <LedgerPanel />
    </section>
  );
}

function LedgerPanel() {
  const { ledgerEntries, suppliers, customers } = useApp();
  const [accountType, setAccountType] = useState<AccountType | "all">("all");
  const [partyId, setPartyId] = useState("all");
  const [search, setSearch] = useState("");
  const parties = [...suppliers.map((supplier) => ({ id: supplier.id, name: supplier.name })), ...customers.map((customer) => ({ id: customer.id, name: customer.name }))];
  const rows = ledgerEntries.filter((entry) => (accountType === "all" || entry.accountType === accountType) && (partyId === "all" || entry.partyId === partyId) && (!search.trim() || entry.description.toLowerCase().includes(search.trim().toLowerCase()) || entry.referenceId.toLowerCase().includes(search.trim().toLowerCase())));
  const grouped = rows.reduce<Record<string, LedgerEntry[]>>((acc, entry) => {
    const key = `${entry.accountType}:${entry.accountName}`;
    acc[key] = [...(acc[key] ?? []), entry];
    return acc;
  }, {});
  return (
    <>
      <div className="ledger-filter-row"><select className="form-control" value={accountType} onChange={(event) => setAccountType(event.target.value as AccountType | "all")}><option value="all">All Account Types</option>{(["cash", "bank", "upi", "sales", "purchases", "expenses", "supplier", "customer", "gst_output", "gst_input", "capital", "drawings"] as AccountType[]).map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}</select><select className="form-control" value={partyId} onChange={(event) => setPartyId(event.target.value)}><option value="all">All Parties</option>{parties.map((party) => <option key={party.id} value={party.id}>{party.name}</option>)}</select><label className="icon-input"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ledger" /></label><button className="outline form-control export-right" onClick={() => downloadCSV("ledger.csv", rows.map((entry) => ({ Date: formatDate(entry.date), Description: entry.description, Reference: entry.referenceId, Debit: entry.debit, Credit: entry.credit, Balance: entry.balance }))) }><Download size={16} />Export CSV</button></div>
      {Object.entries(grouped).length ? Object.entries(grouped).map(([key, entries]) => {
        const [, name] = key.split(":");
        const closing = entries.reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
        return <div className="card" key={key}><div className="section-head"><h2>{name}</h2><strong>{INR.format(closing)}</strong></div><DataTable headers={["Date", "Description", "Reference", "Debit", "Credit", "Balance"]}>{entries.map((entry) => <tr key={entry.id}><td>{formatDate(entry.date)}</td><td>{entry.description}</td><td>{entry.referenceId}</td><td>{entry.debit ? INR.format(entry.debit) : "-"}</td><td>{entry.credit ? INR.format(entry.credit) : "-"}</td><td><strong className={entry.balance >= 0 ? "green-text" : "red-text"}>{INR.format(entry.balance)}</strong></td></tr>)}</DataTable></div>;
      }) : <div className="empty compact">No ledger entries found.</div>}
    </>
  );
}

function StatementSection({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  return <div className="statement-section"><h3>{title}</h3>{rows.map(([label, amount]) => <div className="statement-row" key={label}><span>{label}</span><strong className={amount < 0 ? "red-text" : ""}>{amount < 0 ? `(${INR.format(Math.abs(amount))})` : INR.format(amount)}</strong></div>)}</div>;
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
      <label className="field"><span>Role</span><div className="select-wrap"><select value={role} onChange={(e) => setRole(e.target.value === "Cashier (POS Only)" ? "Cashier" : e.target.value as StaffRole)}><option>Cashier (POS Only)</option><option>Staff</option><option>Manager</option><option>Owner</option></select></div></label>
      <IconField label="Password" icon={<Lock size={17} />} value={password} onChange={setPassword} placeholder={staff ? "Leave blank to keep current" : "Min. 8 characters"} type="password" />
      <div className="modal-actions end"><button className="primary" disabled={!valid} onClick={() => valid && onSave({ id: staff?.id ?? crypto.randomUUID(), name, email, role, isCurrent: staff?.isCurrent })}>{staff ? "Update Account" : "Create Account"}</button></div>
    </Modal>
  );
}

function TextField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  if (type === "date") {
    return <label className="field"><span>{label}</span><DateInput value={value} onChange={(date) => onChange(date ? dateInputKey(date) : "")} placeholder={placeholder} /></label>;
  }
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
