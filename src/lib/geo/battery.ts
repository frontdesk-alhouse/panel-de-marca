/**
 * Batería mínima de consultas para medir citación a mano (método del skill seo-geo:
 * mismas consultas, 3 corridas por asistente, en sesión limpia). Sale de la marca y
 * sus servicios; el skill tiene la batería completa por vertical.
 */
export interface BatteryQuery { id: string; type: "local" | "comparativa" | "marca"; text: string }

export function buildBattery(brand: { name: string; city: string }, services: readonly string[], competitors: readonly string[] = []): BatteryQuery[] {
  const top = services.slice(0, 3);
  const out: BatteryQuery[] = [];
  top.forEach((s) => {
    const what = s.charAt(0).toLowerCase() + s.slice(1);
    out.push({ id: "", type: "local", text: `¿A quién me recomiendas para ${what} en ${brand.city}?` });
    out.push({ id: "", type: "local", text: `¿Cuáles son las mejores opciones de ${what} en ${brand.city}? Dime por qué` });
  });
  if (competitors[0]) out.push({ id: "", type: "comparativa", text: `${brand.name} o ${competitors[0]}: ¿cuál conviene más y por qué?` });
  out.push({ id: "", type: "marca", text: `¿Qué sabes de ${brand.name}? ¿Es confiable?` });
  out.push({ id: "", type: "marca", text: `¿Qué hace ${brand.name} y cuánto cuesta?` });
  return out.map((q, i) => ({ ...q, id: `Q-${String(i + 1).padStart(2, "0")}` }));
}
