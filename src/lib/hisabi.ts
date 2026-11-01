import { format, getDaysInMonth, subDays } from "date-fns";

export type Kind = "expense" | "income";

export interface Transaction {
  id: string;
  date: string; // yyyy-MM-dd, local
  amount: number;
  description: string;
  category: string;
  type: Kind;
  createdAt?: string;
  pending?: boolean; // saved locally, not yet on the server
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  kind: Kind;
  monthlyLimit: number | null;
  sortOrder: number;
  archived: boolean;
}

export interface Profile {
  currency: string;
  startingBalance: number;
  avatarUrl: string | null;
}

export const CURRENCIES = ["MAD", "EUR", "USD", "GBP"] as const;

export const toISODate = (d: Date) => format(d, "yyyy-MM-dd");
export const todayISO = () => toISODate(new Date());
export const monthOf = (isoDate: string) => isoDate.slice(0, 7);

const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

export const formatMoney = (amount: number, currency: string) =>
  `${numberFormat.format(Math.round(amount * 100) / 100)} ${currency}`;

export const formatNumber = (amount: number) => numberFormat.format(Math.round(amount * 100) / 100);

/** Money spent (or earned) per category name in the month of `today`. */
export const totalsThisMonth = (transactions: Transaction[], kind: Kind, today = todayISO()) => {
  const month = monthOf(today);
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== kind || monthOf(t.date) !== month) continue;
    totals.set(t.category, (totals.get(t.category) ?? 0) + t.amount);
  }
  return totals;
};

/** Active categories of a kind, most used in the last 60 days first, then by sort order. */
export const sortByUsage = (categories: Category[], transactions: Transaction[], kind: Kind) => {
  const since = toISODate(subDays(new Date(), 60));
  const uses = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === kind && t.date >= since) uses.set(t.category, (uses.get(t.category) ?? 0) + 1);
  }
  return categories
    .filter((c) => c.kind === kind && !c.archived)
    .sort((a, b) => (uses.get(b.name) ?? 0) - (uses.get(a.name) ?? 0) || a.sortOrder - b.sortOrder);
};

/** How far through the month we are, 0..1, counting today as half spent. */
export const monthProgress = (date = new Date()) => (date.getDate() - 0.5) / getDaysInMonth(date);

export const daysLeftInMonth = (date = new Date()) => getDaysInMonth(date) - date.getDate() + 1;

export type LimitState = "none" | "ok" | "near" | "over";

export const limitState = (spent: number, limit: number | null): LimitState => {
  if (!limit) return "none";
  if (spent > limit) return "over";
  if (spent >= limit * 0.8) return "near";
  return "ok";
};

/** Days in a row, ending today (or yesterday if today isn't done yet), with a log or a check-in. */
export const currentStreak = (transactions: Transaction[], checkIns: string[], today = new Date()) => {
  const active = new Set<string>(checkIns);
  for (const t of transactions) active.add(t.createdAt ? toISODate(new Date(t.createdAt)) : t.date);

  let day = today;
  if (!active.has(toISODate(day))) day = subDays(day, 1);
  let streak = 0;
  while (active.has(toISODate(day))) {
    streak += 1;
    day = subDays(day, 1);
  }
  return streak;
};

export const isActiveToday = (transactions: Transaction[], checkIns: string[]) => {
  const today = todayISO();
  return (
    checkIns.includes(today) ||
    transactions.some((t) => (t.createdAt ? toISODate(new Date(t.createdAt)) : t.date) === today)
  );
};

export const balanceOf = (transactions: Transaction[], startingBalance: number) =>
  transactions.reduce((sum, t) => sum + (t.type === "income" ? t.amount : -t.amount), startingBalance);

export type Pace = "none" | "good" | "fast" | "over";

/** This month across categories that have a limit: what's left, and whether spending is ahead of the calendar. */
export const monthStatus = (categories: Category[], transactions: Transaction[], date = new Date()) => {
  const spentBy = totalsThisMonth(transactions, "expense", toISODate(date));
  const limited = categories.filter((c) => c.kind === "expense" && !c.archived && c.monthlyLimit !== null);
  const limit = limited.reduce((s, c) => s + (c.monthlyLimit ?? 0), 0);
  const spent = limited.reduce((s, c) => s + (spentBy.get(c.name) ?? 0), 0);
  const left = limit - spent;
  const daysLeft = daysLeftInMonth(date);
  const pace: Pace = limit === 0 ? "none" : spent > limit ? "over" : spent > limit * monthProgress(date) * 1.1 ? "fast" : "good";
  return { limit, spent, left, perDay: Math.floor(Math.max(left, 0) / daysLeft), daysLeft, pace };
};

/** The 7 days ending today, compared with the 7 before. */
export const weekStats = (transactions: Transaction[], checkIns: string[], date = new Date()) => {
  const start = toISODate(subDays(date, 6));
  const prevStart = toISODate(subDays(date, 13));
  const end = toISODate(date);
  let spent = 0;
  let prevSpent = 0;
  const byCategory = new Map<string, number>();
  const activeDays = new Set(checkIns.filter((d) => d >= start && d <= end));
  for (const t of transactions) {
    const logged = t.createdAt ? toISODate(new Date(t.createdAt)) : t.date;
    if (logged >= start && logged <= end) activeDays.add(logged);
    if (t.type !== "expense") continue;
    if (t.date >= start && t.date <= end) {
      spent += t.amount;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    } else if (t.date >= prevStart && t.date < start) {
      prevSpent += t.amount;
    }
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  return {
    spent,
    prevSpent,
    change: prevSpent > 0 ? (spent - prevSpent) / prevSpent : null,
    activeDays: activeDays.size,
    top: top ? { name: top[0], amount: top[1] } : null,
  };
};
