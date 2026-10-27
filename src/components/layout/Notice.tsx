import { Info } from "lucide-react";

export function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div role="note" className="flex gap-3 items-start rounded-xl bg-card px-4 py-3 text-sm">
      <Info className="h-4 w-4 mt-0.5 shrink-0 text-foreground" aria-hidden strokeWidth={1.75} />
      <div className="space-y-1 min-w-0 break-words">{children}</div>
    </div>
  );
}
