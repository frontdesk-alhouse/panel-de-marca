import type { DateRange } from "@/lib/dates";
import { keyPaths, siteOrigin } from "@/lib/scorecard/config";
import type { MetricRow, Source } from "./types";

const ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
// Una medición del sitio de Framer tarda ~90 s (más desde Vercel); dos en paralelo, dentro de los 300 s de la función.
const TIMEOUT_MS = 200_000;

interface CruxMetric { percentile?: number }
interface PsiResponse {
  loadingExperience?: { metrics?: Record<string, CruxMetric>; origin_fallback?: boolean };
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null }>;
    audits?: Record<string, { numericValue?: number }>;
  };
}

type Strategy = "mobile" | "desktop";
type Job = [string, Strategy];

/** Páginas que rotan, una por día, además de la Home en móvil. */
const rotation = (): Job[] => [...keyPaths().filter((p) => p !== "/").map((p): Job => [p, "mobile"]), ["/", "desktop"]];

export function rotatingJob(isoDate: string): Job {
  const day = Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);
  const jobs = rotation();
  return jobs[day % jobs.length];
}

/** Medición de una URL: campo (CrUX) si existe, si no laboratorio; la procedencia va en meta. */
export function parsePsi(json: PsiResponse, dimKey: string, date: string): MetricRow[] {
  const field = json.loadingExperience?.metrics ?? {};
  const audits = json.lighthouseResult?.audits ?? {};
  const cats = json.lighthouseResult?.categories ?? {};
  const hasField = field.LARGEST_CONTENTFUL_PAINT_MS?.percentile !== undefined;
  const origin = hasField ? (json.loadingExperience?.origin_fallback ? "origin" : "field") : "lab";
  const meta = { measurement: origin };
  const rows: MetricRow[] = [];
  const push = (metric: string, value: number | undefined) => {
    if (value !== undefined && Number.isFinite(value)) rows.push({ source: "psi", metric, dimKey, date, value, meta });
  };

  if (hasField) {
    push("lcp_ms", field.LARGEST_CONTENTFUL_PAINT_MS?.percentile);
    push("inp_ms", field.INTERACTION_TO_NEXT_PAINT?.percentile);
    const cls = field.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile;
    push("cls", cls === undefined ? undefined : cls / 100);
  } else {
    // Sin datos de usuarios reales: laboratorio. INP no existe en laboratorio.
    push("lcp_ms", audits["largest-contentful-paint"]?.numericValue);
    push("cls", audits["cumulative-layout-shift"]?.numericValue);
  }
  const score = (k: string) => (typeof cats[k]?.score === "number" ? (cats[k].score as number) * 100 : undefined);
  push("lighthouse_seo", score("seo"));
  push("lighthouse_a11y", score("accessibility"));
  push("lighthouse_performance", score("performance"));
  return rows;
}

async function run(path: string, strategy: Strategy, date: string): Promise<MetricRow[]> {
  const params = new URLSearchParams({ url: `${siteOrigin()}${path}`, strategy, key: process.env.PSI_API_KEY as string });
  for (const c of ["performance", "seo", "accessibility"]) params.append("category", c);
  const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`PageSpeed ${res.status} en ${path} (${strategy})`);
  return parsePsi((await res.json()) as PsiResponse, `${strategy}:${path}`, date);
}

export const psiSource: Source = {
  id: "psi",
  label: "PageSpeed Insights",
  isConfigured: () => Boolean(process.env.PSI_API_KEY),
  /**
   * Instantánea: mide hoy y la guarda en el último día del rango. Cada medición
   * tarda ~90 s y en paralelo se estorban, así que por corrida van dos: la Home
   * en móvil siempre y una página más que rota por día.
   */
  async fetchDaily(range: DateRange): Promise<MetricRow[]> {
    const jobs: Job[] = [["/", "mobile"], rotatingJob(range.to)];
    const results = await Promise.allSettled(jobs.map(([p, s]) => run(p, s, range.to)));
    const rows = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
    const failed = results.filter((r) => r.status === "rejected");
    if (!rows.length && failed.length) throw (failed[0] as PromiseRejectedResult).reason;
    if (failed.length) console.warn(`[psi] ${failed.length} de ${jobs.length} mediciones fallaron`);
    return rows;
  },
};
