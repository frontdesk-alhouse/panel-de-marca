import { google } from "googleapis";
import type { DateRange } from "@/lib/dates";
import { googleAuth, isGoogleConfigured } from "./google-auth";
import type { MetricRow, Source } from "./types";

const ROW_LIMIT = 25_000;

type GscRow = { keys?: string[] | null; clicks?: number | null; impressions?: number | null; position?: number | null };

function toRows(r: GscRow, date: string, dimKey: string): MetricRow[] {
  const impressions = r.impressions ?? 0;
  return [
    { source: "gsc", metric: "clicks", dimKey, date, value: r.clicks ?? 0 },
    { source: "gsc", metric: "impressions", dimKey, date, value: impressions },
    { source: "gsc", metric: "position_weighted", dimKey, date, value: (r.position ?? 0) * impressions },
  ];
}

export const gscSource: Source = {
  id: "gsc",
  label: "Search Console",
  isConfigured: () => isGoogleConfigured() && Boolean(process.env.GSC_SITE_URL),
  async fetchDaily(range: DateRange): Promise<MetricRow[]> {
    const api = google.searchconsole({ version: "v1", auth: googleAuth() });
    const siteUrl = process.env.GSC_SITE_URL as string;
    const query = (dimensions: string[]) =>
      api.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: range.from, endDate: range.to, dimensions, rowLimit: ROW_LIMIT, dataState: "final" },
      });

    // Totales + desglose por búsqueda, página, dispositivo y país.
    const BREAKDOWNS: [string, string][] = [["query", "query"], ["page", "page"], ["device", "device"], ["country", "country"]];
    const [totals, ...parts] = await Promise.all([query(["date"]), ...BREAKDOWNS.map(([dim]) => query(["date", dim]))]);
    const rows: MetricRow[] = [];
    for (const r of totals.data.rows ?? []) rows.push(...toRows(r, r.keys?.[0] ?? "", ""));
    parts.forEach((res, i) => {
      for (const r of res.data.rows ?? []) {
        const [date, value] = r.keys ?? [];
        if (date && value) rows.push(...toRows(r, date, `${BREAKDOWNS[i][1]}:${value}`));
      }
    });
    return rows;
  },
};
