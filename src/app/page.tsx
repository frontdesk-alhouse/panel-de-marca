import Link from "next/link";
import { pageGate } from "@/lib/page-gate";
import { Chat } from "@/components/assistant/Chat";
import { WeeklyCard } from "@/components/assistant/WeeklyCard";
import { SUGGESTED_QUESTIONS } from "@/lib/assistant/context";
import { latestAnalysis } from "@/lib/assistant/weekly";
import { loadWeeklyMetrics } from "@/lib/analytics/sections/weekly-metrics";
import { isLocalMode } from "@/lib/mode";
import { ConnectCard } from "@/components/layout/ConnectEmptyState";
import { getMessages } from "@/i18n/server";
import { handoffFromWeekly } from "@/lib/handoff/from-panel";

export const dynamic = "force-dynamic";

/** Inicio: el chat con el analista y, al lado, el último análisis semanal. */
export default async function InicioPage({ searchParams }: { searchParams: Promise<{ q?: string; analisis?: string }> }) {
  const gate = await pageGate("Inicio");
  if (gate) return gate;
  // Local sin llave de Claude: en lugar del chat, cómo encenderlo (lo demás del panel funciona igual).
  if (isLocalMode() && !process.env.ANTHROPIC_API_KEY) {
    const t = await getMessages();
    return (
      <div className="space-y-8">
        <h1 className="font-display text-4xl">{t.connect.home}</h1>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ConnectCard connect="anthropic" heading={t.connect.askHeading} />
          <Link href="/resumen" className="block h-fit rounded-2xl bg-card p-5 text-sm hover:bg-secondary">
            <span className="font-mono text-[11px] uppercase text-muted-foreground">{t.connect.fullPanel}</span>
            <span className="mt-1 block">{t.connect.fullPanelLink}</span>
          </Link>
        </div>
      </div>
    );
  }
  const [latest] = await latestAnalysis(1).catch(() => []);
  const params = await searchParams;
  const q = params.q?.slice(0, 500);
  const metrics = latest ? await loadWeeklyMetrics(latest.range).catch((e) => { console.error("[inicio] métricas", e); return null; }) : null;
  const handoff = latest ? await handoffFromWeekly(latest.analisis, latest.range.to) : null;
  return (
    // Dos scrolls independientes: el chat se desplaza dentro de su caja y la columna derecha en la suya.
    <div className="grid gap-6 xl:h-[calc(100dvh-10rem)] xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="h-[75dvh] min-h-0 xl:h-full"><Chat suggestions={SUGGESTED_QUESTIONS} initialQuestion={q} /></div>
      <aside className="space-y-4 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
        <WeeklyCard analysis={latest ?? null} metrics={metrics} handoff={handoff} defaultOpen={params.analisis === "1"} />
        <Link href="/resumen" className="block rounded-2xl bg-card p-5 text-sm hover:bg-secondary">
          <span className="font-mono text-[11px] uppercase text-muted-foreground">Panel completo</span>
          <span className="mt-1 block">Ver el resumen con todas las gráficas →</span>
        </Link>
      </aside>
    </div>
  );
}
