"use client";

import { useT } from "@/i18n/client";
import { useId, useState } from "react";
import { Check, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { control } from "@/components/crm/fields";

/** Piezas compartidas de la configuración inicial y de /ajustes. */

export function StepHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <header className="space-y-3">
      <p className="font-mono text-[11px] uppercase text-muted-foreground">{eyebrow}</p>
      <h1 className="font-display text-4xl leading-[1.05] md:text-5xl">{title}</h1>
      {children && <div className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{children}</div>}
    </header>
  );
}

export function Button({ variant = "primary", pending = false, className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet"; pending?: boolean }) {
  return (
    <button type="button" disabled={pending || props.disabled} {...props}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-55",
        variant === "primary" && "bg-primary text-primary-foreground hover:opacity-90",
        variant === "ghost" && "border border-border bg-background hover:bg-card",
        variant === "quiet" && "px-2 text-muted-foreground hover:text-foreground",
        className,
      )}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function TextField({ label, hint, value, onChange, multiline = false, rows = 4, placeholder, type = "text", required = false, invalid = false }: {
  label: string; hint?: React.ReactNode; value: string; onChange: (v: string) => void; multiline?: boolean; rows?: number; placeholder?: string; type?: string; required?: boolean; invalid?: boolean;
}) {
  const id = useId();
  const common = { id, value, placeholder, "aria-invalid": invalid || undefined, "aria-describedby": hint ? `${id}-hint` : undefined, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value) };
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-mono text-[11px] uppercase text-muted-foreground">{label}{required && <span aria-hidden> *</span>}</label>
      {multiline
        ? <textarea rows={rows} className={cn(control, "py-2 leading-relaxed")} {...common} />
        : <input type={type} className={cn(control, "h-10")} autoComplete="off" spellCheck={type === "text"} {...common} />}
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Lista editable de textos cortos (servicios, ciudades, búsquedas). */
export function ListField({ label, hint, values, onChange, placeholder }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const t = useT();
  const id = useId();
  const [draft, setDraft] = useState("");
  const add = () => {
    const items = draft.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    if (items.length) onChange([...new Set([...values, ...items])]);
    setDraft("");
  };
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-mono text-[11px] uppercase text-muted-foreground">{label}</label>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {values.map((v) => (
            <li key={v} className="inline-flex items-center gap-1 rounded-full bg-card py-1 pl-3 pr-1 text-sm">
              {v}
              <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={t.common.remove(v)} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground">
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input id={id} value={draft} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} className={cn(control, "h-10")}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} aria-describedby={hint ? `${id}-hint` : undefined} />
        <Button variant="ghost" onClick={add} aria-label={t.common.addTo(label)}><Plus className="h-4 w-4" aria-hidden /></Button>
      </div>
      {hint && <p id={`${id}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Sugerencia con su razón y la decisión de la persona. */
export function SuggestionRow({ title, reason, added, onAdd, onDiscard, children }: { title: React.ReactNode; reason: string; added: boolean; onAdd: () => void; onDiscard: () => void; children?: React.ReactNode }) {
  const t = useT();
  return (
    <li className={cn("flex items-start justify-between gap-4 rounded-xl px-4 py-3 transition-colors", added ? "bg-primary/[0.06]" : "bg-card")}>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{reason}</p>
        {children}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {added
          ? <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase text-good"><Check className="h-3.5 w-3.5" aria-hidden />{t.common.added}</span>
          : <>
              <Button variant="ghost" className="h-8 px-3" onClick={onAdd}>{t.common.add}</Button>
              <Button variant="quiet" className="h-8" onClick={onDiscard}>{t.common.discard}</Button>
            </>}
      </div>
    </li>
  );
}

export function Alert({ tone = "bad", children }: { tone?: "bad" | "good" | "info"; children: React.ReactNode }) {
  return (
    <p role={tone === "bad" ? "alert" : "status"} className={cn("rounded-lg px-3 py-2 text-sm",
      tone === "bad" && "bg-bad/10 text-bad", tone === "good" && "bg-good/10 text-good", tone === "info" && "bg-card text-muted-foreground")}>
      {children}
    </p>
  );
}

export function Section({ title, description, children, id }: { title: string; description?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className="space-y-5 rounded-2xl bg-card/60 p-5 md:p-7">
      <div className="space-y-1">
        <h2 id={id ? `${id}-title` : undefined} className="text-lg font-medium">{title}</h2>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {children}
    </section>
  );
}
