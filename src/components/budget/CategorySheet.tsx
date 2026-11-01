import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/CategoryIcon";
import { useHisabi } from "@/data/HisabiStore";
import type { Category, Kind } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

/** Add or edit a category: name, icon, monthly limit, archive. `category` null means a new one. */
export const CategorySheet = ({
  open,
  onOpenChange,
  category,
  kind,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  kind: Kind;
}) => {
  const { data, saveCategory, renameCategory } = useHisabi();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("tag");
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? "");
    setIcon(category?.icon ?? "tag");
    setLimit(category?.monthlyLimit != null ? String(category.monthlyLimit) : "");
  }, [open, category]);

  const k = category?.kind ?? kind;
  const trimmed = name.trim();
  const duplicate = data.categories.some(
    (c) => c.kind === k && c.id !== category?.id && c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const limitValue = limit.trim() === "" ? null : Number(limit);
  const limitInvalid = limitValue !== null && !(limitValue >= 0);

  const submit = async () => {
    if (!trimmed || duplicate || limitInvalid) return;
    setBusy(true);
    try {
      if (category && category.name !== trimmed) await renameCategory(category, trimmed);
      const maxOrder = Math.max(0, ...data.categories.filter((c) => c.kind === k).map((c) => c.sortOrder));
      await saveCategory({
        id: category?.id ?? crypto.randomUUID(),
        name: trimmed,
        icon,
        kind: k,
        monthlyLimit: k === "expense" ? limitValue : null,
        sortOrder: category?.sortOrder ?? maxOrder + 1,
        archived: category?.archived ?? false,
      });
      toast.success(category ? "Category saved" : "Category added");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save the category. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const toggleArchive = async () => {
    if (!category) return;
    setBusy(true);
    try {
      await saveCategory({ ...category, archived: !category.archived });
      toast.success(category.archived ? "Category restored" : "Category archived. Past expenses keep it.");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't update the category. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[92dvh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>{category ? "Edit category" : k === "expense" ? "New spending category" : "New income category"}</DrawerTitle>
        </DrawerHeader>
        <div className="space-y-5 overflow-y-auto px-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee" />
            {duplicate && <p className="text-sm text-destructive">You already have a category with this name.</p>}
          </div>

          {k === "expense" && (
            <div className="space-y-2">
              <Label htmlFor="cat-limit">Monthly limit ({data.profile.currency})</Label>
              <Input
                id="cat-limit"
                inputMode="decimal"
                value={limit}
                onChange={(e) => setLimit(e.target.value.replace(",", "."))}
                placeholder="No limit"
              />
              {limitInvalid && <p className="text-sm text-destructive">Enter a number, or leave it empty for no limit.</p>}
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Icon</legend>
            <div className="grid grid-cols-7 gap-1.5">
              {Object.keys(CATEGORY_ICONS).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-label={key}
                  aria-pressed={icon === key}
                  className={cn(
                    "grid aspect-square place-items-center rounded-xl border transition-colors",
                    icon === key ? "border-primary bg-secondary text-primary" : "border-transparent text-muted-foreground",
                  )}
                >
                  <CategoryIcon icon={key} className="h-5 w-5" />
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <DrawerFooter className="pb-safe">
          <Button onClick={submit} disabled={busy || !trimmed || duplicate || limitInvalid}>
            {category ? "Save category" : "Add category"}
          </Button>
          {category && (
            <Button variant="ghost" onClick={toggleArchive} disabled={busy} className={category.archived ? "" : "text-destructive"}>
              {category.archived ? "Restore category" : "Archive category"}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
