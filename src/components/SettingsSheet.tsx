import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropperModal } from "@/components/AvatarCropperModal";
import { useHisabi } from "@/data/HisabiStore";
import { CURRENCIES } from "@/lib/hisabi";
import { cn } from "@/lib/utils";

export const SettingsSheet = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  const { data, updateProfile, uploadAvatar, signOut } = useHisabi();
  const { profile, email } = data;
  const [currency, setCurrency] = useState(profile.currency);
  const [starting, setStarting] = useState("");
  const [busy, setBusy] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCurrency(profile.currency);
    setStarting(String(profile.startingBalance));
  }, [open, profile]);

  const startingValue = Number(starting.replace(",", "."));
  const valid = starting.trim() !== "" && Number.isFinite(startingValue);

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await updateProfile({ currency, startingBalance: startingValue });
      toast.success("Settings saved");
      onOpenChange(false);
    } catch {
      toast.error("Couldn't save settings. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const pickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageToCrop(reader.result as string);
    reader.readAsDataURL(file);
  };

  const upload = async (blob: Blob) => {
    try {
      await uploadAvatar(blob);
      toast.success("Photo updated");
    } catch {
      toast.error("Couldn't upload the photo. Try again.");
    }
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>Settings</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-5 px-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt="" />
                <AvatarFallback className="bg-secondary font-display text-primary">
                  {(email ?? "?").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{email}</p>
                <label className="cursor-pointer text-sm font-semibold text-primary">
                  Change photo
                  <input type="file" accept="image/*" className="sr-only" onChange={pickImage} />
                </label>
              </div>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Currency</legend>
              <div className="flex gap-1.5">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    aria-pressed={currency === c}
                    className={cn(
                      "flex-1 rounded-xl border py-2 text-sm font-semibold",
                      currency === c ? "border-primary bg-secondary text-primary" : "border-border",
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="space-y-2">
              <Label htmlFor="starting">Starting balance</Label>
              <Input id="starting" inputMode="decimal" value={starting} onChange={(e) => setStarting(e.target.value)} />
              <p className="text-sm text-muted-foreground">
                What you had when you started using Hisabi. Your balance is this plus income minus spending.
              </p>
            </div>
          </div>
          <DrawerFooter className="pb-safe">
            <Button onClick={save} disabled={busy || !valid}>
              Save settings
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={() => void signOut()}>
              Log out
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {imageToCrop && (
        <AvatarCropperModal
          open
          onOpenChange={(o) => !o && setImageToCrop(null)}
          imageSrc={imageToCrop}
          onCropComplete={upload}
        />
      )}
    </>
  );
};
