import { breakdown, totals, type BreakdownRow } from "../query";
import { rankInsights, safeDiv, type Insight } from "../insights";
import { formatPct } from "@/lib/format";
import { label as channelLabel } from "../labels";
import type { Period } from "../period";

const M = ["sessions", "rage_sessions", "dead_sessions", "quickback_sessions", "excessive_scroll_sessions", "error_click_sessions", "scroll_weighted", "active_time_s"];
/** Páginas con menos sesiones que esto no generan hallazgos (ruido). */
const MIN_PAGE_SESSIONS = 20;

/** Umbrales prácticos de fricción (proporción de sesiones). */
export const FRICTION_LIMITS = { rage: 0.03, dead: 0.1, quickback: 0.08, excessive: 0.05, scrollLow: 0.4 } as const;

export interface BehaviorRow {
  key: string; sessions: number; scroll: number | null; activeSeconds: number | null;
  rage: number | null; dead: number | null; quickback: number | null; excessive: number | null; errors: number | null;
}

export function toBehavior(key: string, v: Record<string, number | undefined>): BehaviorRow {
  const s = v.sessions ?? 0;
  const r = (m: string) => safeDiv(v[m], s);
  return { key, sessions: s, scroll: r("scroll_weighted"), activeSeconds: r("active_time_s"), rage: r("rage_sessions"), dead: r("dead_sessions"), quickback: r("quickback_sessions"), excessive: r("excessive_scroll_sessions"), errors: r("error_click_sessions") };
}

const rows = (list: BreakdownRow[]) => list.map((r) => toBehavior(r.key, r.cur)).sort((a, b) => b.sessions - a.sessions);

/** Lo que Clarity ve: scroll, tiempo activo y fricción, en total, por página, dispositivo y canal. */
export async function loadBehavior(p: Period) {
  const [tot, prev, pages, devices, channels] = await Promise.all([
    totals("clarity", M, p.current), totals("clarity", M, p.previous),
    breakdown("clarity", "url", M, p.current, p.previous),
    breakdown("clarity", "device", M, p.current, p.previous),
    breakdown("clarity", "channel", M, p.current, p.previous),
  ]);
  const connected = (tot.sessions ?? 0) > 0;
  const total = toBehavior("total", tot);
  const before = toBehavior("prev", prev);
  const byPage = rows(pages), byDevice = rows(devices), byChannel = rows(channels);
  return { connected, total, before, byPage, byDevice, byChannel, insights: behaviorInsights(total, byPage, byDevice, byChannel) };
}

export function behaviorInsights(total: BehaviorRow, pages: BehaviorRow[], devices: BehaviorRow[], channels: BehaviorRow[]): Insight[] {
  const out: Insight[] = [];
  if (!total.sessions) return out;
  const L = FRICTION_LIMITS;
  const worst = (k: keyof BehaviorRow) => pages.filter((p) => p.sessions >= MIN_PAGE_SESSIONS && typeof p[k] === "number").sort((a, b) => (b[k] as number) - (a[k] as number))[0];

  const rage = worst("rage");
  if (rage && (rage.rage ?? 0) > L.rage) out.push({ tone: "bad", weight: 3, anchor: "paginas", title: `En ${rage.key}, ${formatPct(rage.rage!, 0)} de las visitas hacen clics de frustración.`, detail: "Rage clicks = varios clics seguidos en el mismo lugar. Algo no responde o tarda: revisa botones, el formulario y carruseles de esa página en las grabaciones de Clarity." });
  const dead = worst("dead");
  if (dead && (dead.dead ?? 0) > L.dead) out.push({ tone: "watch", weight: 2, anchor: "paginas", title: `En ${dead.key}, ${formatPct(dead.dead!, 0)} de las visitas hacen clic en algo que no hace nada.`, detail: "Dead clicks = clic sin respuesta. La gente cree que una imagen, tarjeta o texto es un link. Hazlo link o quita la apariencia de botón." });
  const qb = worst("quickback");
  if (qb && (qb.quickback ?? 0) > L.quickback) out.push({ tone: "watch", weight: 2, anchor: "paginas", title: `En ${qb.key}, ${formatPct(qb.quickback!, 0)} de las visitas se regresan casi de inmediato.`, detail: "Quickback = entran y se regresan en segundos. La página no era lo que esperaban del link o del anuncio: alinea el título con lo que prometió." });
  const lowScroll = pages.filter((p) => p.sessions >= MIN_PAGE_SESSIONS && p.scroll !== null && p.scroll < L.scrollLow).sort((a, b) => b.sessions - a.sessions)[0];
  if (lowScroll) out.push({ tone: "watch", weight: 2, anchor: "paginas", title: `En ${lowScroll.key} la gente solo baja ${formatPct(lowScroll.scroll!, 0)} de la página.`, detail: "Lo que está abajo (casos, servicios, botón de contacto) casi nadie lo ve. Sube lo importante o haz el inicio más claro." });

  const mobile = devices.find((d) => /mobile|móvil|phone/i.test(d.key));
  const desktop = devices.find((d) => /pc|desktop|escritorio/i.test(d.key));
  if (mobile && desktop && mobile.sessions >= MIN_PAGE_SESSIONS && (mobile.rage ?? 0) > (desktop.rage ?? 0) * 2 && (mobile.rage ?? 0) > L.rage)
    out.push({ tone: "bad", weight: 2, anchor: "dispositivos", title: `En celular hay el doble de frustración que en computadora (${formatPct(mobile.rage!, 0)} vs ${formatPct(desktop.rage ?? 0, 0)}).`, detail: "Revisa tamaños de botones y menús en celular: es donde llega la mayoría." });

  const paid = channels.find((c) => /paid|pagad/i.test(c.key));
  const organic = channels.find((c) => /organic|orgán/i.test(c.key));
  if (paid && organic && paid.sessions >= MIN_PAGE_SESSIONS && organic.sessions >= MIN_PAGE_SESSIONS && paid.quickback !== null && organic.quickback !== null && paid.quickback > organic.quickback * 1.5)
    out.push({ tone: "watch", weight: 2, anchor: "canales", title: `Quien llega por anuncio se regresa más rápido (${formatPct(paid.quickback, 0)} vs ${formatPct(organic.quickback, 0)} orgánico).`, detail: `El anuncio promete algo distinto a lo que muestra la página. Revisa la página de llegada de ${channelLabel(paid.key.replace(/([a-z])([A-Z])/g, "$1 $2"))}.` });

  if (!out.length) out.push({ tone: "good", anchor: "paginas", title: "Sin focos rojos de fricción en las páginas con más visitas." });
  return rankInsights(out);
}
