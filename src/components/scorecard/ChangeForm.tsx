"use client";

import { useActionState } from "react";
import { addChangeAction, type ChangeState } from "@/app/calificacion/actions";

const field = "h-9 w-full rounded-lg bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = { today: string; areas: { id: string; label: string }[] };

/** Registrar un cambio: lo que hizo la marca o algo de afuera que pudo mover los números. */
export function ChangeForm({ today, areas }: Props) {
  const [state, action, isPending] = useActionState<ChangeState, FormData>(addChangeAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
      <label className="space-y-1 text-sm sm:col-span-3">
        <span className="font-medium">Qué cambió</span>
        <input name="title" required minLength={3} maxLength={200} className={field} placeholder="p. ej. Publicamos el schema Organization / Google lanzó un core update" />
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Dónde se nota</span>
        <select name="area" defaultValue="general" className={field}>
          <option value="general">General</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
        </select>
      </label>
      <fieldset className="space-y-1 text-sm">
        <legend className="font-medium">Origen</legend>
        <div className="flex h-9 items-center gap-3">
          <label className="inline-flex items-center gap-1.5"><input type="radio" name="kind" value="propio" defaultChecked className="accent-primary" />Lo hicimos</label>
          <label className="inline-flex items-center gap-1.5"><input type="radio" name="kind" value="externo" className="accent-primary" />Externo</label>
        </div>
      </fieldset>
      <label className="space-y-1 text-sm"><span className="font-medium">Fecha</span><input name="date" type="date" defaultValue={today} max={today} className={field} /></label>
      <label className="space-y-1 text-sm sm:col-span-3">
        <span className="font-medium">Detalle o link <span className="font-normal text-muted-foreground">(opcional)</span></span>
        <div className="grid gap-2 sm:grid-cols-2">
          <input name="detail" maxLength={2000} className={field} placeholder="Qué páginas, qué campaña…" />
          <input name="url" type="url" maxLength={500} className={field} placeholder="https://…" />
        </div>
      </label>
      <div className="flex items-center gap-3 sm:col-span-3">
        <button type="submit" disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2">
          {isPending ? "Guardando…" : "Registrar cambio"}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {state.ok && <span className="text-good-ink">{state.ok}</span>}
          {state.error && <span className="text-bad-ink">{state.error}</span>}
        </p>
      </div>
    </form>
  );
}
