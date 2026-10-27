import { delta, ratio, sum, type AggRow, type RawWindows } from "@/lib/scorecard/raw";

export interface Kpi {
  id: string;
  label: string;
  value: number | null;
  previous: number | null;
  change: number | null;
  unit: "count" | "mxn" | "pct";
  /** Para costo, subir es malo */
  higherIsBetter: boolean;
  source: string;
}

function spend(rows: AggRow[]): number | null {
  const a = sum(rows, "gads", "cost_mxn");
  const b = sum(rows, "meta", "spend_mxn");
  return a === null && b === null ? null : (a ?? 0) + (b ?? 0);
}

function paidLeads(rows: AggRow[]): number | null {
  const a = sum(rows, "gads", "conversions");
  const b = sum(rows, "meta", "leads");
  return a === null && b === null ? null : (a ?? 0) + (b ?? 0);
}

function kpi(id: string, label: string, unit: Kpi["unit"], source: string, cur: number | null, prev: number | null, higherIsBetter = true): Kpi {
  return { id, label, unit, source, value: cur, previous: prev, change: delta(cur, prev), higherIsBetter };
}

/** KPIs de la Home: ventana actual de 28 días vs la anterior. */
export function computeKpis(w: RawWindows): Kpi[] {
  const s = (rows: AggRow[]) => sum(rows, "ga4", "sessions");
  const leads = (rows: AggRow[]) => sum(rows, "ga4", "key_events");
  const cpl = (rows: AggRow[]) => ratio(spend(rows), paidLeads(rows) || null);
  return [
    kpi("leads", "Leads del sitio", "count", "Google Analytics", leads(w.current), leads(w.previous)),
    kpi("sessions", "Sesiones", "count", "Google Analytics", s(w.current), s(w.previous)),
    kpi("organic_clicks", "Clics orgánicos", "count", "Search Console", sum(w.current, "gsc", "clicks"), sum(w.previous, "gsc", "clicks")),
    kpi("spend", "Inversión en anuncios", "mxn", "Google Ads y Meta Ads", spend(w.current), spend(w.previous), false),
    kpi("cpl", "Costo por lead pagado", "mxn", "Google Ads y Meta Ads", cpl(w.current), cpl(w.previous), false),
    kpi("followers", "Seguidores en Instagram", "count", "Instagram",
      sum(w.latest, "instagram", "followers"), sum(w.latestAtPreviousEnd, "instagram", "followers")),
  ];
}
