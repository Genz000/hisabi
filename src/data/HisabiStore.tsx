import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Backend, Snapshot } from "./backend";
import { todayISO, type Category, type Kind, type Profile, type Transaction } from "@/lib/hisabi";

export interface NewTransaction {
  amount: number;
  category: string;
  type: Kind;
  date?: string;
  description?: string;
}

interface HisabiStore {
  data: Snapshot;
  /** Saves optimistically. Resolves with the transaction; `pending` is true if it only saved on this device. */
  addTransaction(input: NewTransaction): Promise<Transaction>;
  updateTransaction(id: string, patch: Partial<Omit<Transaction, "id">>): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
  retryPending(): Promise<number>;
  checkIn(): Promise<void>;
  saveCategory(c: Category): Promise<void>;
  renameCategory(c: Category, name: string): Promise<void>;
  updateProfile(patch: Partial<Profile>): Promise<void>;
  uploadAvatar(blob: Blob): Promise<void>;
  signOut(): Promise<void>;
}

const Ctx = createContext<HisabiStore | null>(null);

export const useHisabi = () => {
  const store = useContext(Ctx);
  if (!store) throw new Error("useHisabi must be used inside HisabiProvider");
  return store;
};

// Saves that failed (offline, server error) are kept here until they go through,
// so a logged expense is never silently lost.
const pendingKey = (userId: string) => `hisabi.pending.${userId}`;

const readPending = (userId: string): Transaction[] => {
  try {
    return JSON.parse(localStorage.getItem(pendingKey(userId)) ?? "[]");
  } catch {
    return [];
  }
};

const writePending = (userId: string, list: Transaction[]) => {
  try {
    if (list.length) localStorage.setItem(pendingKey(userId), JSON.stringify(list));
    else localStorage.removeItem(pendingKey(userId));
  } catch {
    // Storage unavailable: the transaction still shows as pending in memory.
  }
};

const byNewest = (a: Transaction, b: Transaction) =>
  b.date.localeCompare(a.date) || (b.createdAt ?? "").localeCompare(a.createdAt ?? "");

export const HisabiProvider = ({
  backend,
  onSignedOut,
  children,
  fallback,
}: {
  backend: Backend;
  onSignedOut?: () => void;
  children: ReactNode;
  fallback: (state: { error: Error | null; retry: () => void }) => ReactNode;
}) => {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const userIdRef = useRef<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    backend
      .load()
      .then((snap) => {
        userIdRef.current = snap.userId;
        const pending = readPending(snap.userId).map((t) => ({ ...t, pending: true }));
        const known = new Set(snap.transactions.map((t) => t.id));
        setData({ ...snap, transactions: [...pending.filter((t) => !known.has(t.id)), ...snap.transactions].sort(byNewest) });
      })
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
  }, [backend]);

  useEffect(load, [load]);

  const patchTransactions = (fn: (list: Transaction[]) => Transaction[]) =>
    setData((d) => (d ? { ...d, transactions: fn(d.transactions) } : d));

  const setPending = useCallback((id: string, pending: boolean, t?: Transaction) => {
    const userId = userIdRef.current;
    if (!userId) return;
    const list = readPending(userId).filter((p) => p.id !== id);
    writePending(userId, pending && t ? [...list, { ...t, pending: undefined }] : list);
    patchTransactions((ts) => ts.map((x) => (x.id === id ? { ...x, pending: pending || undefined } : x)));
  }, []);

  const retryPending = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return 0;
    let saved = 0;
    for (const t of readPending(userId)) {
      try {
        await backend.insertTransaction(t);
        setPending(t.id, false);
        saved += 1;
      } catch {
        break; // still offline; try again later
      }
    }
    return saved;
  }, [backend, setPending]);

  useEffect(() => {
    const onOnline = () => void retryPending();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [retryPending]);

  const store = useMemo<HisabiStore | null>(() => {
    if (!data) return null;
    return {
      data,

      async addTransaction(input) {
        const t: Transaction = {
          id: crypto.randomUUID(),
          date: input.date ?? todayISO(),
          amount: input.amount,
          description: input.description ?? "",
          category: input.category,
          type: input.type,
          createdAt: new Date().toISOString(),
        };
        patchTransactions((ts) => [t, ...ts].sort(byNewest));
        try {
          await backend.insertTransaction(t);
          return t;
        } catch {
          setPending(t.id, true, t);
          return { ...t, pending: true };
        }
      },

      async updateTransaction(id, patch) {
        await backend.updateTransaction(id, patch);
        patchTransactions((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)).sort(byNewest));
      },

      async deleteTransaction(id) {
        const userId = userIdRef.current;
        const wasPending = userId ? readPending(userId).some((p) => p.id === id) : false;
        patchTransactions((ts) => ts.filter((t) => t.id !== id));
        if (wasPending) {
          setPending(id, false);
          return;
        }
        await backend.deleteTransaction(id);
      },

      retryPending,

      async checkIn() {
        const today = todayISO();
        setData((d) => (d && !d.checkIns.includes(today) ? { ...d, checkIns: [...d.checkIns, today] } : d));
        await backend.insertCheckIn(today);
      },

      async saveCategory(c) {
        await backend.saveCategory(c);
        setData((d) => {
          if (!d) return d;
          const exists = d.categories.some((x) => x.id === c.id);
          return { ...d, categories: exists ? d.categories.map((x) => (x.id === c.id ? c : x)) : [...d.categories, c] };
        });
      },

      async renameCategory(c, name) {
        await backend.renameCategory(c.id, name);
        setData((d) =>
          d && {
            ...d,
            categories: d.categories.map((x) => (x.id === c.id ? { ...x, name } : x)),
            transactions: d.transactions.map((t) =>
              t.category === c.name && t.type === c.kind ? { ...t, category: name } : t,
            ),
          },
        );
      },

      async updateProfile(patch) {
        await backend.updateProfile(patch);
        setData((d) => d && { ...d, profile: { ...d.profile, ...patch } });
      },

      async uploadAvatar(blob) {
        const avatarUrl = await backend.uploadAvatar(blob);
        setData((d) => d && { ...d, profile: { ...d.profile, avatarUrl } });
      },

      async signOut() {
        await backend.signOut();
        onSignedOut?.();
      },
    };
  }, [data, backend, retryPending, setPending, onSignedOut]);

  if (!store) return <>{fallback({ error, retry: load })}</>;
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
};
