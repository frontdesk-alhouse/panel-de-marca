import en from "./en";
import es, { type Messages } from "./es";

export type Lang = "es" | "en";
export type { Messages };

const DICTS: Record<Lang, Messages> = { es, en };

export const messages = (lang: Lang): Messages => DICTS[lang] ?? es;

/** «en-US,en;q=0.9,es;q=0.8» → en. Sin coincidencia, español (la fuente). */
export function langFromAcceptLanguage(header: string | null): Lang {
  const first = (header ?? "").split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("en") ? "en" : "es";
}
