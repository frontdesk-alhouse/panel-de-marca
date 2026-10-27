import type { MetricDefinition, MetricStatus, Unit } from "@/lib/scorecard/types";

import { localeSettings } from "@/lib/workspace/store";

/** Formateadores por idioma y moneda de la marca; se reutilizan mientras no cambie la configuración. */
const cache = new Map<string, Intl.NumberFormat>();
function numberFormat(kind: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const { locale, currency } = localeSettings();
  const key = `${locale}|${currency}|${kind}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat(locale, options.style === "currency" ? { ...options, currency } : options);
    cache.set(key, f);
  }
  return f;
}
const nf = (digits: number) => numberFormat(`n${digits}`, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

export function formatNumber(value: number, digits = 0): string {
  return nf(digits).format(value);
}

/** Moneda de la cuenta sin centavos; con centavos si es menos de 10 (costo por clic) para no redondear 0.60 a 1. */
export function formatMoney(value: number): string {
  return Math.abs(value) < 10 && value !== 0
    ? numberFormat("money2", { style: "currency", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
    : numberFormat("money0", { style: "currency", maximumFractionDigits: 0 }).format(value);
}

/** Entero con separadores del idioma de la marca («48,750»). */
export function formatInteger(value: number): string {
  return nf(0).format(Math.round(value));
}

export function formatPct(value: number, digits = 1): string {
  return `${nf(digits).format(value * 100)} %`;
}

export function formatSignedPct(value: number): string {
  const s = formatPct(Math.abs(value), 0);
  return value > 0 ? `+${s}` : value < 0 ? `-${s}` : s;
}

const STATUS_LABEL = ["bueno", "mejorable", "malo"];

export function formatMetric(unit: Unit, value: number | null): string {
  if (value === null) return "-";
  switch (unit) {
    case "pct": return formatPct(value, value < 0.1 ? 1 : 0);
    case "delta": return formatSignedPct(value);
    case "ratio": return `${formatNumber(value * 100)} % de lo esperado`;
    case "x": return `${formatNumber(value, 2)}×`;
    case "count": return formatNumber(value);
    case "minutes": return value < 60 ? `${formatNumber(value)} min` : `${formatNumber(value / 60, 1)} h`;
    case "position": return formatNumber(value, 1);
    case "score": return formatNumber(value);
    case "status": return STATUS_LABEL[Math.round(value)] ?? "-";
  }
}

/** «Verde ≥ 4 %, amarillo ≥ 2 %» en el lenguaje de la unidad. */
export function formatBands(def: MetricDefinition): string {
  const op = def.direction === "up" ? "≥" : "≤";
  if (def.unit === "status") return "Verde si las tres métricas están en «bueno»; amarillo si alguna es «mejorable»";
  const v = (n: number) => (def.unit === "ratio" ? `${formatNumber(n * 100)} %` : formatMetric(def.unit, n));
  return `Verde ${op} ${v(def.green)}, amarillo ${op} ${v(def.yellow)}`;
}

export const STATUS_TEXT: Record<Exclude<MetricStatus, "scored">, string> = {
  no_data: "Sin datos todavía",
  insufficient: "Muestra insuficiente",
  no_reference: "Falta fijar el objetivo",
  not_tracked: "No se está midiendo",
};

/** «1 min 05 s» / «42 s» */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return "-";
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, "0")} s`;
}

export function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(d)} ${months[Number(m) - 1]}`;
}
