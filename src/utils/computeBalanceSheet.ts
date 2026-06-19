import type { PurchaseOrder } from "../types/purchaseOrder";
import type { PurchaseBill } from "../types/purchaseBill";
import { computePnLFromData } from "./computePnL";

type SaleLike = { date: string; total: number; gst?: number; status: string; payment: string };
type ProductLike = { stock: number; costPrice?: number; price: number };
type ExpenseLike = { date: string; category: string; amount: number };

export interface BalanceSheet {
  asOfDate: string;
  assets: {
    currentAssets: {
      cash: number;
      bankBalance: number;
      upiBalance: number;
      accountsReceivable: number;
      inventory: number;
      totalCurrentAssets: number;
    };
    fixedAssets: { totalFixedAssets: number };
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: {
      accountsPayable: number;
      gstPayable: number;
      totalCurrentLiabilities: number;
    };
    totalLiabilities: number;
  };
  equity: {
    openingCapital: number;
    netProfit: number;
    drawings: number;
    retainedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export function computeBalanceSheetFromData(args: {
  asOfDate: Date;
  sales: SaleLike[];
  purchaseOrders: PurchaseOrder[];
  purchaseBills: PurchaseBill[];
  expenses: ExpenseLike[];
  products: ProductLike[];
}): BalanceSheet {
  const cutoff = args.asOfDate.getTime();
  const completedSales = args.sales.filter((sale) => sale.status.toLowerCase() === "completed" && new Date(sale.date).getTime() <= cutoff);
  const purchaseBills = args.purchaseBills.filter((bill) => new Date(bill.billDate).getTime() <= cutoff);
  const cashPaid = purchaseBills.filter((bill) => bill.paymentMode === "cash").reduce((sum, bill) => sum + bill.amountPaid, 0);
  const bankPaid = purchaseBills.filter((bill) => ["bank_transfer", "cheque"].includes(bill.paymentMode ?? "")).reduce((sum, bill) => sum + bill.amountPaid, 0);
  const upiPaid = purchaseBills.filter((bill) => bill.paymentMode === "upi").reduce((sum, bill) => sum + bill.amountPaid, 0);
  const cash = completedSales.filter((sale) => sale.payment.toLowerCase() === "cash").reduce((sum, sale) => sum + sale.total, 0) - cashPaid;
  const bankBalance = completedSales.filter((sale) => sale.payment.toLowerCase().includes("bank")).reduce((sum, sale) => sum + sale.total, 0) - bankPaid;
  const upiBalance = completedSales.filter((sale) => ["card", "qr", "upi"].some((term) => sale.payment.toLowerCase().includes(term))).reduce((sum, sale) => sum + sale.total, 0) - upiPaid;
  const inventory = args.products.reduce((sum, product) => sum + product.stock * (product.costPrice ?? product.price * 0.65), 0);
  const accountsPayable = purchaseBills.filter((bill) => bill.status !== "paid").reduce((sum, bill) => sum + bill.balanceDue, 0);
  const outputGST = completedSales.reduce((sum, sale) => sum + (sale.gst ?? 0), 0);
  const inputGST = purchaseBills.filter((bill) => bill.status !== "draft").reduce((sum, bill) => sum + bill.totalGST, 0);
  const gstPayable = Math.max(0, outputGST - inputGST);
  const pnl = computePnLFromData({ from: new Date("2000-01-01"), to: args.asOfDate, sales: args.sales, purchases: args.purchaseOrders, purchaseBills, expenses: args.expenses, products: args.products });
  const totalCurrentAssets = cash + bankBalance + upiBalance + inventory;
  const totalAssets = totalCurrentAssets;
  const totalCurrentLiabilities = accountsPayable + gstPayable;
  const totalLiabilities = totalCurrentLiabilities;
  const totalEquity = pnl.netProfit;
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return {
    asOfDate: args.asOfDate.toISOString(),
    assets: { currentAssets: { cash, bankBalance, upiBalance, accountsReceivable: 0, inventory, totalCurrentAssets }, fixedAssets: { totalFixedAssets: 0 }, totalAssets },
    liabilities: { currentLiabilities: { accountsPayable, gstPayable, totalCurrentLiabilities }, totalLiabilities },
    equity: { openingCapital: 0, netProfit: pnl.netProfit, drawings: 0, retainedEarnings: pnl.netProfit, totalEquity },
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1,
  };
}
