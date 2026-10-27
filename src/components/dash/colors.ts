/** Color fijo por entidad: un canal conserva su color aunque cambie el filtro. */
const CHANNEL_SLOTS: Record<string, string> = {
  "Paid Search": "var(--series-1)",
  "Direct": "var(--series-2)",
  "Organic Search": "var(--series-3)",
  "Organic Social": "var(--series-4)",
  "Referral": "var(--series-5)",
  "Paid Social": "var(--series-6)",
};
const FALLBACK = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)", "var(--series-6)"];

export function seriesColor(key: string, index: number): string {
  if (key === "Otros") return "var(--series-other)";
  return CHANNEL_SLOTS[key] ?? FALLBACK[index % FALLBACK.length];
}

export { CHANNEL_LABELS, label } from "@/lib/analytics/labels";
