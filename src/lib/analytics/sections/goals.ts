import { ws } from "@/lib/workspace/store";
import { ownTargets } from "@/lib/scorecard/config";
import { formatMoney } from "@/lib/format";
import { listLeads } from "@/lib/crm/store";
import { valueAsOf } from "../query";
import { loadCompetitorTrend } from "./comptrend";
import type { loadGoogleAds } from "./gads";
import type { loadSocial } from "./social";

type Tone = "good" | "watch" | "bad";
export interface Goal { id: string; name: string; detail: string; current: string; target: string; pct: number; tone: Tone; href: string }

const toneOf = (pct: number): Tone => (pct >= 80 ? "good" : pct >= 40 ? "watch" : "bad");
/** Metas que se miden con lo que ya trae el panel. */
const REVIEWS_GOAL = 10;
const POSTS_PER_WEEK_GOAL = 2;

/** Avance hacia metas concretas: costo por lead, fuerza SEO, Google, reseñas, Instagram y CRM. */
export async function loadGoals(gads: Awaited<ReturnType<typeof loadGoogleAds>>, social: Awaited<ReturnType<typeof loadSocial>>): Promise<Goal[]> {
  const [trend, reviews, leadRows] = await Promise.all([
    loadCompetitorTrend("mes"), valueAsOf("maps", "gbp_reviews", "9999-12-31", `site:${ws().brand.domain}`).catch(() => null), listLeads().catch(() => []),
  ]);
  const goals: Goal[] = [];

  const cplTarget = ownTargets().cplTargetMxn ?? 1000;
  if (gads.kpis.cpl !== null) {
    const pct = Math.min(100, (cplTarget / gads.kpis.cpl) * 100);
    goals.push({ id: "cpl", name: "Costo por lead en Google Ads", detail: "Entre más bajo, mejor", current: formatMoney(gads.kpis.cpl), target: formatMoney(cplTarget), pct, tone: toneOf(pct), href: "/anuncios" });
  } else if (gads.connected) {
    goals.push({ id: "cpl", name: "Costo por lead en Google Ads", detail: "Aún sin leads registrados en Google Ads", current: "—", target: formatMoney(cplTarget), pct: 0, tone: "bad", href: "/anuncios" });
  }

  const self = trend.series.find((s) => s.self);
  const leader = [...trend.series].filter((s) => !s.self && s.current?.strength != null).sort((a, b) => (b.current!.strength ?? 0) - (a.current!.strength ?? 0))[0];
  if (self?.current?.strength != null && leader?.current?.strength) {
    const pct = Math.min(100, (self.current.strength / leader.current.strength) * 100);
    goals.push({ id: "seo", name: "Fuerza SEO contra el líder", detail: `Líder: ${leader.name}`, current: String(Math.round(self.current.strength)), target: String(Math.round(leader.current.strength)), pct, tone: toneOf(pct), href: "/competencia" });
  }

  if (trend.queries.length) {
    const own = self?.domain ?? ws().brand.domain;
    const found = trend.queries.filter((q) => q.bySite[own] !== null).length;
    const pct = (found / trend.queries.length) * 100;
    goals.push({ id: "serp", name: "Búsquedas objetivo donde apareces", detail: "Top 30 de Google en celular", current: String(found), target: String(trend.queries.length), pct, tone: toneOf(pct), href: "/competencia#busquedas" });
  }

  if (reviews !== null) {
    const pct = Math.min(100, (reviews / REVIEWS_GOAL) * 100);
    goals.push({ id: "reviews", name: "Reseñas en Google Maps", detail: "Lo que más mueve tu presencia local", current: String(reviews), target: String(REVIEWS_GOAL), pct, tone: toneOf(pct), href: "/competencia#factores" });
  }

  if (social.igConnected) {
    const pct = Math.min(100, (social.k.postsPerWeek / POSTS_PER_WEEK_GOAL) * 100);
    goals.push({ id: "posts", name: "Constancia en Instagram", detail: "Publicaciones por semana", current: social.k.postsPerWeek.toFixed(1), target: String(POSTS_PER_WEEK_GOAL), pct, tone: toneOf(pct), href: "/social/instagram" });
  }

  const open = leadRows.map((r) => r.lead).filter((l) => l.stage !== "cerrado" && l.stage !== "perdido" && !l.doNotNurture);
  if (open.length) {
    const withNext = open.filter((l) => l.nextStep && l.nextStepAt).length;
    const pct = (withNext / open.length) * 100;
    goals.push({ id: "crm", name: "Prospectos con siguiente paso", detail: "Con acción y fecha definidas", current: String(withNext), target: String(open.length), pct, tone: toneOf(pct), href: "/crm" });
  }
  return goals;
}
