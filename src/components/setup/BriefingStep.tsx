"use client";

import { useT } from "@/i18n/client";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { draftAction, saveIntegrationAction } from "@/app/setup/actions";
import type { Draft } from "@/lib/briefing/draft";
import { COMPETITOR_INTERESTS, type Briefing } from "@/lib/workspace/schema";
import { Alert, Button, StepHeader, TextField, guarded } from "./ui";

/** Paso 3: el briefing. Las respuestas guían el borrador, las sugerencias y al analista del chat. */
export function BriefingStep({ domain, language, briefing, knownCompetitors, hasClaude, onChange, onDraft, onBack }: {
  domain: string; language: "es" | "en"; briefing: Briefing; knownCompetitors: string; hasClaude: boolean;
  onChange: (b: Briefing, known: string) => void; onDraft: (d: Draft | null) => void; onBack: () => void;
}) {
  const t = useT();
  const c = t.setup.briefing;
  const ex = t.common.example;
  const [claude, setClaude] = useState(hasClaude);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingKey, startKey] = useTransition();
  const [drafting, startDraft] = useTransition();
  const set = (patch: Partial<Briefing>) => onChange({ ...briefing, ...patch }, knownCompetitors);
  const toggle = (k: (typeof COMPETITOR_INTERESTS)[number]) => set({ wantToKnow: briefing.wantToKnow.includes(k) ? briefing.wantToKnow.filter((x) => x !== k) : [...briefing.wantToKnow, k] });

  const saveKey = () => startKey(guarded(setError, t.common.unexpected, async () => {
    setError(null);
    const r = await saveIntegrationAction("anthropic", { ANTHROPIC_API_KEY: key });
    if (!r.ok) return setError(r.error);
    if (!r.data.test.ok) return setError(r.data.test.message);
    setClaude(true);
    setKey("");
  }));
  const draft = () => startDraft(guarded(setError, t.common.unexpected, async () => {
    setError(null);
    const r = await draftAction(domain, briefing, knownCompetitors, language);
    if (!r.ok) return setError(r.error);
    onDraft(r.data);
  }));

  return (
    <div className="space-y-8">
      <StepHeader eyebrow={c.eyebrow} title={c.title}><p>{c.intro}</p></StepHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <TextField label={c.audience} multiline rows={3} value={briefing.audience} onChange={(v) => set({ audience: v })} placeholder={ex(c.audienceEx)} />
        <TextField label={c.goals} multiline rows={3} value={briefing.goals} onChange={(v) => set({ goals: v })} placeholder={ex(c.goalsEx)} />
        <TextField label={c.competitors} multiline rows={3} value={knownCompetitors} onChange={(v) => onChange(briefing, v)}
          placeholder={ex(c.competitorsEx)} hint={c.competitorsHint} />
        <TextField label={c.ideas} multiline rows={3} value={briefing.contentIdeas} onChange={(v) => set({ contentIdeas: v })} placeholder={ex(c.ideasEx)} />
      </div>

      <fieldset className="space-y-3">
        <legend className="font-mono text-[11px] uppercase text-muted-foreground">{c.wantToKnow}</legend>
        <div className="flex flex-wrap gap-2">
          {COMPETITOR_INTERESTS.map((k) => {
            const on = briefing.wantToKnow.includes(k);
            return (
              <button key={k} type="button" aria-pressed={on} onClick={() => toggle(k)}
                className={cn("h-9 rounded-full border px-4 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2", on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-card")}>
                {c.interests[k]}
              </button>
            );
          })}
        </div>
        <div className="max-w-xl"><TextField label={c.other} value={briefing.wantToKnowOther} onChange={(v) => set({ wantToKnowOther: v })} placeholder={c.otherEx} /></div>
      </fieldset>

      <section aria-labelledby="claude-title" className="rounded-2xl bg-card/60 p-5 md:p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0" aria-hidden strokeWidth={1.6} />
          <div className="min-w-0 flex-1 space-y-3">
            <h2 id="claude-title" className="font-medium">{claude ? c.claudeOn : c.claudeOff}</h2>
            {claude
              ? <p className="text-sm text-muted-foreground">{c.claudeOnText}</p>
              : <>
                  <p className="text-sm text-muted-foreground">{c.claudeOffText} <a className="underline underline-offset-2" href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">{c.createKey}</a></p>
                  <form className="flex max-w-xl flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); saveKey(); }}>
                    <div className="flex-1"><TextField label={c.keyLabel} type="password" value={key} onChange={setKey} placeholder="sk-ant-…" /></div>
                    <Button type="submit" variant="ghost" pending={savingKey} disabled={!key.trim()}>{c.saveTest}</Button>
                  </form>
                </>}
          </div>
        </div>
      </section>

      {error && <Alert>{error}</Alert>}
      {drafting && <p role="status" className="text-sm text-muted-foreground">{c.drafting}</p>}
      <div className="flex items-center justify-between">
        <Button variant="quiet" onClick={onBack}>{t.common.back}</Button>
        <Button onClick={draft} pending={drafting}>{claude ? c.draft : c.noClaude}</Button>
      </div>
    </div>
  );
}
