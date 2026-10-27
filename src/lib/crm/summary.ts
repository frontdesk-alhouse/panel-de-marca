import type { Lead } from "./store";
import { CHANNEL_LABELS, INDUSTRY_LABELS } from "./labels";
import { isOverdue } from "./transitions";
import type { Insight } from "@/lib/analytics/insights";

export interface PipelineSummary {
  open: number; overdue: number; proposals: number; won: number; lost: number; closeRate: number | null; openValue: number;
  byStage: Record<string, number>;
}

export function summarize(leads: Lead[], today: string): PipelineSummary {
  const byStage: Record<string, number> = {};
  for (const l of leads) byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;
  const won = byStage.cerrado ?? 0, lost = byStage.perdido ?? 0;
  const openLeads = leads.filter((l) => l.stage !== "cerrado" && l.stage !== "perdido" && !l.doNotNurture);
  return {
    open: openLeads.length,
    overdue: openLeads.filter((l) => isOverdue(l.nextStepAt, l.stage, today)).length,
    proposals: byStage.propuesta ?? 0,
    won, lost,
    closeRate: won + lost ? won / (won + lost) : null,
    openValue: openLeads.reduce((s, l) => s + (l.value ?? 0), 0),
    byStage,
  };
}

/** Lectura del pipeline: vencidos, sin siguiente paso, y qué canal e industria cierran. */
export function crmInsights(leads: Lead[], today: string): Insight[] {
  const out: Insight[] = [];
  const open = leads.filter((l) => l.stage !== "cerrado" && l.stage !== "perdido" && !l.doNotNurture);
  const overdue = open.filter((l) => isOverdue(l.nextStepAt, l.stage, today));
  if (overdue.length) out.push({ tone: "bad", weight: 3, anchor: "lista", title: `${overdue.length} prospecto${overdue.length > 1 ? "s tienen" : " tiene"} el siguiente paso vencido.`, detail: overdue.slice(0, 3).map((l) => l.company ?? l.contactName).join(", ") });
  const noNext = open.filter((l) => !l.nextStep);
  if (noNext.length) out.push({ tone: "watch", weight: 2, anchor: "lista", title: `${noNext.length} prospecto${noNext.length > 1 ? "s abiertos no tienen" : " abierto no tiene"} siguiente paso.`, detail: "Un prospecto sin siguiente paso se enfría. Define qué sigue y cuándo." });

  const closed = leads.filter((l) => l.stage === "cerrado" || l.stage === "perdido");
  const rateBy = (key: (l: Lead) => string | null) => {
    const m = new Map<string, { won: number; total: number }>();
    for (const l of closed) {
      const k = key(l); if (!k) continue;
      const e = m.get(k) ?? { won: 0, total: 0 };
      e.total++; if (l.stage === "cerrado") e.won++;
      m.set(k, e);
    }
    return [...m].filter(([, e]) => e.total >= 2).sort((a, b) => b[1].won / b[1].total - a[1].won / a[1].total);
  };
  for (const { lead, inDays } of upcomingBirthdays(leads, today)) {
    out.push({ tone: "good", anchor: "lista", title: `${inDays === 0 ? "Hoy" : `En ${inDays} día${inDays > 1 ? "s" : ""}`} cumple años ${[lead.title, lead.contactName].filter(Boolean).join(" ") || lead.company}.`, detail: lead.company ?? undefined });
  }
  const ch = rateBy((l) => l.channel)[0];
  if (ch) out.push({ tone: "good", anchor: "lista", title: `${CHANNEL_LABELS[ch[0] as keyof typeof CHANNEL_LABELS]} es el canal que mejor cierra: ${ch[1].won} de ${ch[1].total}.` });
  const ind = rateBy((l) => l.industry)[0];
  if (ind) out.push({ tone: "good", anchor: "lista", title: `Cierras mejor con ${INDUSTRY_LABELS[ind[0] as keyof typeof INDUSTRY_LABELS].toLowerCase()}: ${ind[1].won} de ${ind[1].total}.` });
  return out;
}

/** Cumpleaños en los próximos `days` días (para felicitar a clientes y prospectos). */
export function upcomingBirthdays(leads: Lead[], today: string, days = 14) {
  const t = new Date(`${today}T12:00:00Z`);
  return leads.flatMap((l) => {
    if (!l.birthday || l.doNotNurture) return [];
    const [, m, d] = l.birthday.split("-").map(Number);
    let next = new Date(Date.UTC(t.getUTCFullYear(), m - 1, d, 12));
    if (next < t) next = new Date(Date.UTC(t.getUTCFullYear() + 1, m - 1, d, 12));
    const inDays = Math.round((next.getTime() - t.getTime()) / 86_400_000);
    return inDays <= days ? [{ lead: l, inDays }] : [];
  }).sort((a, b) => a.inDays - b.inDays);
}
