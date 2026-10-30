"use client";

import { useT } from "@/i18n/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BrandForm } from "@/lib/briefing/brand-form";
import type { IntegrationState } from "@/lib/integrations/status";
import type { CompetitorInput } from "@/lib/workspace/schema";
import { cn } from "@/lib/utils";
import { BrandStep } from "./BrandStep";
import { MarketStep } from "./MarketStep";
import { ConnectionsStep } from "./ConnectionsStep";

const TABS = ["conexiones", "marca", "mercado"] as const;
type Tab = (typeof TABS)[number];

/** /ajustes: conexiones, ficha de marca y mercado, con las mismas piezas que la configuración inicial. */
export function SettingsView({ form: initialForm, competitors: initialCompetitors, states, hasApify, googleResult, initialTab = "conexiones", status }: {
  form: BrandForm; competitors: CompetitorInput[]; states: IntegrationState[]; hasApify: boolean; googleResult: string | null; initialTab?: Tab;
  /** Qué está conectado (se arma en el servidor): va justo debajo del título. */
  status?: React.ReactNode;
}) {
  const router = useRouter();
  const t = useT();
  const c = t.setup.settings;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [form, setForm] = useState(initialForm);
  const [competitors, setCompetitors] = useState(initialCompetitors);
  const [connStates, setConnStates] = useState(states);
  const saved = () => router.refresh();
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="font-display text-4xl">{c.title}</h1>
          <p className="text-sm text-muted-foreground">{c.intro}</p>
        </div>
        <Link href="/setup?paso=sitio" className="text-sm underline underline-offset-2">{c.redo}</Link>
      </header>
      {status}
      <div role="tablist" aria-label={c.tabsLabel} className="inline-flex gap-1 rounded-xl bg-card p-1">
        {TABS.map((id, i) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} aria-controls={`panel-${id}`} id={`tab-${id}`} onClick={() => setTab(id)}
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(e) => {
              // Patrón de pestañas: flechas, Inicio y Fin mueven y seleccionan.
              const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : -1;
              if (next < 0) return;
              e.preventDefault();
              setTab(TABS[next]);
              document.getElementById(`tab-${TABS[next]}`)?.focus();
            }}
            className={cn("h-9 rounded-lg px-4 text-sm transition", tab === id ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground")}>
            {c.tabs[id]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0} className="focus-visible:outline-none">
        {tab === "conexiones" && <ConnectionsStep header={false} states={connStates} onStates={setConnStates} googleResult={googleResult} back="/ajustes" />}
        {tab === "marca" && <BrandStep header={false} form={form} onChange={setForm} drafted={false} onSaved={saved} saveLabel={t.common.save} />}
        {tab === "mercado" && <MarketStep header={false} form={form} onChange={setForm} competitors={competitors} onCompetitors={setCompetitors} hasApify={hasApify} onSaved={saved} saveLabel={t.common.save} />}
      </div>
    </div>
  );
}
