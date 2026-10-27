import { and, desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { contentIdeas } from "@/db/schema";
import { addDays } from "@/lib/dates";
import { formatNumber } from "@/lib/format";
import { INTENT_LABELS, type Intent } from "@/lib/ideas/intent";
import { isBrandQuery } from "@/lib/scorecard/inputs";
import { breakdown } from "../query";
import { rankInsights, type Insight } from "../insights";
import type { Period } from "../period";

/** Una búsqueda sigue «activa» si el autocompletado la mostró en las últimas dos semanas. */
const ACTIVE_DAYS = 14;
const REDDIT_DAYS = 45;

export interface SearchIdea {
  text: string;
  intent: Intent;
  bestRank: number;
  timesSeen: number;
  firstSeen: string;
  score: number;
  isNew: boolean;
  /** Ya apareces en Google para esta búsqueda (Search Console) */
  covered: boolean;
}

/** Popularidad aproximada: lugar en el autocompletado × días que sigue apareciendo. */
const scoreOf = (rank: number, times: number) => (11 - Math.min(rank, 10)) * Math.log2(1 + times);

/** Ángulo editorial sugerido por intención: cómo convertir la búsqueda en artículo. */
export const ANGLE: Record<Intent, string> = {
  precio: "Responde con rangos reales y qué incluye cada uno. Publicar precios es una ventaja que casi nadie tiene.",
  dudas: "Explícalo simple y con ejemplos de tus casos; cierra con cuándo conviene contratarlo.",
  comparativa: "Da criterios para elegir (no un ranking vacío) y muestra cómo trabajas tú frente a esos criterios.",
  quejas: "Nombra el problema sin rodeos, cómo evitarlo y cómo lo resuelve tu proceso.",
  local: "Página o artículo para esa ciudad con casos y datos locales.",
  ia: "Toma postura: qué sí resuelve la IA, qué no, y dónde hace falta criterio de marca. Muestra un antes y después real; es el tema que más dudas genera hoy.",
  general: "Úsala como tema de apoyo o para enlazar desde otros artículos.",
};

export async function loadIdeas(p: Period) {
  const db = await getDb();
  const activeFrom = addDays(p.current.to, -ACTIVE_DAYS);
  const [searchRows, redditRows, compRows, gscQueries] = await Promise.all([
    db.select().from(contentIdeas).where(and(eq(contentIdeas.source, "autocomplete"), gte(contentIdeas.lastSeen, activeFrom))),
    db.select().from(contentIdeas).where(and(eq(contentIdeas.source, "reddit"), gte(contentIdeas.lastSeen, addDays(p.current.to, -REDDIT_DAYS)))).orderBy(desc(contentIdeas.lastSeen)),
    db.select().from(contentIdeas).where(eq(contentIdeas.source, "competitor")).orderBy(desc(contentIdeas.firstSeen)),
    breakdown("gsc", "query", ["impressions"], { from: addDays(p.current.to, -89), to: p.current.to }, p.previous),
  ]);

  const firstCollection = searchRows.length ? searchRows.reduce((m, r) => (r.firstSeen < m ? r.firstSeen : m), searchRows[0].firstSeen) : null;
  const covered = new Set(gscQueries.filter((q) => (q.cur.impressions ?? 0) > 0).map((q) => q.key.toLowerCase()));

  const searches: SearchIdea[] = searchRows.map((r) => ({
    text: r.text, intent: r.intent, bestRank: r.bestRank, timesSeen: r.timesSeen, firstSeen: r.firstSeen,
    score: scoreOf(r.bestRank, r.timesSeen),
    // El primer día todo es «nuevo»; lo nuevo cuenta a partir de la segunda recolección.
    isNew: r.firstSeen >= p.current.from && r.firstSeen !== firstCollection,
    covered: covered.has(r.text.toLowerCase()),
  })).filter((s) => !isBrandQuery(`query:${s.text}`)).sort((a, b) => b.score - a.score);

  const byIntent = (Object.keys(INTENT_LABELS) as Intent[]).map((intent) => ({ intent, count: searches.filter((s) => s.intent === intent).length }))
    .filter((x) => x.count > 0).sort((a, b) => b.count - a.count);

  const reddit = redditRows.map((r) => {
    const m = (r.meta ?? {}) as { score?: number; comments?: number; subreddit?: string; published?: string };
    return { text: r.text, url: r.url, intent: r.intent, subreddit: m.subreddit ?? r.seed, score: m.score ?? null, comments: m.comments ?? null, published: m.published?.slice(0, 10) ?? r.firstSeen };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || b.published.localeCompare(a.published));

  const competitorCounts = new Map<string, number>();
  for (const r of compRows) competitorCounts.set(r.seed, (competitorCounts.get(r.seed) ?? 0) + 1);
  const competitor = compRows.map((r) => ({ name: r.seed, title: r.text, url: r.url, firstSeen: r.firstSeen, isNew: r.firstSeen >= p.current.from && r.firstSeen !== firstCollection }));

  // Ideas de artículo: lo más buscado de cada intención útil donde aún no apareces.
  const suggestions = (["precio", "dudas", "comparativa", "quejas", "local"] as Intent[]).flatMap((intent) =>
    searches.filter((s) => s.intent === intent && !s.covered).slice(0, 2).map((s) => ({ ...s, angle: ANGLE[intent] })),
  ).sort((a, b) => b.score - a.score);

  const insights = ideaInsights({ searches, byIntent, competitorCounts, reddit, firstCollection, isFirstDay: firstCollection === p.current.to });
  return { searches, byIntent, reddit, competitor, competitorCounts: [...competitorCounts].sort((a, b) => b[1] - a[1]), suggestions, insights, firstCollection, hasRedditApi: Boolean(process.env.REDDIT_CLIENT_ID) };
}

function ideaInsights(d: {
  searches: SearchIdea[]; byIntent: { intent: Intent; count: number }[]; competitorCounts: Map<string, number>;
  reddit: { intent: Intent }[]; firstCollection: string | null; isFirstDay: boolean;
}): Insight[] {
  const out: Insight[] = [];
  if (!d.searches.length) return [{ tone: "watch", anchor: "busquedas", title: "Todavía no hay búsquedas recolectadas.", detail: "Se recolectan cada día; mañana aparecerán aquí." }];

  const top = d.byIntent.filter((x) => x.intent !== "general")[0];
  if (top) out.push({ tone: "watch", weight: 3, anchor: "temas", title: `Lo que más se busca alrededor de tus servicios son ${INTENT_LABELS[top.intent].toLowerCase()} (${formatNumber(top.count)} búsquedas distintas).`, detail: ANGLE[top.intent] });

  const price = d.searches.filter((s) => s.intent === "precio");
  if (price.length) out.push({ tone: "good", weight: 3, anchor: "ideas", title: `Hay ${formatNumber(price.length)} búsquedas sobre precio, y tú ya publicas precios.`, detail: `La más fuerte: «${price[0].text}». Un artículo con rangos reales te diferencia de inmediato.` });

  const uncovered = d.searches.slice(0, 30).filter((s) => !s.covered).length;
  out.push({ tone: uncovered > 20 ? "bad" : "watch", weight: 2, anchor: "busquedas", title: `De las 30 búsquedas más fuertes, no apareces en Google para ${uncovered}.`, detail: "Cada una es un artículo o página posible." });

  if (d.isFirstDay) out.push({ tone: "watch", weight: 1, anchor: "busquedas", title: "Hoy fue la primera recolección.", detail: "A partir de mañana se marca lo nuevo de la semana y qué búsquedas se mantienen día con día." });
  else {
    const fresh = d.searches.filter((s) => s.isNew);
    if (fresh.length) out.push({ tone: "good", anchor: "nuevas", title: `${formatNumber(fresh.length)} búsquedas nuevas en el periodo.`, detail: `Por ejemplo «${fresh[0].text}».` });
  }

  const [leader, count] = [...d.competitorCounts].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (leader) out.push({ tone: "watch", weight: 2, anchor: "competencia", title: `${leader} tiene ${formatNumber(count ?? 0)} artículos publicados.`, detail: "Revisa sus temas para ver qué cubren que tú no; no copies, responde mejor y con tus casos." });

  const complaints = d.reddit.filter((r) => r.intent === "quejas").length;
  if (complaints) out.push({ tone: "watch", anchor: "reddit", title: `${complaints} conversaciones en Reddit son quejas sobre agencias o diseñadores.`, detail: "Son inconformidades reales que tu contenido y tu proceso pueden resolver." });
  return rankInsights(out);
}
