import type { AccountSummary, AccountType, LedgerEntry } from "../types/ledgerEntry";

let ledgerEntries: LedgerEntry[] = [];

export const ledgerService = {
  seed(items: LedgerEntry[]) {
    ledgerEntries = items;
  },
  async createEntry(data: Omit<LedgerEntry, "id" | "balance">) {
    const balance = runningBalance(data.accountType) + data.debit - data.credit;
    const entry: LedgerEntry = { ...data, id: `LED-${String(Date.now()).slice(-6)}-${ledgerEntries.length + 1}`, balance };
    ledgerEntries = [entry, ...ledgerEntries];
    return entry;
  },
  async createEntries(entries: Array<Omit<LedgerEntry, "id" | "balance">>) {
    const created: LedgerEntry[] = [];
    for (const entry of entries) created.push(await this.createEntry(entry));
    return created;
  },
  async getEntriesByAccount(accountType: AccountType, from?: Date, to?: Date) {
    return filterByDate(ledgerEntries.filter((item) => item.accountType === accountType), from, to);
  },
  async getEntriesByParty(partyId: string, from?: Date, to?: Date) {
    return filterByDate(ledgerEntries.filter((item) => item.partyId === partyId), from, to);
  },
  async getRunningBalance(accountType: AccountType) {
    return runningBalance(accountType);
  },
  async getAllEntries(filters?: { accountType?: AccountType | "all"; partyId?: string; search?: string; from?: Date; to?: Date }) {
    const search = filters?.search?.trim().toLowerCase();
    return filterByDate(ledgerEntries, filters?.from, filters?.to).filter((item) =>
      (!filters?.accountType || filters.accountType === "all" || item.accountType === filters.accountType) &&
      (!filters?.partyId || item.partyId === filters.partyId) &&
      (!search || item.description.toLowerCase().includes(search) || item.referenceId.toLowerCase().includes(search))
    );
  },
  async getAccountSummary() {
    const grouped = ledgerEntries.reduce<Record<string, AccountSummary>>((acc, entry) => {
      const key = `${entry.accountType}:${entry.accountName}`;
      acc[key] ??= { accountType: entry.accountType, accountName: entry.accountName, debit: 0, credit: 0, balance: 0 };
      acc[key].debit += entry.debit;
      acc[key].credit += entry.credit;
      acc[key].balance += entry.debit - entry.credit;
      return acc;
    }, {});
    return Object.values(grouped);
  },
};

function runningBalance(accountType: AccountType) {
  return ledgerEntries.filter((item) => item.accountType === accountType).reduce((sum, entry) => sum + entry.debit - entry.credit, 0);
}

function filterByDate(items: LedgerEntry[], from?: Date, to?: Date) {
  return items.filter((item) => {
    const time = new Date(item.date).getTime();
    return (!from || time >= from.getTime()) && (!to || time <= to.getTime());
  });
}
