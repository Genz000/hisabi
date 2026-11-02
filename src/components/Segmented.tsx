import { cn } from "@/lib/utils";

/** Pill switch for two or three views, styled like the History filter. */
export const Segmented = <T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
  label: string;
  className?: string;
}) => (
  <div className={cn("flex rounded-full bg-muted p-1", className)} role="tablist" aria-label={label}>
    {options.map(([key, text]) => (
      <button
        key={key}
        type="button"
        role="tab"
        aria-selected={value === key}
        onClick={() => onChange(key)}
        className={cn(
          "type-chip flex-1 whitespace-nowrap rounded-full px-3 py-2 transition-colors",
          value === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
        )}
      >
        {text}
      </button>
    ))}
  </div>
);
