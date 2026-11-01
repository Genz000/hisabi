import { useMemo } from "react";
import { createDemoBackend } from "@/data/demoBackend";
import { HisabiProvider } from "@/data/HisabiStore";
import { AppShell } from "@/components/AppShell";
import { LoadScreen } from "@/components/LoadScreen";

/** Dev-only: the signed-in app with sample data held in memory. */
export default function Demo() {
  const backend = useMemo(createDemoBackend, []);
  return (
    <HisabiProvider backend={backend} fallback={({ error, retry }) => <LoadScreen error={error} onRetry={retry} />}>
      <AppShell />
    </HisabiProvider>
  );
}
