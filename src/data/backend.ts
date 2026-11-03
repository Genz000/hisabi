import { supabase } from "@/integrations/supabase/client";
import type { Category, Debt, DebtPayment, Item, ItemLog, Kind, Profile, Transaction } from "@/lib/hisabi";

export interface Snapshot {
  userId: string;
  email: string | null;
  profile: Profile;
  categories: Category[];
  transactions: Transaction[];
  checkIns: string[];
  items: Item[];
  itemLogs: ItemLog[];
  debts: Debt[];
  debtPayments: DebtPayment[];
}

/** Everything the app reads and writes. The Supabase one is real; the demo one lives in memory. */
export interface Backend {
  load(): Promise<Snapshot>;
  insertTransaction(t: Transaction): Promise<void>;
  updateTransaction(id: string, patch: Partial<Omit<Transaction, "id">>): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  insertCheckIn(date: string): Promise<void>;
  saveCategory(c: Category): Promise<void>;
  renameCategory(id: string, name: string): Promise<void>;
  saveItem(i: Item): Promise<void>;
  deleteItem(id: string): Promise<void>;
  insertItemLog(l: ItemLog): Promise<void>;
  deleteItemLog(id: string): Promise<void>;
  saveDebt(d: Debt): Promise<void>;
  deleteDebt(id: string): Promise<void>;
  insertDebtPayment(p: DebtPayment): Promise<void>;
  deleteDebtPayment(id: string): Promise<void>;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  uploadAvatar(blob: Blob): Promise<string>;
  signOut(): Promise<void>;
}

const toTransaction = (row: {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  category: string;
  type: string;
  created_at: string;
}): Transaction => ({
  id: row.id,
  date: row.date,
  amount: Number(row.amount),
  description: row.description ?? "",
  category: row.category,
  type: row.type as Kind,
  createdAt: row.created_at,
});

const toCategory = (row: {
  id: string;
  name: string;
  icon: string | null;
  kind: string;
  monthly_limit: number | null;
  sort_order: number;
  archived: boolean;
}): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  kind: row.kind as Kind,
  monthlyLimit: row.monthly_limit === null ? null : Number(row.monthly_limit),
  sortOrder: row.sort_order,
  archived: row.archived,
});

const toItem = (row: {
  id: string;
  name: string;
  category_id: string | null;
  monthly_target: number;
  price: number | null;
  sort_order: number;
}): Item => ({
  id: row.id,
  name: row.name,
  categoryId: row.category_id,
  monthlyTarget: row.monthly_target,
  price: row.price === null ? null : Number(row.price),
  sortOrder: row.sort_order,
});

const check = <T extends { error: { message: string; code?: string } | null }>(res: T) => {
  if (res.error) throw res.error;
  return res;
};

