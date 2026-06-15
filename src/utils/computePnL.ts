export interface PnLReport {
  period: { from: string; to: string };
  grossRevenue: number;
  returnsValue: number;
  netRevenue: number;
  openingStock: number;
  purchasesValue: number;
  closingStock: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  expensesByCategory: { category: string; amount: number }[];
  totalExpenses: number;
  netProfit: number;
  netMarginPct: number;
  outputGST: number;
  inputGST: number;
  netGSTPayable: number;
}

type SaleLike = { date: string; total: number; gst?: number; gstAmount?: number; status: string };
type PurchaseLike = { orderDate: string; grandTotal: number; totalGST: number; status: string };
type ExpenseLike = { date: string; category: string; amount: number };
type ProductLike = { stock: number; costPrice?: number; price: number };

export function computePnLFromData(args: {
  from: Date;
  to: Date;
  sales: SaleLike[];
  purchases: PurchaseLike[];
  expenses: ExpenseLike[];
  products: ProductLike[];
}): PnLReport {
  const inRange = (value: string) => {
    const time = new Date(value).getTime();
    return !Number.isNaN(time) && time >= args.from.getTime() && time <= args.to.getTime();
  };
  const completedSales = args.sales.filter((sale) => inRange(sale.date) && sale.status.toLowerCase() === "completed");
  const refundedSales = args.sales.filter((sale) => inRange(sale.date) && sale.status.toLowerCase() === "refunded");
  const receivedPurchases = args.purchases.filter((po) => inRange(po.orderDate) && ["received", "partial"].includes(po.status));
  const periodExpenses = args.expenses.filter((expense) => inRange(expense.date));
  const grossRevenue = completedSales.reduce((sum, sale) => sum + sale.total, 0);
  const returnsValue = refundedSales.reduce((sum, sale) => sum + sale.total, 0);
  const netRevenue = grossRevenue - returnsValue;
  const purchasesValue = receivedPurchases.reduce((sum, po) => sum + po.grandTotal, 0);
  const closingStock = args.products.reduce((sum, product) => sum + product.stock * (product.costPrice ?? product.price * 0.65), 0);
  const cogs = Math.max(0, purchasesValue);
  const grossProfit = netRevenue - cogs;
  const expensesByCategory = Object.entries(periodExpenses.reduce<Record<string, number>>((totals, expense) => {
    totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
    return totals;
  }, {})).map(([category, amount]) => ({ category, amount }));
  const totalExpenses = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const outputGST = completedSales.reduce((sum, sale) => sum + (sale.gstAmount ?? sale.gst ?? 0), 0);
  const inputGST = receivedPurchases.reduce((sum, po) => sum + po.totalGST, 0);

  return {
    period: { from: args.from.toISOString(), to: args.to.toISOString() },
    grossRevenue,
    returnsValue,
    netRevenue,
    openingStock: 0,
    purchasesValue,
    closingStock,
    cogs,
    grossProfit,
    grossMarginPct: netRevenue ? (grossProfit / netRevenue) * 100 : 0,
    expensesByCategory,
    totalExpenses,
    netProfit,
    netMarginPct: netRevenue ? (netProfit / netRevenue) * 100 : 0,
    outputGST,
    inputGST,
    netGSTPayable: outputGST - inputGST,
  };
}
