import { localeSettings } from "@/lib/workspace/store";
import type { Lead } from "./store";

/**
 * Métricas de negocio desde el CRM + gasto en anuncios. Metas y rangos: ver
 * glosario (fuentes de agencias de EE. UU./RU; no hay estudios de agencias en México).
 */
export type BizLead = Pick<Lead, "createdAt" | "stage" | "qualified" | "value" | "channel" | "proposalAt" | "closedAt" | "outcome" | "retainer" | "monthlyFee" | "company" | "contactName">;
export type BizFormat = "pct" | "mxn" | "days" | "ratio" | "number";
export type BizStatus = "good" | "watch" | "bad" | "few" | "nodata";
export interface BizMetric {
  key: string; label: string; format: BizFormat; value: number | null;
  target: string; status: BizStatus; basis: string;
}
export interface BizSpend { paidMxn: number }
export interface Business {
  windowDays: number;
  funnel: { key: string; label: string; value: number }[];
  pipeline: { open: number; raw: number; weighted: number };
  metrics: BizMetric[];
}

export const WINDOW_DAYS = 90;
/** Con menos casos que esto, una tasa no dice nada todavía: se marca «pocos datos». */
export const MIN_SAMPLE = 5;
const YEAR_DAYS = 365;
const DAY_MS = 86_400_000;
const PAID = new Set(["ads", "meta"]);
/** Probabilidad de cierre por etapa para el pipeline ponderado (convención comercial; ajustar con la tasa real). */
export const STAGE_PROBABILITY: Record<string, number> = { nuevo: 0.1, calificado: 0.25, propuesta: 0.5 };
const TARGETS = { winRate: 0.3, qualifiedRate: 0.35, cpql: 1500, roas: 5, cycleDays: 60, avgDeal: 60_000, referral: 0.33, concentration: 0.25, recurring: 0.4, cacShareOfDeal: 1 / 3 };

const since = (d: Date | null, start: number) => d !== null && d.getTime() >= start;
const ratio = (a: number, b: number) => (b > 0 ? a / b : null);
const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0);
function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
/** Mayor es mejor: bien desde la meta, vigilar desde la mitad. */
function atLeast(v: number | null, target: number): BizStatus {
  if (v === null) return "nodata";
  return v >= target ? "good" : v >= target / 2 ? "watch" : "bad";
}
/** Menor es mejor: bien hasta la meta, vigilar hasta el doble. */
function atMost(v: number | null, target: number): BizStatus {
  if (v === null) return "nodata";
  return v <= target ? "good" : v <= target * 2 ? "watch" : "bad";
}

