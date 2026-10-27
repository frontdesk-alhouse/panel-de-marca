/**
 * Países y ciudades hispanohablantes, para descartar ideas de otro país cuando la marca
 * no definió su propia lista (sin \b al final: la tilde no cuenta como letra para \b).
 * Solo aplica a marcas en español; en inglés no se filtra por país.
 */
const SPANISH_REGIONS: Record<string, string[]> = {
  MX: ["m[eé]xico", "cdmx", "guadalajara", "monterrey"],
  ES: ["espa[ñn]a", "madrid", "barcelona", "valencia", "sevilla", "mallorca", "bilbao"],
  AR: ["argentina", "buenos aires", "c[oó]rdoba argentina", "rosario"],
  CO: ["colombia", "bogot[aá]", "medell[ií]n", "cali\\b"],
  CL: ["chile", "santiago de chile"],
  PE: ["per[uú]", "lima\\b"],
  VE: ["venezuela", "caracas"],
  EC: ["ecuador", "quito", "guayaquil"],
  UY: ["uruguay", "montevideo"],
  PY: ["paraguay", "asunci[oó]n"],
  BO: ["bolivia", "la paz bolivia"],
  CR: ["costa rica"],
  PA: ["panam[aá]"],
  GT: ["guatemala"],
  HN: ["honduras"],
  SV: ["el salvador"],
  DO: ["dominicana", "santo domingo"],
  PR: ["puerto rico"],
  US: ["miami", "estados unidos", "usa\\b"],
};

/** Patrones de otros países para una marca en `locale` (es-MX → todos menos México). */
export function defaultExcludePatterns(locale: string): string[] {
  const [lang, region = ""] = locale.split("-");
  if (lang.toLowerCase() !== "es") return [];
  return Object.entries(SPANISH_REGIONS)
    .filter(([code]) => code !== region.toUpperCase())
    .flatMap(([, patterns]) => patterns);
}
