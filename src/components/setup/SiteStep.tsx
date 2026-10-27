"use client";

import { useT } from "@/i18n/client";
import { useState, useTransition } from "react";
import { Globe } from "lucide-react";
import { readSiteAction, type SiteSummary } from "@/app/setup/actions";
import { Alert, Button, StepHeader, TextField } from "./ui";

/** Paso 2: la persona da su sitio y el panel lee quién es. */
export function SiteStep({ initialDomain, site, onRead, onNext }: { initialDomain: string; site: SiteSummary | null; onRead: (s: SiteSummary) => void; onNext: () => void }) {
  const t = useT();
  const c = t.setup.site;
  const [domain, setDomain] = useState(initialDomain);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const read = () => start(async () => {
    setError(null);
    const r = await readSiteAction(domain);
    if (r.ok) onRead(r.data);
    else setError(r.error);
  });
  const f = site?.facts;
  const found: [string, string | null][] = f ? [
    [c.facts.name, f.name], [c.facts.city, f.city], [c.facts.phone, f.phone], [c.facts.instagram, f.instagram && `@${f.instagram}`],
    [c.facts.lang, f.lang], [c.facts.prices, f.prices.slice(0, 6).join(" · ") || null],
  ] : [];
  return (
    <div className="space-y-8">
      <StepHeader eyebrow={c.eyebrow} title={c.title}><p>{c.intro}</p></StepHeader>
      <form className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => { e.preventDefault(); read(); }}>
        <div className="flex-1"><TextField label={c.domain} value={domain} onChange={setDomain} placeholder="tusitio.com" invalid={Boolean(error)} /></div>
        <Button type="submit" pending={pending} disabled={!domain.trim()}><Globe className="h-4 w-4" aria-hidden />{site ? c.reread : c.read}</Button>
      </form>
      {pending && <p className="text-sm text-muted-foreground" role="status">{c.reading}</p>}
      {error && <Alert>{error}</Alert>}
      {site && !pending && (
        <section aria-labelledby="site-found" className="grid gap-6 rounded-2xl bg-card/60 p-5 md:grid-cols-[1fr_1.2fr] md:p-7">
          <div className="space-y-4">
            <h2 id="site-found" className="text-lg font-medium">{c.found(site.domain)}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {found.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-mono text-[11px] uppercase leading-6 text-muted-foreground">{k}</dt>
                  <dd className={v ? "" : "text-muted-foreground"}>{v ?? c.notFound}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[11px] uppercase text-muted-foreground">{c.pagesRead(site.pages.length, site.found || site.pages.length)}</p>
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-2 text-sm">
              {site.pages.map((p) => <li key={p.url} className="truncate" title={p.url}><span className="text-muted-foreground">{new URL(p.url).pathname}</span> · {p.title || c.untitled}</li>)}
            </ul>
          </div>
        </section>
      )}
      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!site || pending}>{t.common.continue}</Button>
      </div>
    </div>
  );
}
