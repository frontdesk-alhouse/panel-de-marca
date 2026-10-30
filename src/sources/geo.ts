import { todayIso } from "@/lib/dates";
import { siteOrigin } from "@/lib/scorecard/config";
import { ws } from "@/lib/workspace/store";
import { runGeoCheck, scoredChecks } from "@/lib/geo/check";
import type { MetricRow, Source } from "./types";

/**
 * Visibilidad en IA, parte técnica: un chequeo diario y gratis de lo que ven los bots
 * de los asistentes. El reporte completo va en meta de la fila checks_total.
 */
export const geoSource: Source = {
  id: "geo",
  label: "Visibilidad en IA (chequeo técnico)",
  isConfigured: () => true, // solo necesita el dominio de la marca
  async fetchDaily(): Promise<MetricRow[]> {
    const w = ws();
    const report = await runGeoCheck({ origin: siteOrigin(), brandName: w.brand.name, services: w.services });
    const { ok, total } = scoredChecks(report);
    const date = todayIso();
    return [
      { source: "geo", metric: "checks_ok", dimKey: "", date, value: ok },
      { source: "geo", metric: "checks_total", dimKey: "", date, value: total, meta: { report } },
    ];
  },
};
