import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExpenseLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSave?: () => void;
}

const CATEGORIES = [
  "Food",
  "Sport",
  "Health/medical",
  "Home",
  "Transportation",
  "Hajar",
  "Gifts",
  "Utilities",
  "Travel",
  "Others",
  "Nader",
];

export function ExpenseLimitModal({ open, onOpenChange, userId, onSave }: ExpenseLimitModalProps) {
  const [limits, setLimits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchLimits();
    }
  }, [open, userId]);

  const fetchLimits = async () => {
    try {
      const { data, error } = await supabase
        .from("expense_limits")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      const limitsMap: Record<string, string> = {};
      data?.forEach((limit) => {
        limitsMap[limit.category] = limit.limit_amount.toString();
      });
      setLimits(limitsMap);
    } catch (error: any) {
      console.error("Failed to fetch limits:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const updates = Object.entries(limits)
        .filter(([_, amount]) => amount && parseFloat(amount) > 0)
        .map(([category, amount]) => ({
          user_id: userId,
          category,
          limit_amount: parseFloat(amount)
        }));

      if (updates.length === 0) {
        toast.info("No limits to save");
        onOpenChange(false);
        return;
      }

      const { error } = await supabase
        .from("expense_limits")
        .upsert(updates, { onConflict: "user_id,category" });

      if (error) throw error;

      toast.success("Expense limits saved!");
      onSave?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Failed to save limits");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Expense Limits by Category</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {CATEGORIES.map((category) => (
            <div key={category} className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor={category}>{category}</Label>
              <Input
                id={category}
                type="number"
                placeholder="Enter limit"
                value={limits[category] || ""}
                onChange={(e) =>
                  setLimits({ ...limits, [category]: e.target.value })
                }
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Limits"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}