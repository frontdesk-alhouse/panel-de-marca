"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleDashed, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useT } from "@/i18n/client";
import { isLiveRun, manualPlan, type PlannedSource } from "@/lib/sync-plan";

type Step = "queued" | "running" | "ok" | "skipped" | "error";
interface Run { source: string; status: "running" | "ok" | "error"; startedAt: string }
interface Status { runs: Run[]; sources: PlannedSource[]; lastOk: Record<string, string | null> }

const POLL_MS = 3000;

async function readStatus(signal?: AbortSignal): Promise<Status | null> {
  try {
    const res = await fetch("/api/sync/status", { cache: "no-store", signal });
    return res.ok ? ((await res.json()) as Status) : null;
  } catch {
    return null;
  }
}

/** Corre una fuente; cada llamada es su propia función en Vercel (hasta 300 s). */
async function syncOne(id: string): Promise<{ step: Step; error?: string }> {
  try {
    const res = await fetch(`/api/sync/${encodeURIComponent(id)}`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const body = (await res.json().catch(() => ({}))) as { status?: string; skipped?: string; error?: string };
    if (res.ok && body.skipped) return { step: "skipped" };
    if (res.ok && body.status === "ok") return { step: "ok" };
    return { step: "error", error: body.error };
  } catch {
    return { step: "error" };
  }
}

/** Botón de la barra superior: actualiza todas las fuentes ya, sin esperar al calendario diario. */
export function SyncNow() {
  const t = useT();
  const c = t.syncNow;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [withComp, setWithComp] = useState(false);
  const [steps, setSteps] = useState<Record<string, { step: Step; error?: string }>>({});
  const [phase, setPhase] = useState<"idle" | "busy" | "running" | "scoring" | "done">("idle");
  const running = useRef(false);
  // Hora de la última lectura del estado: el render no llama al reloj (debe ser puro).
  const [readAt, setReadAt] = useState(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const s = await readStatus(signal);
    if (s) { setStatus(s); setReadAt(Date.now()); }
    return s;
  }, []);

  // Al abrir: leer qué hay y si otra actualización (el programador u otra pestaña) sigue viva.
  useEffect(() => {
    if (!open || running.current) return;
    const controller = new AbortController();
    void refresh(controller.signal).then((s) => {
      if (s && s.runs.some((r) => isLiveRun(r))) setPhase("busy");
    });
    return () => controller.abort();
  }, [open, refresh]);

  // Mientras otra actualización corre, se consulta su avance hasta que termine.
  useEffect(() => {
    if (!open || phase !== "busy") return;
    const controller = new AbortController();
    const id = setInterval(async () => {
      const s = await refresh(controller.signal);
      if (s && !s.runs.some((r) => isLiveRun(r))) setPhase("idle");
    }, POLL_MS);
    return () => { controller.abort(); clearInterval(id); };
  }, [open, phase, refresh]);

  const plan = status ? manualPlan(status.sources, withComp) : [];
  const hasCompetition = Boolean(status?.sources.some((s) => s.group === "competition"));

  const start = async () => {
    if (running.current || plan.length === 0) return;
    running.current = true;
    setPhase("running");
    setSteps(Object.fromEntries(plan.map((s) => [s.id, { step: "queued" as Step }])));
    let failed = 0;
    // Una a la vez: así no se gastan cuotas de golpe y la base local (PGlite) no se encima.
    for (const s of plan) {
      setSteps((prev) => ({ ...prev, [s.id]: { step: "running" } }));
      const r = await syncOne(s.id);
      if (r.step === "error") failed += 1;
      setSteps((prev) => ({ ...prev, [s.id]: r }));
    }
    setPhase("scoring");
    const scored = await fetch("/api/scores", { method: "POST" }).then((r) => r.ok).catch(() => false);
    if (!scored) failed += 1;
    await refresh();
    setPhase("done");
    running.current = false;
    router.refresh();
    if (failed) toast.error(c.finishedErrors(failed));
    else toast.success(c.finished);
  };

  const ago = (iso: string | null | undefined) => {
    if (!iso) return c.never;
    const min = Math.round((readAt - new Date(iso).getTime()) / 60_000);
    const text = min < 1 ? c.ago.now : min < 60 ? c.ago.min(min) : min < 48 * 60 ? c.ago.h(Math.round(min / 60)) : c.ago.d(Math.round(min / 1440));
    return c.lastOk(text);
  };

  const liveIds = new Set(status?.runs.filter((r) => isLiveRun(r, readAt)).map((r) => r.source) ?? []);
  const stepOf = (id: string): Step | null => steps[id]?.step ?? (phase === "busy" && liveIds.has(id) ? "running" : null);
  const done = plan.filter((s) => ["ok", "skipped", "error"].includes(steps[s.id]?.step ?? "")).length;
  const busy = phase === "running" || phase === "scoring";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={c.button} title={c.button}
        className="inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-sm text-muted-foreground transition-[background-color,transform] duration-150 hover:bg-card hover:text-foreground active:scale-[0.97] motion-reduce:transform-none">
        <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden />
        <span className="hidden xl:inline">{c.button}</span>
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[min(100vw,420px)] gap-5 overflow-y-auto p-6">
          <SheetTitle className="font-display text-xl">{c.title}</SheetTitle>
          <p className="text-sm text-muted-foreground">{c.intro}</p>

          {status && status.sources.length === 0 && <p className="rounded-xl bg-card p-4 text-sm">{c.none}</p>}
          {phase === "busy" && <p className="rounded-xl bg-card p-4 text-sm">{c.busy}</p>}

          {hasCompetition && (
            <label className="flex items-start gap-3 rounded-xl bg-card p-4 text-sm">
              <input type="checkbox" checked={withComp} disabled={busy} onChange={(e) => setWithComp(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
              <span><span className="font-medium">{c.includeCompetition}</span><span className="mt-0.5 block text-muted-foreground">{c.competitionHint}</span></span>
            </label>
          )}

          <p role="status" aria-live="polite" className="font-mono text-[11px] uppercase text-muted-foreground">
            {phase === "running" ? c.progress(done, plan.length) : phase === "scoring" ? c.scoring : ""}
          </p>

          {plan.length > 0 && (
            <ul className="divide-y divide-border rounded-2xl bg-card/60">
              {plan.map((s) => {
                const step = stepOf(s.id);
                const err = steps[s.id]?.error;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{s.label}</span>
                      <span className="block font-mono text-[10px] uppercase text-muted-foreground">{err ?? ago(status?.lastOk[s.id])}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] uppercase text-muted-foreground">
                      {step === "queued" && <><CircleDashed className="h-3.5 w-3.5" aria-hidden />{c.queued}</>}
                      {step === "running" && <><Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden />{c.running}</>}
                      {step === "ok" && <span className="inline-flex items-center gap-1.5 text-good-ink"><Check className="h-3.5 w-3.5" aria-hidden />{c.ok}</span>}
                      {step === "skipped" && <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" aria-hidden />{c.skipped}</span>}
                      {step === "error" && <span className="inline-flex items-center gap-1.5 text-bad-ink"><X className="h-3.5 w-3.5" aria-hidden />{c.failed}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center gap-2">
            <button type="button" onClick={start} disabled={busy || phase === "busy" || plan.length === 0}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />}
              {phase === "done" ? c.again : c.start}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-9 rounded-lg px-3 text-sm text-muted-foreground hover:bg-card hover:text-foreground">{c.close}</button>
          </div>

          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground">{c.latencyTitle}</summary>
            <p className="mt-2">{c.latency}</p>
          </details>
        </SheetContent>
      </Sheet>
    </>
  );
}
