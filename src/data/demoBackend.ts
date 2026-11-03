import { subDays } from "date-fns";
import type { Backend, Snapshot } from "./backend";
import { toISODate, type Category, type Debt, type Item, type ItemLog, type Kind, type Transaction } from "@/lib/hisabi";

// In-memory data for the dev-only /demo route, so the signed-in screens can be
// reviewed without an account. Nothing here touches Supabase.

const DEFAULTS: [string, string, Kind, number | null][] = [
  ["Food", "utensils", "expense", 2500],
  ["Sport", "dumbbell", "expense", 400],
  ["Health/medical", "heart-pulse", "expense", null],
  ["Home", "house", "expense", 1500],
  ["Transportation", "car", "expense", 800],
  ["Hajar", "user", "expense", null],
  ["Gifts", "gift", "expense", 300],
  ["Utilities", "zap", "expense", 600],
  ["Travel", "plane", "expense", null],
  ["Others", "ellipsis", "expense", null],
  ["Nader", "user", "expense", 1000],
  ["Savings", "piggy-bank", "income", null],
  ["Paycheck", "wallet", "income", null],
  ["Bonus", "sparkles", "income", null],
  ["Freelancing", "laptop", "income", null],
  ["Other", "ellipsis", "income", null],
];

const seed = (): Snapshot => {
  const categories: Category[] = DEFAULTS.map(([name, icon, kind, limit], i) => ({
    id: crypto.randomUUID(),
    name,
    icon,
    kind,
    monthlyLimit: limit,
    sortOrder: i + 1,
    archived: false,
  }));

  const today = new Date();
  const tx = (daysAgo: number, category: string, amount: number, description = "", type: Kind = "expense"): Transaction => {
    const d = subDays(today, daysAgo);
    return { id: crypto.randomUUID(), date: toISODate(d), amount, description, category, type, createdAt: d.toISOString() };
  };
  const transactions = [
    tx(1, "Food", 45, "Lunch"),
    tx(1, "Transportation", 30, "Petit taxi"),
    tx(2, "Food", 120, "Groceries"),
    tx(3, "Home", 1240, "Rent share"),
    tx(4, "Food", 38),
    tx(5, "Sport", 350, "Gym"),
    tx(6, "Gifts", 280, "Birthday"),
    tx(7, "Food", 210, "Dinner out"),
    tx(9, "Utilities", 310, "Electricity"),
    tx(12, "Paycheck", 9000, "", "income"),
  ];

  const byName = (name: string) => categories.find((c) => c.name === name)?.id ?? null;
  const items: Item[] = [
    { id: crypto.randomUUID(), name: "Kinder Bueno", categoryId: byName("Food"), monthlyTarget: 4, price: 12, sortOrder: 1 },
    { id: crypto.randomUUID(), name: "Coffee out", categoryId: byName("Food"), monthlyTarget: 8, price: 18, sortOrder: 2 },
    { id: crypto.randomUUID(), name: "Cinema", categoryId: byName("Nader"), monthlyTarget: 2, price: null, sortOrder: 3 },
  ];
  const log = (item: Item, daysAgo: number): ItemLog => ({
    id: crypto.randomUUID(),
    itemId: item.id,
    date: toISODate(subDays(today, daysAgo)),
    transactionId: null,
  });
  const itemLogs = [log(items[0], 0), log(items[0], 1), log(items[0], 3), log(items[1], 2), log(items[2], 5)];

  const day = (n: number) => toISODate(subDays(today, n));
  const debts: Debt[] = [
    { id: crypto.randomUUID(), person: "Youssef", direction: "borrowed", amount: 2000, note: "Laptop repair", date: day(20), dueDate: day(-25), affectsBalance: true },
    { id: crypto.randomUUID(), person: "Hajar", direction: "lent", amount: 500, note: "", date: day(6), dueDate: null, affectsBalance: true },
  ];
  const debtPayments = [{ id: crypto.randomUUID(), debtId: debts[0].id, amount: 800, date: day(4) }];

  return {
    userId: "demo",
    email: "demo@hisabi.local",
    profile: { currency: "MAD", startingBalance: 99080, avatarUrl: null },
    categories,
    transactions,
    checkIns: [toISODate(subDays(today, 8)), toISODate(subDays(today, 10)), toISODate(subDays(today, 11))],
    items,
    itemLogs,
    debts,
    debtPayments,
  };
};

const wait = () => new Promise((r) => setTimeout(r, 250));

export const createDemoBackend = (): Backend => {
  const data = seed();
  return {
    async load() {
      await wait();
      return structuredClone(data);
    },
    async insertTransaction(t) {
      await wait();
      if (localStorage.getItem("hisabi.demo.offline") === "1") throw new Error("Offline (demo)");
      data.transactions.unshift({ ...t, createdAt: new Date().toISOString() });
    },
    async updateTransaction(id, patch) {
      await wait();
      data.transactions = data.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t));
    },
    async deleteTransaction(id) {
      await wait();
      data.transactions = data.transactions.filter((t) => t.id !== id);
    },
    async insertCheckIn(date) {
      await wait();
      if (!data.checkIns.includes(date)) data.checkIns.push(date);
    },
    async saveCategory(c) {
      await wait();
      const i = data.categories.findIndex((x) => x.id === c.id);
      if (i >= 0) data.categories[i] = c;
      else data.categories.push(c);
    },
    async renameCategory(id, name) {
      await wait();
      const c = data.categories.find((x) => x.id === id);
      if (!c) return;
      data.transactions = data.transactions.map((t) =>
        t.category === c.name && t.type === c.kind ? { ...t, category: name } : t,
      );
      c.name = name;
    },
    async saveItem(i) {
      await wait();
      const at = data.items.findIndex((x) => x.id === i.id);
      if (at >= 0) data.items[at] = i;
      else data.items.push(i);
    },
    async deleteItem(id) {
      await wait();
      data.items = data.items.filter((i) => i.id !== id);
      data.itemLogs = data.itemLogs.filter((l) => l.itemId !== id);
    },
    async insertItemLog(l) {
      await wait();
      if (localStorage.getItem("hisabi.demo.offline") === "1") throw new Error("Offline (demo)");
      data.itemLogs.unshift(l);
    },
    async deleteItemLog(id) {
      await wait();
      data.itemLogs = data.itemLogs.filter((l) => l.id !== id);
    },
    async saveDebt(d) {
      await wait();
      const at = data.debts.findIndex((x) => x.id === d.id);
      if (at >= 0) data.debts[at] = d;
      else data.debts.unshift(d);
    },
    async deleteDebt(id) {
      await wait();
      data.debts = data.debts.filter((d) => d.id !== id);
      data.debtPayments = data.debtPayments.filter((p) => p.debtId !== id);
    },
    async insertDebtPayment(p) {
      await wait();
      data.debtPayments.unshift(p);
    },
    async deleteDebtPayment(id) {
      await wait();
      data.debtPayments = data.debtPayments.filter((p) => p.id !== id);
    },
    async updateProfile(patch) {
      await wait();
      data.profile = { ...data.profile, ...patch };
    },
    async uploadAvatar(blob) {
      const url = URL.createObjectURL(blob);
      data.profile.avatarUrl = url;
      return url;
    },
    async signOut() {},
  };
};
