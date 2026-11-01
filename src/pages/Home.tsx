import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { createSupabaseBackend } from "@/data/backend";
import { HisabiProvider } from "@/data/HisabiStore";
import { AppShell } from "@/components/AppShell";
import { LoadScreen } from "@/components/LoadScreen";

export default function Home() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) navigate("/auth", { replace: true });
  }, [session, navigate]);

  const userId = session?.user.id;
  const email = session?.user.email ?? null;
  const backend = useMemo(() => (userId ? createSupabaseBackend(userId, email) : null), [userId, email]);

  if (!backend) return <LoadScreen />;

  return (
    <HisabiProvider
      backend={backend}
      onSignedOut={() => navigate("/auth", { replace: true })}
      fallback={({ error, retry }) => <LoadScreen error={error} onRetry={retry} />}
    >
      <AppShell />
    </HisabiProvider>
  );
}
