import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Auth() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/", { replace: true });
    });
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/", { replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        if (data.session) navigate("/", { replace: true });
        else setSentTo(email);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col justify-center bg-background px-6 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="font-display text-[3.5rem] font-semibold leading-none tracking-[-0.01em]">Hisabi</h1>
        <p className="mt-3 max-w-[30ch] text-lg leading-snug text-muted-foreground">Log what you spend in five seconds, and always know what's left.</p>

        {sentTo ? (
          <div className="mt-10 rounded-2xl border border-border bg-card p-5">
            <p className="type-title">Check your email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              We sent a confirmation link to {sentTo}. Open it on this device, then you're in.
            </p>
            <Button
              variant="ghost"
              className="mt-3 px-0 text-primary"
              onClick={() => {
                setSentTo(null);
                setIsLogin(true);
              }}
            >
              Back to log in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleAuth} className="mt-10 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 rounded-xl bg-card"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 rounded-xl bg-card"
              />
              {!isLogin && <p className="text-sm text-muted-foreground">At least 6 characters.</p>}
            </div>
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl text-base">
              {loading ? "One moment…" : isLogin ? "Log in" : "Create account"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="w-full py-2 text-sm text-muted-foreground"
            >
              {isLogin ? (
                <>
                  New here? <span className="font-semibold text-primary">Create an account</span>
                </>
              ) : (
                <>
                  Already have an account? <span className="font-semibold text-primary">Log in</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
