"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ExternalLink, Plug } from "lucide-react";
import { saveIntegrationAction, testIntegrationAction } from "@/app/setup/actions";
import { INTEGRATIONS, type Integration } from "@/lib/integrations/catalog";
import { VISUAL_GUIDES } from "@/lib/integrations/visual-guides";
import { ScreenMock } from "./ScreenMock";
import { Recommended } from "./Recommended";
import { useT } from "@/i18n/client";
import type { IntegrationState } from "@/lib/integrations/status";
import type { Choice, TestResult } from "@/lib/integrations/test";
import { control } from "@/components/crm/fields";
import { cn } from "@/lib/utils";
import { Alert, Button, StepHeader, guarded } from "./ui";

const GOOGLE_CLIENT_FIELDS: ReadonlySet<string> = new Set(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);

/** Envuelve en un desplegable solo cuando hace falta (Google: los pasos de la app propia). */
function Wrap({ isOn, summary, children }: { isOn: boolean; summary: string; children: React.ReactNode }) {
  if (!isOn) return <>{children}</>;
  return (
    <details className="rounded-lg bg-background/40 px-3 py-2">
      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{summary}</summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}

/** Paso 5: conexiones. Ninguna es obligatoria: lo que no se conecta queda como «Conectar» en su sección. */
export function ConnectionsStep({ states: initial, onStates, googleResult, back, onNext, onBack, header = true }: {
  states: IntegrationState[]; onStates?: (s: IntegrationState[]) => void; googleResult?: string | null; back: "/setup" | "/ajustes"; onNext?: () => void; onBack?: () => void; header?: boolean;
}) {
  const t = useT();
  const c = t.setup.connections;
  // Si el padre guarda el estado (asistente, ajustes), se usa el suyo: no se pierde al cambiar de paso.
  const [own, setOwn] = useState(initial);
  const states = onStates ? initial : own;
  const setStates = onStates ?? setOwn;
  const main = INTEGRATIONS.filter((i) => !i.advanced);
  const advanced = INTEGRATIONS.filter((i) => i.advanced);
  const connected = states.filter((s) => s.connected).length;
  const googleClientSet = Boolean(states.find((s) => s.id === "google")?.fields.find((f) => f.key === "GOOGLE_CLIENT_ID")?.set);
  return (
    <div className="space-y-8">
      {header && (
        <StepHeader eyebrow={c.eyebrow} title={c.title}><p>{c.intro}</p></StepHeader>
      )}
      <p className="font-mono text-[11px] uppercase text-muted-foreground" role="status">{c.count(connected, INTEGRATIONS.length)}</p>
      <Recommended states={states} />
      <div className="space-y-4">
        {main.map((it) => <IntegrationCard key={it.id} it={it} state={states.find((s) => s.id === it.id)!} back={back} googleClientSet={googleClientSet} googleResult={it.id === "google" ? googleResult : null} onStates={setStates} />)}
      </div>
      <details className="rounded-2xl bg-card/40 px-5 py-4 md:px-7">
        <summary className="cursor-pointer text-sm font-medium">{c.advanced} <span className="font-normal text-muted-foreground">· {advanced.map((a) => t.integrations[a.id].name).join(", ")}</span></summary>
        <div className="mt-5 space-y-4">
          {advanced.map((it) => <IntegrationCard key={it.id} it={it} state={states.find((s) => s.id === it.id)!} back={back} googleClientSet={googleClientSet} onStates={setStates} />)}
        </div>
      </details>
      {(onNext || onBack) && (
        <div className="flex items-center justify-between">
          {onBack ? <Button variant="quiet" onClick={onBack}>{t.common.back}</Button> : <span />}
          {onNext && <Button onClick={onNext}>{connected ? c.continue : c.continueWithout}</Button>}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ it, state, back, googleClientSet, googleResult, onStates }: { it: Integration; state: IntegrationState; back: string; googleClientSet: boolean; googleResult?: string | null; onStates: (s: IntegrationState[]) => void }) {
  const t = useT();
  const c = t.setup.connections;
  const text = t.integrations[it.id];
  const initialValues = Object.fromEntries(state.fields.map((f) => [f.key, f.value ?? ""]));
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [choices, setChoices] = useState<TestResult["choices"]>();
  const [open, setOpen] = useState(!state.connected && (it.id === "google" ? Boolean(googleResult) : false));
  const [saving, startSave] = useTransition();
  const [testing, startTest] = useTransition();
  const fieldSet = (key: string) => state.fields.find((f) => f.key === key)?.set ?? false;

  const save = () => startSave(guarded(setError, t.common.unexpected, async () => {
    setError(null);
    setResult(null);
    const r = await saveIntegrationAction(it.id, values);
    if (!r.ok) return setError(r.error);
    setResult(r.data.test);
    if (r.data.test.choices) setChoices(r.data.test.choices);
    onStates(r.data.states);
    // Guardada: los secretos no vuelven, el campo queda vacío y marcado «guardada».
    // Si falló, se conserva lo escrito para corregirlo.
    if (r.data.test.ok) setValues((v) => Object.fromEntries(Object.entries(v).map(([k, val]) => [k, it.fields.find((f) => f.key === k)?.secret ? "" : val])));
  }));
  const test = () => startTest(guarded(setError, t.common.unexpected, async () => {
    setError(null);
    const r = await testIntegrationAction(it.id);
    if (!r.ok) return setError(r.error);
    setResult(r.data);
    if (r.data.choices) setChoices(r.data.choices);
  }));
  const googleFlash = googleResult && c.google[googleResult] ? { tone: googleResult === "ok" ? "good" as const : "bad" as const, text: c.google[googleResult] } : null;
  // Llegando desde «Conectar» de una sección (/ajustes#clarity): abrir esta tarjeta.
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const openIfTarget = () => {
      if (window.location.hash !== `#${it.id}`) return;
      setOpen(true);
      const details = ref.current?.closest("details");
      if (details) details.open = true;
      ref.current?.scrollIntoView({ block: "start" });
    };
    openIfTarget();
    // También al tocar una fila de «Completa tu panel» (cambia el hash sin recargar).
    window.addEventListener("hashchange", openIfTarget);
    return () => window.removeEventListener("hashchange", openIfTarget);
  }, [it.id]);
  const needsGoogleAuth = it.id === "google" || it.id === "gads";
  const isGoogle = it.id === "google";
  // Google ya no necesita un cliente propio: el panel trae la app «Alto Dashboard». Ads sí pide Google antes.
  const canAuth = isGoogle || googleClientSet;

  return (
    <section ref={ref} id={it.id} aria-labelledby={`${it.id}-name`} className={cn("scroll-mt-24 rounded-2xl p-5 transition-colors md:p-6", state.connected ? "bg-card/60" : "bg-card")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h2 id={`${it.id}-name`} className="text-base font-medium">{text.name}</h2>
            <span className="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{t.cost[it.cost]}</span>
            {state.connected && <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-good-ink"><Check className="h-3 w-3" aria-hidden />{c.connected}</span>}
          </div>
          <p className="text-sm text-muted-foreground">{text.unlocks}</p>
          <p className="text-xs text-muted-foreground">{text.costNote} · {c.minutes(it.minutes)}</p>
        </div>
        <Button variant={state.connected ? "quiet" : "ghost"} onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls={`${it.id}-body`}>
          <Plug className="h-4 w-4" aria-hidden />{state.connected ? c.edit : c.connect}
        </Button>
      </div>

      {googleFlash && <div className="mt-4"><Alert tone={googleFlash.tone}>{googleFlash.text}</Alert></div>}

      {open && (
        <div id={`${it.id}-body`} className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
          {isGoogle && (
            <ol className="space-y-3 text-sm">
              {c.oneClick.steps.map((x, i) => (
                <li key={x} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground" aria-hidden>{i + 1}</span>
                  <span className="leading-6">{x}</span>
                </li>
              ))}
              <li className="rounded-lg bg-background/70 px-3 py-2 text-xs text-muted-foreground">{c.oneClick.note}</li>
            </ol>
          )}
          <Wrap isOn={isGoogle} summary={c.oneClick.advanced}>
          <ol className="space-y-3 text-sm">
            {it.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-background font-mono text-[11px]" aria-hidden>{i + 1}</span>
                <span className="min-w-0 flex-1 space-y-2 leading-6">
                  <span className="block">
                    {text.steps[i]}{" "}
                    {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap underline underline-offset-2">{t.common.open}<ExternalLink className="h-3 w-3" aria-hidden /><span className="sr-only"> {t.common.newTab}</span></a>}
                  </span>
                  {VISUAL_GUIDES[it.id]?.[i] && (
                    <details open className="group/mock">
                      <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{c.whereToClick}</summary>
                      <div className="pt-2"><ScreenMock s={VISUAL_GUIDES[it.id]![i]!} /></div>
                    </details>
                  )}
                </span>
              </li>
            ))}
            {text.notes.map((n) => <li key={n} className="rounded-lg bg-background/70 px-3 py-2 text-xs text-muted-foreground">{n}</li>)}
            {it.id === "clarity" && (
              <li className="space-y-2 rounded-lg bg-background/70 px-3 py-3">
                <p className="font-medium">{t.integrations.clarity.install.title}</p>
                <ul className="list-disc space-y-1 pl-5 text-xs">{t.integrations.clarity.install.items.map((x) => <li key={x}>{x}</li>)}</ul>
                <p className="text-xs text-muted-foreground">{t.integrations.clarity.install.note}</p>
              </li>
            )}
          </ol>
          </Wrap>
          </div>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            {it.fields.filter((f) => !(isGoogle && GOOGLE_CLIENT_FIELDS.has(f.key))).map((f) => {
              const list: Choice[] | undefined = choices?.[f.key as "GA4_PROPERTY_ID" | "GSC_SITE_URL"];
              const id = `${it.id}-${f.key}`;
              return (
                <div key={f.key} className="space-y-1.5">
                  <label htmlFor={id} className="block font-mono text-[11px] uppercase text-muted-foreground">
                    {(text.fields as Record<string, string>)[f.key]}{f.optional && <span className="normal-case"> {t.common.optional}</span>}
                    {f.secret && fieldSet(f.key) && <span className="ml-2 normal-case text-good-ink">{c.savedKey}</span>}
                  </label>
                  {list && list.length > 0 ? (
                    <select id={id} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className={cn(control, "h-10")}>
                      <option value="">{c.choose}</option>
                      {list.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  ) : (
                    <input id={id} type={f.secret ? "password" : "text"} autoComplete="off" spellCheck={false} value={values[f.key] ?? ""}
                      placeholder={f.secret && fieldSet(f.key) ? c.keepKey : f.placeholder}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className={cn(control, "h-10 font-mono text-[13px]")} />
                  )}
                </div>
              );
            })}
            {isGoogle && (
              <details className="rounded-lg bg-background/60 px-3 py-2 text-sm">
                <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">{c.oneClick.ownClient}</summary>
                <div className="space-y-4 pt-3">
                  {it.fields.filter((f) => GOOGLE_CLIENT_FIELDS.has(f.key)).map((f) => {
                    const id = `${it.id}-${f.key}`;
                    return (
                      <div key={f.key} className="space-y-1.5">
                        <label htmlFor={id} className="block font-mono text-[11px] uppercase text-muted-foreground">
                          {(text.fields as Record<string, string>)[f.key]}
                          {f.secret && fieldSet(f.key) && <span className="ml-2 normal-case text-good-ink">{c.savedKey}</span>}
                        </label>
                        <input id={id} type={f.secret ? "password" : "text"} autoComplete="off" spellCheck={false} value={values[f.key] ?? ""}
                          placeholder={f.secret && fieldSet(f.key) ? c.keepKey : f.placeholder}
                          onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} className={cn(control, "h-10 font-mono text-[13px]")} />
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" pending={saving}>{c.saveTest}</Button>
              {state.connected && <Button variant="ghost" onClick={test} pending={testing}>{c.test}</Button>}
              {needsGoogleAuth && (
                <a href={canAuth ? `/api/setup/google/start?back=${back}${it.id === "gads" ? "&ads=1" : ""}` : undefined}
                  aria-disabled={!canAuth}
                  className={cn("inline-flex h-10 items-center rounded-lg px-4 text-sm", isGoogle && !state.authorized ? "bg-primary text-primary-foreground hover:opacity-90" : "border border-border bg-background hover:bg-card", !canAuth && "pointer-events-none opacity-55")}>
                  {it.id === "google" && state.authorized ? c.googleReconnect : c.googleConnect}
                </a>
              )}
            </div>
            {needsGoogleAuth && !canAuth && <p className="text-xs text-muted-foreground">{c.googleFirst}</p>}
            {error && <Alert>{error}</Alert>}
            {result && <Alert tone={result.ok ? "good" : "bad"}>{result.message}</Alert>}
          </form>
        </div>
      )}
    </section>
  );
}

