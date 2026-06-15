import type { Expense } from "../types/expense";

let expenses: Expense[] = [];

export const expenseService = {
  async getAll() {
    return expenses;
  },
  async getById(id: string) {
    const expense = expenses.find((item) => item.id === id);
    if (!expense) throw new Error("Expense not found");
    return expense;
  },
  async create(data: Expense) {
    expenses = [data, ...expenses];
    return data;
  },
  async update(id: string, data: Partial<Expense>) {
    let updated: Expense | undefined;
    expenses = expenses.map((expense) => {
      if (expense.id !== id) return expense;
      updated = { ...expense, ...data };
      return updated;
    });
    if (!updated) throw new Error("Expense not found");
    return updated;
  },
  async delete(id: string) {
    expenses = expenses.filter((expense) => expense.id !== id);
  },
  async getSummaryByCategory() {
    return Object.entries(expenses.reduce<Record<string, number>>((totals, expense) => {
      totals[expense.category] = (totals[expense.category] ?? 0) + expense.amount;
      return totals;
    }, {})).map(([category, amount]) => ({ category, amount }));
  },
  async getMonthlyTotals(months: number) {
    return Array.from({ length: months }, (_, index) => ({ month: String(index + 1), amount: 0 }));
  },
  async generateExpenseNumber() {
    return `EXP-${String(expenses.length + 1).padStart(4, "0")}`;
  },
};
