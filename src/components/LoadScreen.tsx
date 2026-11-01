import { Button } from "@/components/ui/button";

export const LoadScreen = ({ error, onRetry }: { error?: Error | null; onRetry?: () => void }) => (
  <div className="flex h-[100dvh] flex-col items-center justify-center gap-4 bg-background px-8 text-center">
    <p className="type-screen">Hisabi</p>
    {error ? (
      <>
        <p className="text-muted-foreground">Couldn't load your data. Check your connection, then try again.</p>
        {onRetry && <Button onClick={onRetry}>Try again</Button>}
      </>
    ) : (
      <p className="text-muted-foreground" role="status">
        Loading…
      </p>
    )}
  </div>
);
