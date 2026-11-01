import { formatNumber } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

/** A figure with its currency set smaller and lighter, e.g. 7,100 MAD. */
export const Money = ({
  value,
  currency,
  sign,
  className,
}: {
  value: number;
  currency: string;
  sign?: "+" | "−";
  className?: string;
}) => (
  <span className={cn("whitespace-nowrap tabular", className)}>
    {sign}
    {formatNumber(value)}
    <span className="money-unit">{currency}</span>
  </span>
);
