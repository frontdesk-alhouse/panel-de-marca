"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ExternalLink, Plus, Search, X } from "lucide-react";
import { competitorFromSiteAction, saveBrandAction, saveCompetitorsAction, suggestCompetitorsAction, suggestQueriesAction, type CompetitorSuggestions } from "@/app/setup/actions";
import { domainsInText, type BrandForm } from "@/lib/briefing/brand-form";
import type { Suggestion } from "@/lib/briefing/suggest";
import type { CompetitorInput } from "@/lib/workspace/schema";
import { control } from "@/components/crm/fields";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";
import { Alert, Button, ListField, Section, StepHeader, SuggestionRow, TextField } from "./ui";

/** Paso 4: búsquedas objetivo, competencia y de dónde salen las ideas. Cada sugerencia trae su razón. */
export function MarketStep({ form, onChange, competitors, onCompetitors, knownCompetitors = "", hasApify, onSaved, onBack, saveLabel, header = true }: {
  form: BrandForm; onChange: (f: BrandForm) => void; competitors: CompetitorInput[]; onCompetitors: (c: CompetitorInput[]) => void;
  knownCompetitors?: string; hasApify: boolean; onSaved: () => void; onBack?: () => void; saveLabel?: string; header?: boolean;
}) {
  const t = useT();
  const c = t.setup.market;
  const ex = t.common.example;
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const save = () => startSave(async () => {
    setError(null);
    const brand = await saveBrandAction(form);
    if (!brand.ok) return setError(brand.error);
    const comp = await saveCompetitorsAction(competitors);
    if (!comp.ok) return setError(comp.error);
    onSaved();
  });

  return (
    <div className="space-y-8">
      {header && (
        <StepHeader eyebrow={c.eyebrow} title={c.title}><p>{c.intro}</p></StepHeader>
      )}
      <QueriesSection form={form} onChange={onChange} />
      <CompetitorsSection form={form} competitors={competitors} onCompetitors={onCompetitors} knownCompetitors={knownCompetitors} hasApify={hasApify} />
      <Section title={c.ideasTitle} description={c.ideasIntro}>
        <div className="grid gap-5 md:grid-cols-2">
          <ListField label={c.topics} values={form.topics} onChange={(v) => onChange({ ...form, topics: v })} placeholder={ex(c.topicsEx)} hint={c.topicsHint} />
          <ListField label={c.relevant} values={form.relevantTerms} onChange={(v) => onChange({ ...form, relevantTerms: v })} placeholder={ex(c.relevantEx)} hint={c.relevantHint} />
        </div>
        <RedditField value={form.redditSearches} onChange={(v) => onChange({ ...form, redditSearches: v })} />
      </Section>
      {error && <Alert>{error}</Alert>}
      <div className="flex items-center justify-between">
        {onBack ? <Button variant="quiet" onClick={onBack}>{t.common.back}</Button> : <span />}
        <Button onClick={save} pending={saving}>{saveLabel ?? t.common.saveContinue}</Button>
      </div>
    </div>
  );
}

