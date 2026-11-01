import { subDays } from "date-fns";
import type { Backend, Snapshot } from "./backend";
import { toISODate, type Category, type Kind, type Transaction } from "@/lib/hisabi";

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

  return {
    userId: "demo",
    email: "demo@hisabi.local",
    profile: { currency: "MAD", startingBalance: 99080, avatarUrl: null },
    categories,
    transactions,
    checkIns: [toISODate(subDays(today, 8)), toISODate(subDays(today, 10)), toISODate(subDays(today, 11))],
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
