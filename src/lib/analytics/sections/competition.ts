import { ws } from "@/lib/workspace/store";
import { competitors } from "@/lib/scorecard/config";
import { formatNumber } from "@/lib/format";
import { latestByDim } from "../query";
import { rankInsights, type Insight } from "../insights";

export interface CompetitorRow {
  name: string; domain: string; city: string; self: boolean; date: string | null; title: string | null;
  perf?: number; seo?: number; a11y?: number; lcp?: number; pages?: number; blog?: number; schema?: number; meta?: number;
}

export interface IgCompRow { name: string; domain: string; self: boolean; handle: string; followers: number | null; posts30: number | null; avgInteractions: number | null; engagement: number | null; date: string | null }

/** Instagram de cada estudio (seguidores, constancia, engagement) con sus hallazgos. */
export async function loadIgCompetition() {
  const ig = await latestByDim("igcomp", "site");
  const rows: IgCompRow[] = competitors().filter((c) => c.instagram).map((c) => {
    const e = ig.get(c.domain);
    const v = e?.values ?? {};
    return { name: c.name, domain: c.domain, self: Boolean(c.self), handle: c.instagram!, followers: v.followers ?? null, posts30: v.posts_30d ?? null, avgInteractions: v.avg_interactions ?? null, engagement: v.engagement ?? null, date: e?.date ?? null };
  });
  return { rows, insights: igInsights(rows) };
}

export async function loadCompetition() {
  const [latest, ownSpeed] = await Promise.all([latestByDim("comp", "site"), latestByDim("psi", "mobile")]);
  const home = ownSpeed.get("/")?.values ?? {};
  const rows: CompetitorRow[] = competitors().map((c) => {
    const e = latest.get(c.domain);
    const v = e?.values ?? {};
    return {
      name: c.name, domain: c.domain, city: c.city, self: Boolean(c.self), date: e?.date ?? null,
      title: (e?.meta.has_meta_description as { title?: string } | null)?.title ?? null,
      // El sitio propio toma la velocidad de la medición diaria de PageSpeed (sección Sitio).
      perf: c.self ? home.lighthouse_performance : v.perf, seo: c.self ? home.lighthouse_seo : v.seo,
      a11y: c.self ? home.lighthouse_a11y : v.a11y, lcp: c.self ? home.lcp_ms : v.lcp_ms, pages: v.sitemap_urls, blog: v.blog_urls, schema: v.has_schema, meta: v.has_meta_description,
    };
  });
  return { rows, insights: competitionInsights(rows) };
}

function competitionInsights(rows: CompetitorRow[]): Insight[] {
  const out: Insight[] = [];
  const self = rows.find((r) => r.self);
  const others = rows.filter((r) => !r.self);
  if (!self) return out;

  const withPerf = rows.filter((r) => r.perf !== undefined).sort((a, b) => (b.perf ?? 0) - (a.perf ?? 0));
  const rank = withPerf.findIndex((r) => r.self);
  if (rank >= 0 && withPerf.length > 2) {
    const best = withPerf[0];
    out.push(rank === 0
      ? { tone: "good", anchor: "tabla", title: `Tu sitio es el más rápido de los ${withPerf.length} medidos en celular.` }
      : { tone: rank > withPerf.length / 2 ? "bad" : "watch", weight: 2, anchor: "tabla", title: `En velocidad móvil quedas ${rank + 1} de ${withPerf.length} (${formatNumber(self.perf ?? 0)} vs ${formatNumber(best.perf ?? 0)} de ${best.name}).` });
  }

  const leader = [...others].sort((a, b) => (b.blog ?? 0) - (a.blog ?? 0))[0];
  if (leader && (leader.blog ?? 0) > (self.blog ?? 0) + 5) {
    out.push({ tone: "bad", weight: 3, anchor: "tabla", title: `${leader.name} tiene ${formatNumber(leader.blog ?? 0)} artículos publicados; tú ${formatNumber(self.blog ?? 0)}.`,
      detail: "El contenido es lo que hace que Google te muestre en búsquedas que no son tu nombre. Es la brecha más grande frente a la competencia." });
  }

  const city = ws().brand.city;
  const local = others.filter((r) => r.city === city);
  for (const l of local) {
    if (l.pages === undefined || self.pages === undefined || l.pages === self.pages) continue;
    if (l.pages > self.pages) out.push({ tone: "watch", anchor: "tabla", title: `${l.name}, tu competidor en ${city}, publica ${formatNumber(l.pages ?? 0)} páginas; tú ${formatNumber(self.pages ?? 0)}.` });
    else out.push({ tone: "good", anchor: "tabla", title: `Tienes más páginas publicadas que ${l.name}, tu competidor directo en ${city} (${formatNumber(self.pages ?? 0)} vs ${formatNumber(l.pages ?? 0)}).` });
  }

  const noSchema = others.filter((r) => r.schema === 0).map((r) => r.name);
  if (self.schema === 1 && noSchema.length) out.push({ tone: "good", anchor: "tabla", title: `Tienes datos estructurados (schema); ${noSchema.join(" y ")} no.` });
  return rankInsights(out);
}

function igInsights(rows: IgCompRow[]): Insight[] {
  const out: Insight[] = [];
  const self = rows.find((r) => r.self);
  const measured = rows.filter((r) => r.followers !== null);
  if (!self || self.followers === null || measured.length < 3) return out;
  const byFollowers = [...measured].sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0));
  const leader = byFollowers[0];
  out.push({ tone: "watch", anchor: "instagram", title: `En Instagram quedas ${byFollowers.findIndex((r) => r.self) + 1} de ${measured.length} en seguidores (${formatNumber(self.followers)} vs ${formatNumber(leader.followers ?? 0)} de ${leader.name}).` });
  const byEng = measured.filter((r) => r.engagement !== null).sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0));
  const engPlace = byEng.findIndex((r) => r.self);
  if (engPlace >= 0 && byEng.length >= 3) out.push(engPlace < byEng.length / 2
    ? { tone: "good", anchor: "instagram", title: `Tu engagement en Instagram está en la mitad alta: ${engPlace + 1} de ${byEng.length}.`, detail: "Con pocos seguidores, tu contenido interesa proporcionalmente más que el de varias marcas más grandes. Lo que falta es alcance y constancia." }
    : { tone: "watch", anchor: "instagram", title: `Tu engagement en Instagram está en la mitad baja: ${engPlace + 1} de ${byEng.length}.` });
  const busiest = [...measured].sort((a, b) => (b.posts30 ?? 0) - (a.posts30 ?? 0))[0];
  if (busiest && (busiest.posts30 ?? 0) > (self.posts30 ?? 0)) out.push({ tone: "watch", anchor: "instagram", title: `${busiest.name} publicó ${busiest.posts30} veces en 30 días; tú ${self.posts30 ?? 0}.` });
  return out;
}
