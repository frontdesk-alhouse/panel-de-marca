"use client";

import { useActionState } from "react";
import { addRunAction, importRunsAction, type RunsState } from "@/app/seo/ia/actions";
import { AI_ASSISTANT_LABELS } from "@/lib/geo/labels";

const field = "h-9 w-full rounded-lg bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const button = "inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

function Result({ state }: { state: RunsState }) {
  return (
    <div role="status" aria-live="polite" className="space-y-1 text-sm">
      {state.ok && <p className="text-good-ink">{state.ok}</p>}
      {state.error && <p className="text-bad-ink">{state.error}</p>}
      {state.problems && <ul className="list-disc pl-5 text-xs text-muted-foreground">{state.problems.map((p) => <li key={p}>{p}</li>)}</ul>}
    </div>
  );
}

/** Importar los .md de corrida del skill seo-geo. */
export function ImportRuns() {
  const [state, action, isPending] = useActionState(importRunsAction, {});
  return (
    <form action={action} className="space-y-3">
      <label htmlFor="runs-files" className="block text-sm font-medium">Archivos de corrida (.md del skill seo-geo)</label>
      <input id="runs-files" name="files" type="file" accept=".md,text/markdown" multiple required
        className="block w-full text-sm file:mr-3 file:h-9 file:rounded-lg file:border-0 file:bg-background file:px-3 file:text-sm" />
      <button type="submit" disabled={isPending} className={button}>{isPending ? "Importando…" : "Importar"}</button>
      <Result state={state} />
    </form>
  );
}

/** Capturar una corrida a mano. */
export function AddRun({ queries, today }: { queries: { id: string; text: string }[]; today: string }) {
  const [state, action, isPending] = useActionState(addRunAction, {});
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm sm:col-span-2">
        <span className="font-medium">Consulta</span>
        <input name="query" list="battery" required maxLength={500} className={field} placeholder="¿Quién es el mejor … en …?" />
        <datalist id="battery">{queries.map((q) => <option key={q.id} value={q.text} />)}</datalist>
      </label>
      <label className="space-y-1 text-sm">
        <span className="font-medium">Asistente</span>
        <select name="assistant" required className={field} defaultValue="chatgpt">
          {Object.entries(AI_ASSISTANT_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1 text-sm"><span className="font-medium">Id</span><input name="queryId" maxLength={40} placeholder="Q-01" className={field} /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Corrida</span><input name="run" type="number" min={1} max={50} defaultValue={1} className={field} /></label>
        <label className="space-y-1 text-sm"><span className="font-medium">Fecha</span><input name="date" type="date" defaultValue={today} className={field} /></label>
      </div>
      <fieldset className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
        <legend className="sr-only">Resultado</legend>
        <label className="inline-flex items-center gap-2"><input type="checkbox" name="appears" className="h-4 w-4 accent-primary" />Te menciona</label>
        <label className="inline-flex items-center gap-2">Lugar <input name="position" type="number" min={1} max={50} className={`${field} w-20`} /></label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" name="searched" className="h-4 w-4 accent-primary" />Buscó en la web</label>
      </fieldset>
      <label className="space-y-1 text-sm sm:col-span-2">
        <span className="font-medium">URLs citadas <span className="font-normal text-muted-foreground">(una por línea o separadas por espacio)</span></span>
        <textarea name="citedUrls" rows={2} className={`${field} h-auto py-2`} />
      </label>
      <label className="space-y-1 text-sm sm:col-span-2">
        <span className="font-medium">Dato erróneo sobre la marca <span className="font-normal text-muted-foreground">(opcional)</span></span>
        <input name="wrongFact" maxLength={500} className={field} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={isPending} className={button}>{isPending ? "Guardando…" : "Guardar corrida"}</button>
        <Result state={state} />
      </div>
    </form>
  );
}
