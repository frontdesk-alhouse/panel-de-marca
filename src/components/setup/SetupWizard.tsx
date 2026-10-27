"use client";

import { I18nProvider, useLang } from "@/i18n/client";
import { messages, type Lang } from "@/i18n";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { EMPTY_BRIEFING, formFromSite, type BrandForm } from "@/lib/briefing/brand-form";
import type { Draft } from "@/lib/briefing/draft";
import type { IntegrationState } from "@/lib/integrations/status";
import type { Briefing, CompetitorInput } from "@/lib/workspace/schema";
import type { SiteSummary } from "@/app/setup/actions";
import { WelcomeStep } from "./WelcomeStep";
import { SiteStep } from "./SiteStep";
import { BriefingStep } from "./BriefingStep";
import { BrandStep } from "./BrandStep";
import { MarketStep } from "./MarketStep";
import { ConnectionsStep } from "./ConnectionsStep";
import { SyncStep } from "./SyncStep";
import { STEPS, type StepId } from "./steps";


export interface SetupInitial {
  step: StepId;
  form: BrandForm | null;
  competitors: CompetitorInput[];
  states: IntegrationState[];
  hasClaude: boolean;
  hasApify: boolean;
  googleResult: string | null;
}

/** La configuración inicial: un paso a la vez, con el avance en la URL (?paso=). */
export function SetupWizard({ initial }: { initial: SetupInitial }) {
  // Al guardar la marca puede cambiar el idioma del panel. Se cambia aquí, en el navegador:
  // un router.refresh() volvería a montar el asistente y perdería lo que no está guardado
  // (p. ej. la competencia escrita en el briefing).
  const outerLang = useLang();
  const [uiLang, setUiLang] = useState<Lang | null>(null);
  const lang = uiLang ?? outerLang;
  const t = messages(lang);
  const [step, setStep] = useState<StepId>(initial.step);
  const [site, setSite] = useState<SiteSummary | null>(null);
  const [briefing, setBriefing] = useState<Briefing>(initial.form?.briefing ?? EMPTY_BRIEFING);
  const [known, setKnown] = useState("");
  const [form, setForm] = useState<BrandForm | null>(initial.form);
  const [drafted, setDrafted] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [competitors, setCompetitors] = useState(initial.competitors);
  // Viven aquí (no en cada paso) para no perderse al ir y volver entre pasos.
  const [states, setStates] = useState(initial.states);
  const [autoAddPending, setAutoAddPending] = useState(true);
  const saved = initial.form !== null;
  const reached = STEPS.indexOf(step);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("paso", step);
    url.searchParams.delete("google");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    if (!url.hash) window.scrollTo({ top: 0 });
    // Lectores de pantalla y teclado: el foco va al título del paso nuevo.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-step-title]")?.focus({ preventScroll: true }));
  }, [step]);

  const go = (s: StepId) => setStep(s);
  const onDraft = (draft: Draft | null) => {
    if (!site) return go("marca");
    const next = formFromSite({
      domain: site.domain, facts: site.facts, keyPaths: site.keyPaths, description: site.description, draft, briefing,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, browserLocale: navigator.language,
    });
    // Rehacer el borrador no borra lo que solo sabe la persona.
    setForm(form ? { ...next, owner: form.owner, team: form.team } : next);
    setDrafted(Boolean(draft));
    setMissing(draft?.missing ?? []);
    go("marca");
  };
  const canOpen = (s: StepId) => {
    const i = STEPS.indexOf(s);
    if (i <= 2) return true;
    if (s === "marca") return Boolean(form);
    return saved || Boolean(form && i <= reached);
  };

  return (
    <I18nProvider lang={lang}>
    <div className="min-h-[calc(100dvh-1rem)] rounded-[20px] bg-background shadow-[0_1px_0_rgb(255_255_255/0.6)_inset] md:min-h-[calc(100dvh-1.5rem)]">
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:px-8 lg:grid-cols-[200px_1fr] lg:py-16">
      <nav aria-label={t.setup.stepsNav} className="lg:sticky lg:top-16 lg:self-start">
        <ol className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:gap-0.5 lg:pb-0">
          {STEPS.map((s, i) => {
            const active = s === step;
            const open = canOpen(s);
            return (
              <li key={s} className="shrink-0">
                <button type="button" onClick={() => open && go(s)} disabled={!open} aria-current={active ? "step" : undefined}
                  className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition",
                    active ? "bg-primary text-primary-foreground" : open ? "text-foreground/80 hover:bg-card" : "text-muted-foreground/60")}>
                  <span className={cn("font-mono text-[10px]", active ? "opacity-70" : "text-muted-foreground")}>{String(i).padStart(2, "0")}</span>
                  {t.setup.steps[s]}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      <main className="min-w-0">
        {step === "bienvenida" && <WelcomeStep onNext={() => go("sitio")} />}
        {step === "sitio" && <SiteStep initialDomain={form?.domain ?? ""} site={site} onRead={setSite} onNext={() => go("briefing")} />}
        {step === "briefing" && (
          site
            ? <BriefingStep domain={site.domain} language={form?.language ?? "es"} briefing={briefing} knownCompetitors={known} hasClaude={initial.hasClaude}
                onChange={(b, k) => { setBriefing(b); if (k !== known) setAutoAddPending(true); setKnown(k); if (form) setForm({ ...form, briefing: b }); }} onDraft={onDraft} onBack={() => go("sitio")} />
            : <SiteStep initialDomain={form?.domain ?? ""} site={null} onRead={setSite} onNext={() => go("briefing")} />
        )}
        {step === "marca" && form && <BrandStep form={form} onChange={setForm} drafted={drafted} missingFromDraft={missing} onSaved={() => { setUiLang(form.language); go("mercado"); }} onBack={() => go("briefing")} />}
        {step === "mercado" && form && (
          <MarketStep form={form} onChange={setForm} competitors={competitors} onCompetitors={setCompetitors} knownCompetitors={known}
            autoAddPending={autoAddPending} onAutoAdded={() => setAutoAddPending(false)}
            hasApify={initial.hasApify} onSaved={() => go("conexiones")} onBack={() => go("marca")} />
        )}
        {step === "conexiones" && <ConnectionsStep states={states} onStates={setStates} googleResult={initial.googleResult} back="/setup" onNext={() => go("actualizar")} onBack={() => go("mercado")} />}
        {step === "actualizar" && <SyncStep onBack={() => go("conexiones")} />}
      </main>
    </div>
    </div>
    </I18nProvider>
  );
}
