import { cn } from "@/lib/utils";
import { catStyle } from "@/lib/colors";
import {
  Baby,
  Book,
  Briefcase,
  Car,
  Coffee,
  Dumbbell,
  Ellipsis,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Laptop,
  type LucideIcon,
  PawPrint,
  PiggyBank,
  Plane,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  User,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from "lucide-react";

// Icons a category can use; the key is what's stored in categories.icon.
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  coffee: Coffee,
  car: Car,
  fuel: Fuel,
  house: House,
  zap: Zap,
  wifi: Wifi,
  smartphone: Smartphone,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  shirt: Shirt,
  "shopping-bag": ShoppingBag,
  gift: Gift,
  plane: Plane,
  book: Book,
  "graduation-cap": GraduationCap,
  baby: Baby,
  "paw-print": PawPrint,
  user: User,
  wallet: Wallet,
  "piggy-bank": PiggyBank,
  briefcase: Briefcase,
  laptop: Laptop,
  sparkles: Sparkles,
  tag: Tag,
  ellipsis: Ellipsis,
};

export const CategoryIcon = ({ icon, className }: { icon: string | null; className?: string }) => {
  const Icon = (icon && CATEGORY_ICONS[icon]) || Tag;
  return <Icon className={className} aria-hidden />;
};

/** The category's icon in a soft bubble of its colour. */
export const CategoryBadge = ({
  id,
  icon,
  size = "md",
  className,
}: {
  id: string | undefined;
  icon: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) => (
  <span
    style={catStyle(id ?? "")}
    className={cn(
      "grid shrink-0 place-items-center rounded-full",
      id ? "cat-soft cat-text" : "bg-muted text-muted-foreground",
      size === "sm" && "h-8 w-8",
      size === "md" && "h-10 w-10",
      size === "lg" && "h-12 w-12",
      className,
    )}
  >
    <CategoryIcon icon={icon} className={size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
  </span>
);
