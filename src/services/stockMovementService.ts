import type { MovementType, StockMovement } from "../types/stockMovement";

let stockMovements: StockMovement[] = [];

export const stockMovementService = {
  seed(items: StockMovement[]) {
    stockMovements = items;
  },
  async createStockMovement(data: Omit<StockMovement, "id">) {
    const movement: StockMovement = { ...data, id: `SM-${String(Date.now()).slice(-6)}-${stockMovements.length + 1}` };
    stockMovements = [movement, ...stockMovements];
    return movement;
  },
  async getMovementsByProduct(productId: string, from?: Date, to?: Date) {
    return filterByDate(stockMovements.filter((item) => item.productId === productId), from, to);
  },
  async getMovementsByType(type: MovementType, from?: Date, to?: Date) {
    return filterByDate(stockMovements.filter((item) => item.type === type), from, to);
  },
  async getRecentMovements(limit: number) {
    return stockMovements.slice(0, limit);
  },
  async getAll() {
    return stockMovements;
  },
};

function filterByDate(items: StockMovement[], from?: Date, to?: Date) {
  return items.filter((item) => {
    const time = new Date(item.date).getTime();
    return (!from || time >= from.getTime()) && (!to || time <= to.getTime());
  });
}
