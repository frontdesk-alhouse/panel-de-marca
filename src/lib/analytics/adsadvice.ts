import { localeSettings } from "@/lib/workspace/store";
/**
 * Recomendaciones por campaña de Google Ads: esperar, mantener, ajustar, escalar o
 * pausar. Base: Google pide dejar calibrar la puja automática ~50 conversiones o
 * 2-3 ciclos de conversión, y cada cambio grande reinicia ese aprendizaje
 * (support.google.com/google-ads/answer/13020501). El resto son umbrales prácticos.
 */
export const ADS_RULES = {
  /** Días típicos entre el clic y el lead en servicios de marca (ajustable). */
  conversionCycleDays: 14,
  learningCycles: 2,
  learningConversions: 50,
  /** Menos clics que esto (y pocos leads): el costo por lead aún no dice nada. */
  minClicksToJudge: 100,
  /** Con estos leads ya se puede juzgar aunque haya pocos clics. */
  minConversionsToJudge: 3,
  /** Gastar este múltiplo del CPL objetivo sin un lead = no está funcionando. */
  zeroLeadSpendMultiple: 3,
  /** CPL arriba de este múltiplo del objetivo = ajustar. */
  highCplMultiple: 2,
  /** Subir presupuesto de a poco para no reiniciar el aprendizaje. */
  scaleStepPct: 20,
  /** CPL provisional mientras no haya uno en la configuración (moneda de la cuenta). */
  defaultCplMxn: 1000,
} as const;

export type Verdict = "esperar" | "mantener" | "ajustar" | "escalar" | "pausar" | "medir" | "pausada";

export interface CampaignStats {
  name: string;
  status: string | null;
  reasons: string[];
  bidding: string | null;
  startDate: string | null;
  budgetMxn: number | null;
  cost: number; clicks: number; impressions: number; conversions: number;
  impressionShare: number | null;
}

export interface Advice { verdict: Verdict; title: string; detail: string; until?: string }

const fmt = (v: number) => `$${Math.round(v).toLocaleString(localeSettings().locale)}`;
const addDays = (iso: string, d: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + d * 86_400_000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export function adviseCampaign(c: CampaignStats, opts: { today: string; cplTarget: number | null; accountHasConversions: boolean }): Advice {
  const cpl = opts.cplTarget ?? ADS_RULES.defaultCplMxn;
  const target = opts.cplTarget ? `tu objetivo de ${fmt(cpl)}` : `un costo por lead provisional de ${fmt(cpl)}`;
  if (c.status === "PAUSED") return { verdict: "pausada", title: "Campaña pausada.", detail: "No está gastando." };

  if (!opts.accountHasConversions && c.cost > 0) {
    return { verdict: "medir", title: "Primero hay que medir los leads en Google Ads.",
      detail: "La cuenta no registra conversiones, así que Google no sabe qué clic trae un cliente y no puede optimizar. Importa el evento generate_lead de GA4 como conversión (Google Ads → Objetivos → Conversiones → Importar → Google Analytics 4)." };
  }

  const learningDays = ADS_RULES.conversionCycleDays * ADS_RULES.learningCycles;
  const age = c.startDate ? daysBetween(c.startDate, opts.today) : null;
  const learningFlag = c.reasons.some((r) => /LEARNING/.test(r));
  if (learningFlag || (age !== null && age < learningDays && c.conversions < ADS_RULES.learningConversions)) {
    const until = c.startDate ? addDays(c.startDate, learningDays) : addDays(opts.today, ADS_RULES.conversionCycleDays);
    return { verdict: "esperar", until, title: `En aprendizaje: no la toques hasta el ${until}.`,
      detail: "Google necesita unas 50 conversiones o 2-3 ciclos de conversión para calibrar la puja. Cambiar presupuesto, estrategia u objetivo ahora reinicia el aprendizaje." };
  }

  if (c.clicks < ADS_RULES.minClicksToJudge && c.conversions < ADS_RULES.minConversionsToJudge) {
    const missing = ADS_RULES.minClicksToJudge - c.clicks;
    return { verdict: c.conversions === 0 && c.cost >= cpl * ADS_RULES.zeroLeadSpendMultiple ? "pausar" : "esperar",
      title: c.conversions === 0 && c.cost >= cpl * ADS_RULES.zeroLeadSpendMultiple ? `Gastó ${fmt(c.cost)} sin un lead y con pocos clics.` : `Aún pocos datos: faltan ~${missing} clics para juzgarla.`,
      detail: "Con menos de 100 clics el costo por lead cambia mucho de un día a otro. Revisa que los términos de búsqueda sean de gente que busca tus servicios." };
  }

  if (c.conversions === 0) {
    if (c.cost >= cpl * ADS_RULES.zeroLeadSpendMultiple) {
      return { verdict: "pausar", title: `Pausa o rehazla: ${fmt(c.cost)} y ${c.clicks} clics sin un solo lead.`,
        detail: `Ya gastó más de ${ADS_RULES.zeroLeadSpendMultiple} veces ${target}. Antes de volver a encenderla: limpia términos que no son tu cliente (negativos), revisa que la página de llegada responda al anuncio y que el formulario mida el envío.` };
    }
    return { verdict: "mantener", title: "Sin leads todavía, pero el gasto aún es bajo.", detail: `Vuelve a revisarla cuando llegue a ${fmt(cpl * ADS_RULES.zeroLeadSpendMultiple)} de gasto.` };
  }

  const realCpl = c.cost / c.conversions;
  if (realCpl > cpl * ADS_RULES.highCplMultiple) {
    return { verdict: "ajustar", title: `Costo por lead alto: ${fmt(realCpl)} (más del doble de ${target}).`,
      detail: `Baja el presupuesto ${ADS_RULES.scaleStepPct} % y mueve ese dinero a lo que sí convierte, agrega negativos con los términos que gastan sin leads y revisa la página de llegada.` };
  }
  if (realCpl <= cpl && c.impressionShare !== null && c.impressionShare < 0.5) {
    return { verdict: "escalar", title: `Funciona (${fmt(realCpl)} por lead) y solo apareces en el ${Math.round(c.impressionShare * 100)} % de las búsquedas.`,
      detail: `Sube el presupuesto ${ADS_RULES.scaleStepPct} % y espera ${ADS_RULES.conversionCycleDays} días antes del siguiente aumento: los saltos grandes reinician el aprendizaje.` };
  }
  return { verdict: "mantener", title: `Va bien: ${fmt(realCpl)} por lead.`, detail: "Déjala correr. Revisa términos de búsqueda cada semana." };
}

export interface TermStats { term: string; cost: number; clicks: number; conversions: number }

/** Términos que gastan sin traer leads: candidatos a palabra negativa. */
export function wastedTerms(terms: TermStats[], cplTarget: number | null, limit = 10): TermStats[] {
  const threshold = (cplTarget ?? ADS_RULES.defaultCplMxn) * 0.3;
  return terms.filter((t) => t.conversions === 0 && t.cost >= threshold).sort((a, b) => b.cost - a.cost).slice(0, limit);
}
