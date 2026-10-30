"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const DAYS = 90;

/** Recalcula los últimos 90 días con los datos ya guardados y reemplaza lo que hubiera. */
export function BackfillButton() {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = () => start(async () => {
    setError(null);
    const res = await fetch("/api/scores", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ backfillDays: DAYS }) });
    const body = (await res.json().catch(() => ({}))) as { saved?: number; error?: string };
    if (!res.ok) return setError(body.error ?? "No se pudo reconstruir.");
    toast.success(`Historial recalculado: ${body.saved ?? 0} días.`);
    router.refresh();
  });
  return (
    <span className="inline-flex items-center gap-3">
      <button type="button" onClick={run} disabled={isPending}
        className="h-8 rounded-md bg-background px-3 font-mono text-[11px] uppercase hover:bg-secondary disabled:opacity-60">
        {isPending ? "Reconstruyendo… (hasta 1 min)" : `Reconstruir ${DAYS} días`}
      </button>
      {error && <span role="alert" className="text-xs text-bad-ink">{error}</span>}
    </span>
  );
}
