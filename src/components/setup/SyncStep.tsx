"use client";

import { useT } from "@/i18n/client";
import { useEffect, useState, useTransition } from "react";
import { Check, CircleDashed, Loader2, X } from "lucide-react";
import { finishSetupAction, startFirstSyncAction, syncSourcesAction } from "@/app/setup/actions";
import { Alert, Button, StepHeader } from "./ui";

interface Run { source: string; status: "running" | "ok" | "error"; rows: number; startedAt: string }
const POLL_MS = 3000;

/** Paso 6: la primera actualización corre en el servidor; aquí se ve el avance por fuente. */
export function SyncStep({ onBack }: { onBack: () => void }) {
  const t = useT();
  const c = t.setup.sync;
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [starting, startSync] = useTransition();
  const [finishing, startFinish] = useTransition();
  const [sources, setSources] = useState<{ id: string; label: string }[] | null>(null);
  useEffect(() => { void syncSourcesAction().then(setSources); }, []);

  useEffect(() => {
    if (startedAt === null) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/sync/status", { cache: "no-store" });
        if (res.ok && alive) setRuns(((await res.json()) as { runs: Run[] }).runs);
      } catch { /* siguiente intento */ }
    };
    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [startedAt]);

  const start = () => startSync(async () => {
    setError(null);
    const r = await startFirstSyncAction();
    if (!r.ok) return setError(r.error);
    setStartedAt(Date.now());
  });
  const finish = () => startFinish(async () => {
    const r = await finishSetupAction();
    if (!r.ok) return setError(r.error);
    // Navegación completa: el layout pasa de la configuración a pantalla completa al panel con menú.
    window.location.assign("/");
  });

  // La corrida más reciente de cada fuente (el programador pudo traer alguna antes de este paso).
  const statusOf = (id: string) => runs.find((r) => r.source === id);
  const done = (sources ?? []).filter((s) => statusOf(s.id)?.status === "ok" || statusOf(s.id)?.status === "error").length;

  return (
    <div className="space-y-8">
      <StepHeader eyebrow={c.eyebrow} title={c.title}><p>{c.intro}</p></StepHeader>
      {sources === null && <p role="status" className="text-sm text-muted-foreground">{c.checking}</p>}
      {sources?.length === 0 && <Alert tone="info">{c.none}</Alert>}
      {startedAt === null
        ? <Button onClick={start} pending={starting} disabled={sources === null}>{c.start}</Button>
        : <p role="status" className="font-mono text-[11px] uppercase text-muted-foreground">{c.progress(done, sources?.length ?? 0)}</p>}
      {startedAt !== null && sources && sources.length > 0 && (
        <ul className="divide-y divide-border rounded-2xl bg-card/60" aria-label={c.perSource}>
          {sources.map((s) => {
            const r = statusOf(s.id);
            return (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span>{s.label}</span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase text-muted-foreground">
                  {!r && <><CircleDashed className="h-3.5 w-3.5" aria-hidden />{c.queued}</>}
                  {r?.status === "running" && <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />{c.running}</>}
                  {r?.status === "ok" && <span className="inline-flex items-center gap-1.5 text-good"><Check className="h-3.5 w-3.5" aria-hidden />{c.ready}</span>}
                  {r?.status === "error" && <span className="inline-flex items-center gap-1.5 text-bad"><X className="h-3.5 w-3.5" aria-hidden />{c.failed}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {error && <Alert>{error}</Alert>}
      <div className="flex items-center justify-between">
        <Button variant="quiet" onClick={onBack}>{t.common.back}</Button>
        <Button onClick={finish} pending={finishing}>{c.finish}</Button>
      </div>
    </div>
  );
}
