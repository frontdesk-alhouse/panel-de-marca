import type { DateRange } from "@/lib/dates";
import { autocomplete, competitorArticles, reddit } from "@/lib/ideas/collect";
import { upsertIdeas } from "@/lib/ideas/store";
import type { MetricRow, Source } from "./types";

/** Recolecta ideas de contenido y las acumula en content_ideas; registra cuántas trajo cada fuente. */
export const ideasSource: Source = {
  id: "ideas",
  label: "Ideas de contenido",
  isConfigured: () => true,
  async fetchDaily(range: DateRange): Promise<MetricRow[]> {
    const [ac, rd, comp] = await Promise.all([autocomplete(), reddit(), competitorArticles()]);
    await upsertIdeas([...ac, ...rd, ...comp], range.to);
    return [
      { source: "ideas", metric: "collected", dimKey: "source:autocomplete", date: range.to, value: ac.length },
      { source: "ideas", metric: "collected", dimKey: "source:reddit", date: range.to, value: rd.length },
      { source: "ideas", metric: "collected", dimKey: "source:competitor", date: range.to, value: comp.length },
    ];
  },
};
