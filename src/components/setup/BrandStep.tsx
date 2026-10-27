"use client";

import { useT } from "@/i18n/client";
import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { saveBrandAction } from "@/app/setup/actions";
import { missingFields, type BrandForm } from "@/lib/briefing/brand-form";
import { control } from "@/components/crm/fields";
import { cn } from "@/lib/utils";
import { Alert, Button, ListField, Section, StepHeader, TextField } from "./ui";

/** Paso 3: la ficha de la marca, prellenada por el sitio (y Claude). La persona la corrige y guarda. */
export function BrandStep({ form, onChange, missingFromDraft = [], drafted, onSaved, onBack, saveLabel, header = true }: {
  form: BrandForm; onChange: (f: BrandForm) => void; missingFromDraft?: string[]; drafted: boolean;
  onSaved: () => void; onBack?: () => void; saveLabel?: string; header?: boolean;
}) {
  const t = useT();
  const c = t.setup.brand;
  const ex = t.common.example;
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const set = (patch: Partial<BrandForm>) => { setSaved(false); onChange({ ...form, ...patch }); };
  const missing = missingFields(form);
  const save = () => start(async () => {
    setError(null);
    const r = await saveBrandAction(form);
    if (!r.ok) return setError(r.error);
    setSaved(true);
    onSaved();
  });

  return (
    <div className="space-y-8">
      {header && (
        <StepHeader eyebrow={c.eyebrow} title={drafted ? c.titleDrafted : c.titleManual}><p>{drafted ? c.introDrafted : c.introManual}</p></StepHeader>
      )}
      {missingFromDraft.length > 0 && <Alert tone="info">{c.siteMissing(missingFromDraft.join("; "))}</Alert>}

      <Section title={c.who}>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField label={c.name} required value={form.name} onChange={(v) => set({ name: v })} invalid={!form.name.trim()} />
          <TextField label={c.owner} required value={form.owner} onChange={(v) => set({ owner: v })} hint={c.ownerHint} />
          <TextField label={c.team} value={form.team} onChange={(v) => set({ team: v })} placeholder={ex(c.teamEx)} hint={c.teamHint} />
          <TextField label={c.instagram} value={form.instagram} onChange={(v) => set({ instagram: v })} placeholder="@" />
          <TextField label={c.city} value={form.city} onChange={(v) => set({ city: v })} placeholder={c.cityEmpty} />
          <ListField label={c.localCities} values={form.localCities} onChange={(v) => set({ localCities: v })} placeholder={ex(c.localCitiesEx)} hint={c.localCitiesHint} />
        </div>
        <TextField label={c.oneLine} value={form.marketContext} onChange={(v) => set({ marketContext: v })} placeholder={ex(c.oneLineEx)} />
        <TextField label={c.about} required multiline rows={5} value={form.about} onChange={(v) => set({ about: v })} invalid={!form.about.trim()} hint={c.aboutHint} />
        <details className="group rounded-xl bg-background/60 px-4 py-3" open={Boolean(form.brief)}>
          <summary className="cursor-pointer text-sm font-medium">{c.briefSummary} <span className="font-normal text-muted-foreground">{c.briefOptional}</span></summary>
          <div className="mt-4"><TextField label={c.brief} multiline rows={10} value={form.brief} onChange={(v) => set({ brief: v })} hint={c.briefHint} /></div>
        </details>
      </Section>

      <Section title={c.sells}>
        <ListField label={c.services} values={form.services} onChange={(v) => set({ services: v })} placeholder={ex(c.servicesEx)} hint={c.servicesHint} />
        <PackagesField packages={form.packages} currency={form.currency} onChange={(packages) => set({ packages })} />
      </Section>

      <Section title={c.localeTitle}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label htmlFor="language" className="block font-mono text-[11px] uppercase text-muted-foreground">{c.language}</label>
            <select id="language" value={form.language} onChange={(e) => set({ language: e.target.value as "es" | "en" })} className={cn(control, "h-10")}>
              <option value="es">{t.lang.es}</option><option value="en">{t.lang.en}</option>
            </select>
          </div>
          <TextField label={c.format} value={form.locale} onChange={(v) => set({ locale: v })} hint={c.formatHint} />
          <TextField label={c.currency} value={form.currency} onChange={(v) => set({ currency: v.toUpperCase().slice(0, 3) })} hint={c.currencyHint} />
          <TextField label={c.timeZone} value={form.timeZone} onChange={(v) => set({ timeZone: v })} />
        </div>
      </Section>

      <details className="rounded-2xl bg-card/60 px-5 py-4 md:px-7">
        <summary className="cursor-pointer text-sm font-medium">{c.measurement} <span className="font-normal text-muted-foreground">{c.measurementHint}</span></summary>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <ListField label={c.brandTerms} values={form.brandTerms} onChange={(v) => set({ brandTerms: v })} hint={c.brandTermsHint} />
          <ListField label={c.keyPaths} values={form.keyPaths} onChange={(v) => set({ keyPaths: v.map((p) => (p.startsWith("/") ? p : `/${p}`)) })} hint={c.keyPathsHint} />
        </div>
      </details>

      {error && <Alert>{error}</Alert>}
      {saved && !error && <Alert tone="good">{t.common.saved}</Alert>}
      <div className="flex items-center justify-between gap-4">
        {onBack ? <Button variant="quiet" onClick={onBack}>{t.common.back}</Button> : <span />}
        <div className="flex items-center gap-3">
          {missing.length > 0 && <p className="hidden text-xs text-muted-foreground sm:block">{t.common.missing(missing.join(", "))}</p>}
          <Button onClick={save} pending={pending} disabled={missing.length > 0}>{saveLabel ?? t.common.saveContinue}</Button>
        </div>
      </div>
    </div>
  );
}

function PackagesField({ packages, currency, onChange }: { packages: BrandForm["packages"]; currency: string; onChange: (p: BrandForm["packages"]) => void }) {
  const t = useT();
  const c = t.setup.brand;
  const update = (i: number, patch: Partial<BrandForm["packages"][number]>) => onChange(packages.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <fieldset className="space-y-2">
      <legend className="font-mono text-[11px] uppercase text-muted-foreground">{c.packages} <span className="normal-case">{t.common.optional}</span></legend>
      <p className="text-xs text-muted-foreground">{c.packagesHint}</p>
      <ul className="space-y-2">
        {packages.map((p, i) => (
          <li key={i} className="flex gap-2">
            <input aria-label={c.packageNameLabel(i + 1)} value={p.name} onChange={(e) => update(i, { name: e.target.value })} className={cn(control, "h-10 flex-1")} placeholder={c.packageName} />
            <input aria-label={c.packagePriceLabel(i + 1, currency)} inputMode="numeric" value={p.price ?? ""} placeholder={currency}
              onChange={(e) => { const n = Number(e.target.value.replace(/[^\d.]/g, "")); update(i, { price: e.target.value.trim() && Number.isFinite(n) ? n : null }); }}
              className={cn(control, "h-10 w-36 tabular-nums")} />
            <Button variant="quiet" onClick={() => onChange(packages.filter((_, j) => j !== i))} aria-label={t.common.remove(p.name || c.package)}><X className="h-4 w-4" aria-hidden /></Button>
          </li>
        ))}
      </ul>
      <Button variant="ghost" className="h-9" onClick={() => onChange([...packages, { name: "", price: null }])}><Plus className="h-4 w-4" aria-hidden />{c.addPackage}</Button>
    </fieldset>
  );
}