export const createSupabaseBackend = (userId: string, email: string | null): Backend => ({
  async load() {
    const [profile, categories, transactions, checkIns, items, itemLogs, debts, debtPayments] = await Promise.all([
      supabase.from("profiles").select("currency, starting_balance, avatar_url").eq("user_id", userId).maybeSingle(),
      supabase.from("categories").select("*").order("sort_order"),
      supabase.from("transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("check_ins").select("date"),
      supabase.from("items").select("*").order("sort_order"),
      supabase.from("item_logs").select("*").order("date", { ascending: false }),
      supabase.from("debts").select("*").order("date", { ascending: false }),
      supabase.from("debt_payments").select("*").order("date", { ascending: false }),
    ]);
    check(profile);
    check(categories);
    check(transactions);
    check(checkIns);
    check(items);
    check(itemLogs);
    check(debts);
    check(debtPayments);
    return {
      userId,
      email,
      profile: {
        currency: profile.data?.currency ?? "MAD",
        startingBalance: Number(profile.data?.starting_balance ?? 0),
        avatarUrl: profile.data?.avatar_url ?? null,
      },
      categories: (categories.data ?? []).map(toCategory),
      transactions: (transactions.data ?? []).map(toTransaction),
      checkIns: (checkIns.data ?? []).map((c) => c.date),
      items: (items.data ?? []).map(toItem),
      itemLogs: (itemLogs.data ?? []).map((l) => ({
        id: l.id,
        itemId: l.item_id,
        date: l.date,
        transactionId: l.transaction_id,
        createdAt: l.created_at,
      })),
      debts: (debts.data ?? []).map((d) => ({
        id: d.id,
        person: d.person,
        direction: d.direction as Debt["direction"],
        amount: Number(d.amount),
        note: d.note ?? "",
        date: d.date,
        dueDate: d.due_date,
        affectsBalance: d.affects_balance,
      })),
      debtPayments: (debtPayments.data ?? []).map((p) => ({
        id: p.id,
        debtId: p.debt_id,
        amount: Number(p.amount),
        date: p.date,
      })),
    };
  },

  async insertTransaction(t) {
    const res = await supabase.from("transactions").insert({
      id: t.id,
      user_id: userId,
      date: t.date,
      amount: t.amount,
      description: t.description || null,
      category: t.category,
      type: t.type,
    });
    // A retry after a lost response finds the row already there.
    if (res.error && res.error.code !== "23505") throw res.error;
  },

  async updateTransaction(id, patch) {
    check(
      await supabase
        .from("transactions")
        .update({
          ...(patch.date !== undefined && { date: patch.date }),
          ...(patch.amount !== undefined && { amount: patch.amount }),
          ...(patch.description !== undefined && { description: patch.description || null }),
          ...(patch.category !== undefined && { category: patch.category }),
          ...(patch.type !== undefined && { type: patch.type }),
        })
        .eq("id", id),
    );
  },

  async deleteTransaction(id) {
    check(await supabase.from("transactions").delete().eq("id", id));
  },

  async insertCheckIn(date) {
    const res = await supabase.from("check_ins").insert({ user_id: userId, date });
    if (res.error && res.error.code !== "23505") throw res.error;
  },

  async saveCategory(c) {
    check(
      await supabase.from("categories").upsert({
        id: c.id,
        user_id: userId,
        name: c.name,
        icon: c.icon,
        kind: c.kind,
        monthly_limit: c.monthlyLimit,
        sort_order: c.sortOrder,
        archived: c.archived,
      }),
    );
  },

  async renameCategory(id, name) {
    check(await supabase.rpc("rename_category", { _category_id: id, _new_name: name }));
  },

  async saveItem(i) {
    check(
      await supabase.from("items").upsert({
        id: i.id,
        user_id: userId,
        name: i.name,
        category_id: i.categoryId,
        monthly_target: i.monthlyTarget,
        price: i.price,
        sort_order: i.sortOrder,
      }),
    );
  },

  async deleteItem(id) {
    check(await supabase.from("items").delete().eq("id", id));
  },

  async insertItemLog(l) {
    const res = await supabase.from("item_logs").insert({
      id: l.id,
      user_id: userId,
      item_id: l.itemId,
      date: l.date,
      transaction_id: l.transactionId,
    });
    if (res.error && res.error.code !== "23505") throw res.error;
  },

  async deleteItemLog(id) {
    check(await supabase.from("item_logs").delete().eq("id", id));
  },

  async saveDebt(d) {
    check(
      await supabase.from("debts").upsert({
        id: d.id,
        user_id: userId,
        person: d.person,
        direction: d.direction,
        amount: d.amount,
        note: d.note || null,
        date: d.date,
        due_date: d.dueDate,
        affects_balance: d.affectsBalance,
      }),
    );
  },

  async deleteDebt(id) {
    check(await supabase.from("debts").delete().eq("id", id));
  },

  async insertDebtPayment(p) {
    const res = await supabase
      .from("debt_payments")
      .insert({ id: p.id, user_id: userId, debt_id: p.debtId, amount: p.amount, date: p.date });
    if (res.error && res.error.code !== "23505") throw res.error;
  },

  async deleteDebtPayment(id) {
    check(await supabase.from("debt_payments").delete().eq("id", id));
  },

  async updateProfile(patch) {
    check(
      await supabase.from("profiles").upsert(
        {
          user_id: userId,
          ...(patch.currency !== undefined && { currency: patch.currency }),
          ...(patch.startingBalance !== undefined && { starting_balance: patch.startingBalance }),
          ...(patch.avatarUrl !== undefined && { avatar_url: patch.avatarUrl }),
        },
        { onConflict: "user_id" },
      ),
    );
  },

  async uploadAvatar(blob) {
    const timestamp = Date.now();
    const path = `${userId}/avatar-${timestamp}.jpg`;
    check(await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" }));
    const url = `${supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl}?t=${timestamp}`;
    await this.updateProfile({ avatarUrl: url });
    return url;
  },

  async signOut() {
    await supabase.auth.signOut();
  },
});
