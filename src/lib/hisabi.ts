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

/** Something to buy at most `monthlyTarget` times a month. */
export interface Item {
  id: string;
  name: string;
  categoryId: string | null;
  monthlyTarget: number;
  price: number | null;
  sortOrder: number;
}

export interface ItemLog {
  id: string;
  itemId: string;
  date: string; // yyyy-MM-dd
  transactionId: string | null;
  createdAt?: string;
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

/** How many times each item was ticked in the month of `today`. */
export const itemCountsThisMonth = (logs: ItemLog[], today = todayISO()) => {
  const month = monthOf(today);
  const counts = new Map<string, number>();
  for (const l of logs) if (monthOf(l.date) === month) counts.set(l.itemId, (counts.get(l.itemId) ?? 0) + 1);
  return counts;
};

export type ItemState = "ok" | "ahead" | "done" | "over";

/** "ahead" means used faster than the month is going (3 of 4 by the 10th). */
export const itemState = (used: number, target: number, date = new Date()): ItemState => {
  if (used > target) return "over";
  if (used === target) return "done";
  if (used > Math.ceil(target * monthProgress(date))) return "ahead";
  return "ok";
};

export type Insight = { tone: "good" | "warn" | "info"; text: string };

/**
 * The last 7 days: a verdict against the weekly share of the monthly limits,
 * plus a few short notes worth keeping in mind.
 */
export const weekInsights = (
  input: { categories: Category[]; transactions: Transaction[]; checkIns: string[]; items: Item[]; itemLogs: ItemLog[] },
  currency: string,
  date = new Date(),
) => {
  const { categories, transactions, checkIns, items, itemLogs } = input;
  const week = weekStats(transactions, checkIns, date);
  const start = toISODate(subDays(date, 6));
  const prevStart = toISODate(subDays(date, 13));
  const end = toISODate(date);

  const limited = categories.filter((c) => c.kind === "expense" && !c.archived && c.monthlyLimit !== null);
  const limitedNames = new Set(limited.map((c) => c.name));
  const weekBudget = (limited.reduce((s, c) => s + (c.monthlyLimit ?? 0), 0) * 7) / getDaysInMonth(date);

  const now = new Map<string, number>();
  const before = new Map<string, number>();
  const spendDays = new Set<string>();
  let limitedSpent = 0;
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (t.date >= start && t.date <= end) {
      now.set(t.category, (now.get(t.category) ?? 0) + t.amount);
      spendDays.add(t.date);
      if (limitedNames.has(t.category)) limitedSpent += t.amount;
    } else if (t.date >= prevStart && t.date < start) {
      before.set(t.category, (before.get(t.category) ?? 0) + t.amount);
    }
  }

  const pace: Pace =
    weekBudget === 0 ? "none" : limitedSpent > weekBudget * 1.25 ? "over" : limitedSpent > weekBudget ? "fast" : "good";

  const notes: Insight[] = [];
  if (pace !== "none") {
    const diff = Math.round(Math.abs(weekBudget - limitedSpent));
    notes.push(
      pace === "good"
        ? { tone: "good", text: `${formatMoney(diff, currency)} under your weekly share of the limits.` }
        : { tone: "warn", text: `${formatMoney(diff, currency)} over your weekly share of the limits.` },
    );
  }

  // The category that grew the most compared with the week before
  let jump: { name: string; from: number; to: number } | null = null;
  for (const [name, to] of now) {
    const from = before.get(name) ?? 0;
    if (from > 0 && to > from * 1.25 && to - from >= 50 && (!jump || to - from > jump.to - jump.from)) jump = { name, from, to };
  }
  if (jump) {
    notes.push({
      tone: "warn",
      text: `${jump.name} went up ${Math.round(((jump.to - jump.from) / jump.from) * 100)}% from last week.`,
    });
  }

  // The limit most likely to run out before the month ends, at the current pace
  const monthSpent = totalsThisMonth(transactions, "expense", end);
  const progress = monthProgress(date);
  const risky = limited
    .map((c) => ({ c, projected: (monthSpent.get(c.name) ?? 0) / progress }))
    .filter(({ c, projected }) => projected > (c.monthlyLimit ?? 0) * 1.05 && (monthSpent.get(c.name) ?? 0) <= (c.monthlyLimit ?? 0))
    .sort((a, b) => b.projected / (b.c.monthlyLimit || 1) - a.projected / (a.c.monthlyLimit || 1))[0];
  if (risky && progress < 0.9) {
    notes.push({ tone: "warn", text: `At this pace ${risky.c.name} runs out before the month ends.` });
  }

  // Items used faster than the month
  const counts = itemCountsThisMonth(itemLogs, end);
  const ahead = items.filter((i) => ["ahead", "over"].includes(itemState(counts.get(i.id) ?? 0, i.monthlyTarget, date)));
  if (ahead.length === 1) {
    const i = ahead[0];
    notes.push({ tone: "warn", text: `${i.name}: ${counts.get(i.id) ?? 0} of ${i.monthlyTarget} used already.` });
  } else if (ahead.length > 1) {
    notes.push({ tone: "warn", text: `${ahead.length} items are going faster than the month.` });
  } else if (items.length > 0) {
    notes.push({ tone: "good", text: "Your monthly items are on track." });
  }

  const noSpend = 7 - spendDays.size;
  if (noSpend >= 2) notes.push({ tone: "good", text: `${noSpend} days without spending.` });
  if (week.activeDays < 5) {
    notes.push({ tone: "info", text: `You logged ${week.activeDays} of 7 days. Tap “Nothing today” on quiet days.` });
  }

  return { ...week, pace, weekBudget, limitedSpent, notes: notes.slice(0, 4) };
};