function QueriesSection({ form, onChange }: { form: BrandForm; onChange: (f: BrandForm) => void }) {
  const t = useT();
  const c = t.setup.market;
  const [suggestions, setSuggestions] = useState<Suggestion<string>[] | null>(null);
  const [discarded, setDiscarded] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fetchSuggestions = () => start(async () => {
    setError(null);
    const r = await suggestQueriesAction(form.services, form.city, form.locale);
    if (r.ok) setSuggestions(r.data);
    else setError(r.error);
  });
  const add = (q: string) => onChange({ ...form, targetQueries: [...new Set([...form.targetQueries, q])] });
  const visible = (suggestions ?? []).filter((s) => !discarded.includes(s.value));
  return (
    <Section title={c.queriesTitle} description={c.queriesIntro}>
      <ListField label={c.yourQueries} values={form.targetQueries} onChange={(v) => onChange({ ...form, targetQueries: v })} placeholder={t.common.example(c.queriesEx)} />
      <div className="space-y-3">
        <Button variant="ghost" onClick={fetchSuggestions} pending={pending} disabled={!form.services.length}>
          <Search className="h-4 w-4" aria-hidden />{suggestions ? c.suggestMore : c.suggest}
        </Button>
        {!form.services.length && <p className="text-xs text-muted-foreground">{c.needServices}</p>}
        {form.services.length > 0 && !form.city && <p className="text-xs text-muted-foreground">{c.needCity}</p>}
        {error && <Alert>{error}</Alert>}
        {suggestions && !visible.length && <p className="text-sm text-muted-foreground">{c.noMore}</p>}
        {visible.length > 0 && (
          <ul className="space-y-2" aria-label={c.suggested}>
            {visible.map((s) => (
              <SuggestionRow key={s.value} title={s.value} reason={s.reason} added={form.targetQueries.includes(s.value)} onAdd={() => add(s.value)} onDiscard={() => setDiscarded((d) => [...d, s.value])} />
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}

function CompetitorsSection({ form, competitors, onCompetitors, knownCompetitors, hasApify }: {
  form: BrandForm; competitors: CompetitorInput[]; onCompetitors: (c: CompetitorInput[]) => void; knownCompetitors: string; hasApify: boolean;
}) {
  const t = useT();
  const c = t.setup.market;
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, startAdd] = useTransition();
  const [suggesting, startSuggest] = useTransition();
  const [result, setResult] = useState<CompetitorSuggestions | null>(null);
  const [discarded, setDiscarded] = useState<string[]>([]);
  // La lista más reciente: al agregar varios seguidos, cada uno parte de la anterior.
  const listRef = useRef(competitors);
  useEffect(() => { listRef.current = competitors; }, [competitors]);
  const has = (domain: string) => competitors.some((x) => x.domain === domain);

  const addDomain = async (domain: string) => {
    const r = await competitorFromSiteAction(domain, form.city);
    if (!r.ok) return setError(r.error);
    if (r.data.domain === form.domain) return setError(c.ownSite);
    if (listRef.current.some((x) => x.domain === r.data.domain)) return;
    const next = [...listRef.current, r.data];
    listRef.current = next;
    onCompetitors(next);
  };
  const addManual = () => startAdd(async () => {
    setError(null);
    await addDomain(input);
    setInput("");
  });

  // Los sitios que la persona escribió en el briefing se leen y se agregan solos (una vez).
  const autoAdded = useRef(false);
  useEffect(() => {
    if (autoAdded.current) return;
    autoAdded.current = true;
    const pending = domainsInText(knownCompetitors).filter((d) => d !== form.domain && !listRef.current.some((x) => x.domain === d));
    if (pending.length) startAdd(async () => { for (const d of pending.slice(0, 10)) await addDomain(d); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al entrar al paso
  }, []);

  const suggest = () => startSuggest(async () => {
    setError(null);
    const r = await suggestCompetitorsAction(form.targetQueries, form.domain, form.locale);
    if (r.ok) setResult(r.data);
    else setError(r.error);
  });
  const update = (i: number, patch: Partial<CompetitorInput>) => onCompetitors(competitors.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const visible = (result?.suggestions ?? []).filter((s) => !discarded.includes(s.value.domain));

  return (
    <Section title={c.competitorsTitle} description={c.competitorsIntro}>
      {competitors.length > 0 && (
        <ul className="space-y-2" aria-label={c.competitors}>
          {competitors.map((comp, i) => (
            <li key={comp.domain} className="grid gap-2 rounded-xl bg-background/70 p-3 sm:grid-cols-[1.2fr_1fr_1fr_auto] sm:items-center">
              <div className="min-w-0">
                <input aria-label={c.nameOf(comp.domain)} value={comp.name} onChange={(e) => update(i, { name: e.target.value })} className={cn(control, "h-9 font-medium")} />
                <p className="mt-1 truncate px-1 text-xs text-muted-foreground">{comp.domain}</p>
              </div>
              <input aria-label={c.cityOf(comp.name)} value={comp.city} placeholder={c.cityPlaceholder} onChange={(e) => update(i, { city: e.target.value, mapsQuery: [comp.name, e.target.value].filter(Boolean).join(" ") })} className={cn(control, "h-9")} />
              <input aria-label={c.instagramOf(comp.name)} value={comp.instagram ?? ""} placeholder="Instagram" onChange={(e) => update(i, { instagram: e.target.value.replace(/^@/, "") || undefined })} className={cn(control, "h-9")} />
              <Button variant="quiet" onClick={() => onCompetitors(competitors.filter((_, j) => j !== i))} aria-label={t.common.remove(comp.name)}><X className="h-4 w-4" aria-hidden /></Button>
            </li>
          ))}
        </ul>
      )}
      <form className="flex max-w-xl gap-2" onSubmit={(e) => { e.preventDefault(); addManual(); }}>
        <div className="flex-1"><TextField label={c.addCompetitor} value={input} onChange={setInput} placeholder={t.common.example(c.addCompetitorEx)} hint={c.addCompetitorHint} /></div>
        <Button type="submit" variant="ghost" className="mt-[22px]" pending={adding} disabled={!input.trim()}><Plus className="h-4 w-4" aria-hidden />{t.common.add}</Button>
      </form>
      {adding && <p role="status" className="text-sm text-muted-foreground">{c.readingSites}</p>}

      <div className="space-y-3 border-t border-border pt-5">
        <p className="text-sm font-medium">{c.whoElse}</p>
        <p className="text-sm text-muted-foreground">
          {hasApify ? c.withApify : c.withoutApify}
        </p>
        <Button variant="ghost" onClick={suggest} pending={suggesting} disabled={!form.targetQueries.length}>
          <Search className="h-4 w-4" aria-hidden />{hasApify ? c.searchGoogle : c.seeSearches}
        </Button>
        {!form.targetQueries.length && <p className="text-xs text-muted-foreground">{c.needQueries}</p>}
        {suggesting && <p role="status" className="text-sm text-muted-foreground">{c.searching}</p>}
        {result && !result.viaApify && (
          <ul className="space-y-1 text-sm">
            {result.links.map((l) => (
              <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline underline-offset-2">{l.query}<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a></li>
            ))}
          </ul>
        )}
        {result?.viaApify && !visible.length && <p className="text-sm text-muted-foreground">{c.nobodyElse}</p>}
        {visible.length > 0 && (
          <ul className="space-y-2" aria-label={c.suggestedCompetitors}>
            {visible.map((s) => (
              <SuggestionRow key={s.value.domain} title={<>{s.value.name} <span className="font-normal text-muted-foreground">· {s.value.domain}</span></>} reason={s.reason}
                added={has(s.value.domain)} onAdd={() => startAdd(() => addDomain(s.value.domain))} onDiscard={() => setDiscarded((d) => [...d, s.value.domain])} />
            ))}
          </ul>
        )}
      </div>
      {error && <Alert>{error}</Alert>}
    </Section>
  );
}

function RedditField({ value, onChange }: { value: BrandForm["redditSearches"]; onChange: (v: BrandForm["redditSearches"]) => void }) {
  const t = useT();
  const c = t.setup.market;
  const [sub, setSub] = useState("");
  const [q, setQ] = useState("");
  const add = () => {
    const s = sub.trim().replace(/^\/?r\//i, "");
    if (!/^[A-Za-z0-9_]+$/.test(s) || !q.trim()) return;
    onChange([...value, { sub: s, q: q.trim(), topic: "general" }]);
    setSub("");
    setQ("");
  };
  return (
    <fieldset className="space-y-2">
      <legend className="font-mono text-[11px] uppercase text-muted-foreground">{c.reddit}</legend>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((r, i) => (
            <li key={`${r.sub}-${r.q}`} className="inline-flex items-center gap-1 rounded-full bg-card py-1 pl-3 pr-1 text-sm">
              r/{r.sub} · {r.q}
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={t.common.remove(`r/${r.sub} ${r.q}`)} className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"><X className="h-3.5 w-3.5" aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input aria-label={c.subreddit} value={sub} onChange={(e) => setSub(e.target.value)} placeholder={t.common.example("smallbusiness")} className={cn(control, "h-10 sm:w-48")} />
        <input aria-label={c.redditQuery} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.common.example(c.redditQueryEx)} className={cn(control, "h-10 flex-1")}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button variant="ghost" onClick={add}><Plus className="h-4 w-4" aria-hidden />{t.common.add}</Button>
      </div>
    </fieldset>
  );
}
