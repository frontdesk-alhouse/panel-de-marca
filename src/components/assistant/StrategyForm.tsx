"use client";

import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { control, Field } from "@/components/crm/fields";

/** Generar o rehacer el plan de medios con un presupuesto y prioridades opcionales. */
export function StrategyForm({ hasStrategy }: { hasStrategy: boolean }) {
  const router = useRouter();
  const currency = useWorkspace().locale.currency;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const res = await fetch("/api/strategy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ budget: String(fd.get("budget") ?? ""), notes: String(fd.get("notes") ?? "") }) });
          if (!res.ok) { setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "No se pudo generar."); return; }
          router.refresh();
        });
      }}
      className="grid gap-4 rounded-2xl bg-card p-5 md:grid-cols-[220px_1fr_auto] md:items-end"
    >
      <Field label={`Presupuesto mensual de medios (${currency})`} name="budget" hint="Opcional: si lo dejas vacío, propone uno">
        <input id="budget" name="budget" inputMode="decimal" placeholder="15,000" className={`${control} h-9`} />
      </Field>
      <Field label="Prioridades o contexto" name="notes" hint="Ej. enfocarnos en médicos, abrir CDMX, no usar TikTok">
        <input id="notes" name="notes" maxLength={1500} className={`${control} h-9`} />
      </Field>
      <button type="submit" disabled={pending} className="h-9 rounded-md bg-primary px-4 font-mono text-[11px] uppercase text-primary-foreground hover:opacity-85 disabled:opacity-60">
        {pending ? "Diseñando… (2-3 min)" : hasStrategy ? "Rehacer estrategia" : "Generar estrategia"}
      </button>
      {error && <p className="md:col-span-3 text-sm text-bad">{error}</p>}
    </form>
  );
}
