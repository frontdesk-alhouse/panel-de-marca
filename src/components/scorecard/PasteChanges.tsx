"use client";

import { useActionState } from "react";
import { pasteChangesAction, type ChangeState } from "@/app/calificacion/actions";

/** Pegar los cambios que devolvió la IA (bloque «panel-cambios»): sin formulario. */
export function PasteChanges() {
  const [state, action, isPending] = useActionState<ChangeState, FormData>(pasteChangesAction, {});
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="paste-block" className="block text-sm">
        <span className="font-medium">Pegar cambios de tu IA</span>
        <span className="block text-xs text-muted-foreground">Al terminar, Claude (o la IA que uses) te devuelve un bloque «panel-cambios». Pégalo aquí tal cual; puedes pegar la respuesta completa.</span>
      </label>
      <textarea id="paste-block" name="block" required rows={4} maxLength={20000}
        placeholder={"```panel-cambios\n- 2026-10-29 | propio | conversion | Formulario de 3 campos publicado | https://…\n```"}
        className="w-full resize-y rounded-lg bg-background p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={isPending} className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2">
          {isPending ? "Registrando…" : "Registrar cambios"}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {state.ok && <span className="text-good-ink">{state.ok}</span>}
          {state.error && <span className="text-bad-ink">{state.error}</span>}
        </p>
      </div>
    </form>
  );
}
