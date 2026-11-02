// "Keep me signed in" switches where Supabase keeps the session: localStorage
// survives closing the app; sessionStorage ends when the app or tab is closed.
const REMEMBER_KEY = "hisabi.remember";

const forgets = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) === "0";
  } catch {
    return false;
  }
};

/** Call before signing in. */
export const setKeepSignedIn = (keep: boolean) => {
  try {
    if (keep) localStorage.removeItem(REMEMBER_KEY);
    else localStorage.setItem(REMEMBER_KEY, "0");
  } catch {
    // Storage unavailable: the session stays in memory only.
  }
};

export const keepsSignedIn = () => !forgets();

export const authStorage = {
  getItem: (key: string) => (forgets() ? sessionStorage : localStorage).getItem(key),
  setItem: (key: string, value: string) => {
    const [store, other] = forgets() ? [sessionStorage, localStorage] : [localStorage, sessionStorage];
    store.setItem(key, value);
    other.removeItem(key);
  },
  removeItem: (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};
