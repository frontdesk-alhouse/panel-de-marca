import { cn } from "@/lib/utils";

export const control = "w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

interface FieldProps { label: string; name: string; id?: string; error?: string; hint?: string; className?: string; children: React.ReactNode }

/** Etiqueta + control + error, con el error ligado por aria-describedby. */
export function Field({ label, name, id, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id ?? name} className="block font-mono text-[11px] uppercase text-muted-foreground">{label}</label>
      {children}
      {error ? <p id={`${name}-error`} className="text-xs text-bad">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Options({ labels, empty }: { labels: Record<string, string>; empty?: string }) {
  return (
    <>
      {empty !== undefined && <option value="">{empty}</option>}
      {Object.entries(labels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </>
  );
}

export function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={pending}
      className="h-9 rounded-md bg-primary px-4 font-mono text-[11px] uppercase text-primary-foreground transition hover:opacity-85 active:translate-y-px disabled:opacity-60">
      {pending ? "Guardando…" : children}
    </button>
  );
}
