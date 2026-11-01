import { Delete } from "lucide-react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "back"] as const;

export type PadKey = (typeof KEYS)[number];

/** Applies a key press to an amount string, keeping at most 7 whole digits and 2 decimals. */
export const applyKey = (amount: string, key: PadKey) => {
  if (key === "back") return amount.slice(0, -1);
  if (key === ".") return amount.includes(".") ? amount : (amount || "0") + ".";
  const [whole, decimals] = amount.split(".");
  if (decimals !== undefined) return decimals.length >= 2 ? amount : amount + key;
  if (whole === "0") return key;
  return whole.length >= 7 ? amount : amount + key;
};

export const NumberPad = ({ onKey }: { onKey: (key: PadKey) => void }) => (
  <div className="grid grid-cols-3 gap-1.5">
    {KEYS.map((key) => (
      <button
        key={key}
        type="button"
        onClick={() => onKey(key)}
        className="h-[52px] rounded-xl font-display text-2xl font-medium text-foreground tabular transition-colors active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring select-none"
        aria-label={key === "back" ? "Delete last digit" : key === "." ? "Decimal point" : key}
      >
        {key === "back" ? <Delete className="mx-auto h-6 w-6" strokeWidth={1.75} /> : key}
      </button>
    ))}
  </div>
);