export function computeBusiness(leads: BizLead[], spend: BizSpend, now = new Date()): Business {
  const start = now.getTime() - WINDOW_DAYS * DAY_MS;
  const yearStart = now.getTime() - YEAR_DAYS * DAY_MS;
  const created = leads.filter((l) => since(l.createdAt, start));
  const qualified = created.filter((l) => l.qualified === true);
  const withProposal = created.filter((l) => l.proposalAt !== null);
  const won = leads.filter((l) => l.outcome === "ganado" && since(l.closedAt, start));
  const lost = leads.filter((l) => l.outcome === "perdido" && since(l.closedAt, start));
  const closedWithProposal = [...won, ...lost].filter((l) => l.proposalAt !== null);
  const wonValues = won.flatMap((l) => (l.value ? [l.value] : []));
  const cycles = won.flatMap((l) => (l.closedAt ? [(l.closedAt.getTime() - l.createdAt.getTime()) / DAY_MS] : []));

  const paidQualified = qualified.filter((l) => PAID.has(l.channel));
  const paidWon = won.filter((l) => PAID.has(l.channel));
  const paidWonValue = sum(paidWon.map((l) => l.value ?? 0));
  const hasSpend = spend.paidMxn > 0;

  const yearWon = leads.filter((l) => l.outcome === "ganado" && since(l.closedAt, yearStart));
  const byClient = new Map<string, number>();
  for (const l of yearWon) {
    const k = (l.company ?? l.contactName ?? "sin nombre").trim().toLowerCase();
    byClient.set(k, (byClient.get(k) ?? 0) + (l.value ?? 0));
  }
  const yearValue = sum([...byClient.values()]);
  const topClient = Math.max(0, ...byClient.values());
  const mrr = sum(leads.filter((l) => l.retainer && l.outcome === "ganado").map((l) => l.monthlyFee ?? 0));
  const monthlyProjects = sum(yearWon.filter((l) => !l.retainer).map((l) => l.value ?? 0)) / 12;

  const open = leads.filter((l) => l.stage in STAGE_PROBABILITY);
  const avgDeal = wonValues.length ? sum(wonValues) / wonValues.length : null;
  const cac = hasSpend && paidWon.length ? spend.paidMxn / paidWon.length : null;
  const cacTarget = avgDeal ? avgDeal * TARGETS.cacShareOfDeal : null;
  const winRate = ratio(won.length, won.length + lost.length);
  const cycle = median(cycles);
  const n = (x: number, what: string) => `${x} ${what}`;

  const metrics: BizMetric[] = [
    { key: "qualified_rate", label: "Leads calificados", format: "pct", value: ratio(qualified.length, created.length), target: "≥ 35 %", status: atLeast(ratio(qualified.length, created.length), TARGETS.qualifiedRate), basis: n(created.length, "leads en 90 días") },
    { key: "cost_per_qualified_lead", label: "Costo por lead calificado", format: "mxn", value: hasSpend ? ratio(spend.paidMxn, paidQualified.length) : null, target: "≤ $1,500", status: atMost(hasSpend ? ratio(spend.paidMxn, paidQualified.length) : null, TARGETS.cpql), basis: n(paidQualified.length, "calificados de anuncios") },
    { key: "win_rate", label: "Win rate", format: "pct", value: winRate, target: "≥ 30 %", status: atLeast(winRate, TARGETS.winRate), basis: n(won.length + lost.length, "cerrados o perdidos") },
    { key: "proposal_win_rate", label: "Propuestas ganadas", format: "pct", value: ratio(closedWithProposal.filter((l) => l.outcome === "ganado").length, closedWithProposal.length), target: "≥ 35 %", status: atLeast(ratio(closedWithProposal.filter((l) => l.outcome === "ganado").length, closedWithProposal.length), 0.35), basis: n(closedWithProposal.length, "propuestas resueltas") },
    { key: "avg_deal", label: "Ticket promedio", format: "mxn", value: avgDeal, target: "≥ $60,000", status: atLeast(avgDeal, TARGETS.avgDeal), basis: n(wonValues.length, "cierres con valor") },
    { key: "sales_cycle", label: "Ciclo de venta", format: "days", value: cycle, target: "≤ 60 días", status: atMost(cycle, TARGETS.cycleDays), basis: n(cycles.length, "cierres") },
    { key: "cac", label: "CAC de anuncios", format: "mxn", value: cac, target: cacTarget ? `≤ ⅓ del ticket (${Math.round(cacTarget).toLocaleString(localeSettings().locale)})` : "≤ ⅓ del ticket", status: cacTarget ? atMost(cac, cacTarget) : cac === null ? "nodata" : "watch", basis: n(paidWon.length, "clientes de anuncios") },
    { key: "roas", label: "ROAS", format: "ratio", value: hasSpend ? paidWonValue / spend.paidMxn : null, target: "≥ 5×", status: atLeast(hasSpend ? paidWonValue / spend.paidMxn : null, TARGETS.roas), basis: `${Math.round(spend.paidMxn).toLocaleString(localeSettings().locale)} invertidos` },
    { key: "referral_rate", label: "Clientes por recomendación", format: "pct", value: ratio(yearWon.filter((l) => l.channel === "referido").length, yearWon.length), target: "≈ 33 %", status: atLeast(ratio(yearWon.filter((l) => l.channel === "referido").length, yearWon.length), TARGETS.referral), basis: n(yearWon.length, "clientes en 12 meses") },
    { key: "client_concentration", label: "Peso del cliente más grande", format: "pct", value: ratio(topClient, yearValue), target: "≤ 25 %", status: atMost(ratio(topClient, yearValue), TARGETS.concentration), basis: n(byClient.size, "clientes en 12 meses") },
    { key: "recurring_share", label: "Ingreso recurrente", format: "pct", value: mrr + monthlyProjects > 0 ? mrr / (mrr + monthlyProjects) : null, target: "40–60 %", status: atLeast(mrr + monthlyProjects > 0 ? mrr / (mrr + monthlyProjects) : null, TARGETS.recurring), basis: `${Math.round(mrr).toLocaleString(localeSettings().locale)} al mes en igualas` },
  ];

  const samples: Record<string, number> = {
    qualified_rate: created.length, cost_per_qualified_lead: paidQualified.length, win_rate: won.length + lost.length,
    proposal_win_rate: closedWithProposal.length, avg_deal: wonValues.length, sales_cycle: cycles.length, cac: paidWon.length,
    referral_rate: yearWon.length, client_concentration: byClient.size,
  };
  const checked = metrics.map((m) => (m.value !== null && (samples[m.key] ?? MIN_SAMPLE) < MIN_SAMPLE ? { ...m, status: "few" as const } : m));

  return {
    windowDays: WINDOW_DAYS,
    funnel: [
      { key: "leads", label: "Leads", value: created.length },
      { key: "qualified", label: "Calificados", value: qualified.length },
      { key: "proposal", label: "Con propuesta", value: withProposal.length },
      { key: "won", label: "Clientes", value: created.filter((l) => l.outcome === "ganado").length },
    ],
    pipeline: { open: open.length, raw: sum(open.map((l) => l.value ?? 0)), weighted: sum(open.map((l) => (l.value ?? 0) * STAGE_PROBABILITY[l.stage])) },
    metrics: checked,
  };
}
