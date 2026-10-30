"use client";

import { useEffect, useState } from "react";
import { ArrowUpCircle, ExternalLink, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CopyButton } from "@/components/handoff/CopyButton";
import { useT } from "@/i18n/client";
import type { UpdateStatus } from "@/lib/updates/check";

/** Vuelve a preguntar cada 6 h si el panel se queda abierto. */
const POLL_MS = 6 * 60 * 60 * 1000;
const MANUAL_COMMAND = "git pull --ff-only && npm install";

/** Aviso de versión nueva en el encabezado: solo aparece cuando hay una. */
export function UpdateNotice() {
  const t = useT().updates;
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [installed, setInstalled] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const check = () => fetch("/api/updates").then((r) => (r.ok ? r.json() : null)).then((s: UpdateStatus | null) => { if (alive) setStatus(s); }).catch(() => {});
    check();
    const id = setInterval(check, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!status?.hasUpdate) return null;

  async function update() {
    setState("running");
    try {
      const res = await fetch("/api/updates", { method: "POST" });
      const body = (await res.json()) as { ok: boolean; version?: string };
      if (!body.ok) throw new Error("update");
      setInstalled(body.version ?? status!.latest);
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <Popover>
      <PopoverTrigger className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90 active:scale-95">
        <ArrowUpCircle className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">{t.badge(status.latest ?? "")}</span>
        <span className="sr-only sm:hidden">{t.badge(status.latest ?? "")}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{t.title}</p>
          <p className="text-xs text-muted-foreground">{t.versions(status.current, status.latest ?? "")}</p>
        </div>
        <a href={status.changesUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-2">
          {t.whatsNew}<ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        {status.canSelfUpdate ? (
          state === "done" ? (
            <p role="status" className="rounded-md bg-card p-2.5 text-xs">{t.done(installed ?? "")}</p>
          ) : (
            <>
              <button type="button" onClick={update} disabled={state === "running"}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60">
                {state === "running" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {state === "running" ? t.running : t.updateNow}
              </button>
              {state === "error" && <p role="alert" className="text-xs text-destructive">{t.failed}</p>}
            </>
          )
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{status.reason === "cloud" ? t.cloud : status.reason === "dirty" ? t.dirty : t.manual}</p>
            {status.reason !== "cloud" && (
              <div className="flex items-center gap-2 rounded-md bg-card p-2">
                <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{MANUAL_COMMAND}</code>
                <CopyButton text={MANUAL_COMMAND} label={t.copy} copiedLabel={t.copied} failedLabel={t.copyFailed} className="h-7 px-2 text-xs" />
              </div>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
