import { ownTargets } from "@/lib/scorecard/config";
import { formatMoney, formatNumber, formatPct } from "@/lib/format";
import { breakdown, metaByPrefix, series, totals, valueAsOf, type SeriesPoint } from "../query";
import { rankInsights, safeDiv, type Insight } from "../insights";
import type { Period } from "../period";

const IG_DAILY = ["views", "reach", "total_interactions", "accounts_engaged", "profile_links_taps", "follows", "unfollows"];
const POST_M = ["post_reach", "post_views", "post_saved", "post_shares", "post_total_interactions", "post_likes", "post_comments"];
const META_M = ["impressions", "clicks", "spend_mxn", "leads", "conversations", "link_clicks", "landing_page_views"];
/** Frecuencia arriba de esto en 28 días = la gente ya vio demasiado el anuncio (práctica común en Meta). */
const FATIGUE_FREQUENCY = 3;
/** Publicaciones por semana debajo de esto = cuenta poco activa. */
const MIN_POSTS_PER_WEEK = 2;

export interface PostRow {
  id: string; date: string; caption: string; permalink: string | null; format: string;
  reach: number; views: number; saved: number; shares: number; interactions: number; likes: number; comments: number;
}
export interface FormatRow { format: string; posts: number; reach: number; interactions: number; saves: number; engagement: number | null }
export interface MetaCampaignRow { name: string; spend: number; clicks: number; impressions: number; leads: number; conversations: number; linkClicks: number; cpl: number | null; cpc: number | null; ctr: number | null }

/** Instagram orgánico + Meta Ads: crecimiento, qué contenido funciona y cuánto cuesta cada lead en Meta. */
export async function loadSocial(p: Period) {
  const [ig, igPrev, reachSeries, postsBreak, postMeta, followersNow, followersStart, meta, metaPrev, metaCampaigns, freq, gads] = await Promise.all([
    totals("instagram", IG_DAILY, p.current), totals("instagram", IG_DAILY, p.previous),
    series("instagram", ["reach", "total_interactions"], p.current),
    breakdown("instagram", "post", POST_M, p.current, p.previous),
    metaByPrefix("instagram", "post_published", "post"),
    valueAsOf("instagram", "followers", p.current.to), valueAsOf("instagram", "followers", p.current.from),
    totals("meta", META_M, p.current), totals("meta", META_M, p.previous),
    breakdown("meta", "campaign", META_M, p.current, p.previous),
    valueAsOf("meta", "frequency_28d", p.current.to),
    totals("gads", ["cost_mxn", "conversions"], p.current),
  ]);

  const metaByPost = new Map(postMeta.map((r) => [r.dimKey.slice(5), { date: r.date, meta: r.meta ?? {} }]));
  const posts: PostRow[] = postsBreak.map((b) => {
    const m = metaByPost.get(b.key);
    const meta = (m?.meta ?? {}) as { caption?: string; permalink?: string; format?: string };
    return {
      id: b.key, date: m?.date ?? "", caption: meta.caption ?? "", permalink: meta.permalink ?? null, format: meta.format ?? "otro",
      reach: b.cur.post_reach ?? 0, views: b.cur.post_views ?? 0, saved: b.cur.post_saved ?? 0, shares: b.cur.post_shares ?? 0,
      interactions: b.cur.post_total_interactions ?? 0, likes: b.cur.post_likes ?? 0, comments: b.cur.post_comments ?? 0,
    };
  }).sort((a, b) => b.interactions - a.interactions);

  const formats = byFormat(posts);
  const igConnected = followersNow !== null || posts.length > 0 || Object.keys(ig).length > 0;
  const metaConnected = Object.keys(meta).length > 0;
  const campaigns: MetaCampaignRow[] = metaCampaigns.map((c) => {
    const leads = (c.cur.leads ?? 0) + (c.cur.conversations ?? 0);
    return { name: c.key, spend: c.cur.spend_mxn ?? 0, clicks: c.cur.clicks ?? 0, impressions: c.cur.impressions ?? 0, leads: c.cur.leads ?? 0, conversations: c.cur.conversations ?? 0, linkClicks: c.cur.link_clicks ?? 0, cpl: safeDiv(c.cur.spend_mxn, leads), cpc: safeDiv(c.cur.spend_mxn, c.cur.link_clicks), ctr: safeDiv(c.cur.clicks, c.cur.impressions) };
  }).sort((a, b) => b.spend - a.spend);

  const metaLeads = (meta.leads ?? 0) + (meta.conversations ?? 0);
  const k: SocialKpis = {
    followers: followersNow, followersDelta: followersNow !== null && followersStart !== null ? followersNow - followersStart : null,
    reach: ig.reach ?? null, reachPrev: igPrev.reach ?? null, views: ig.views ?? null,
    interactions: ig.total_interactions ?? null, interactionsPrev: igPrev.total_interactions ?? null,
    engagement: safeDiv(ig.total_interactions, ig.reach), linkTaps: ig.profile_links_taps ?? null,
    netFollows: ig.follows !== undefined ? (ig.follows ?? 0) - (ig.unfollows ?? 0) : null,
    postsCount: posts.length, postsPerWeek: posts.length / (p.days / 7),
    metaSpend: meta.spend_mxn ?? null, metaSpendPrev: metaPrev.spend_mxn ?? null, metaLeads, metaCpl: safeDiv(meta.spend_mxn, metaLeads),
    metaCtr: safeDiv(meta.clicks, meta.impressions), metaCpc: safeDiv(meta.spend_mxn, meta.link_clicks ?? meta.clicks), metaLinkClicks: meta.link_clicks ?? null, frequency: freq,
    googleCpl: safeDiv(gads.cost_mxn, gads.conversions),
  };
  return { igConnected, metaConnected, k, reachSeries: reachSeries as SeriesPoint[], posts, formats, campaigns, insights: socialInsights(k, posts, formats, igConnected, metaConnected) };
}

export function byFormat(posts: PostRow[]): FormatRow[] {
  const map = new Map<string, FormatRow>();
  for (const p of posts) {
    const e = map.get(p.format) ?? { format: p.format, posts: 0, reach: 0, interactions: 0, saves: 0, engagement: null };
    map.set(p.format, { ...e, posts: e.posts + 1, reach: e.reach + p.reach, interactions: e.interactions + p.interactions, saves: e.saves + p.saved + p.shares });
  }
  return [...map.values()].map((f) => ({ ...f, engagement: safeDiv(f.interactions, f.reach) })).sort((a, b) => (b.engagement ?? 0) - (a.engagement ?? 0));
}

export interface SocialKpis {
  followers: number | null; followersDelta: number | null; reach: number | null; reachPrev: number | null; views: number | null;
  interactions: number | null; interactionsPrev: number | null; engagement: number | null; linkTaps: number | null; netFollows: number | null;
  postsCount: number; postsPerWeek: number;
  metaSpend: number | null; metaSpendPrev: number | null; metaLeads: number; metaCpl: number | null; metaCtr: number | null; metaCpc: number | null; metaLinkClicks: number | null;
  frequency: number | null; googleCpl: number | null;
}
type K = SocialKpis;

function socialInsights(k: K, posts: PostRow[], formats: FormatRow[], ig: boolean, meta: boolean): Insight[] {
  const out: Insight[] = [];
  if (ig) {
    if (k.postsPerWeek < MIN_POSTS_PER_WEEK) out.push({ tone: "watch", weight: 2, anchor: "publicaciones", title: `Publicas ${k.postsPerWeek.toFixed(1)} veces por semana.`, detail: "Con menos de 2 publicaciones por semana el algoritmo muestra menos tu cuenta. La constancia pesa más que el volumen." });
    const withData = formats.filter((f) => f.posts >= 2 && f.engagement !== null);
    if (withData.length >= 2) {
      const best = withData[0], worst = withData.at(-1)!;
      out.push({ tone: "good", weight: 2, anchor: "formatos", title: `Los ${best.format}s son tu mejor formato: ${formatPct(best.engagement!, 1)} de interacción contra ${formatPct(worst.engagement!, 1)} de ${worst.format}s.`, detail: "Haz más de lo que funciona y prueba cambiar el gancho de lo que no." });
    }
    const top = posts[0];
    if (top && top.interactions > 0) out.push({ tone: "good", anchor: "publicaciones", title: `Tu mejor publicación del periodo: «${top.caption.slice(0, 60) || top.format}» con ${top.interactions} interacciones.`, detail: `${top.saved} guardados y ${top.shares} compartidos. Guardar y compartir son las señales que más pesan para que Instagram la muestre a más gente.` });
    if (k.netFollows !== null) out.push(k.netFollows > 0
      ? { tone: "good", anchor: "crecimiento", title: `Ganaste ${k.netFollows} seguidores netos en el periodo.` }
      : { tone: "watch", anchor: "crecimiento", title: `Perdiste ${Math.abs(k.netFollows)} seguidores netos en el periodo.` });
    if (k.reach && k.linkTaps !== null) out.push({ tone: k.linkTaps > 0 ? "good" : "watch", anchor: "crecimiento", title: `${k.linkTaps} personas tocaron el link de tu perfil.`, detail: "Es el puente de Instagram a tu sitio y a WhatsApp. Si es bajo, menciona el link y la oferta en tus publicaciones." });
  }
  if (meta) {
    const target = ownTargets().cplTargetMxn;
    if (k.metaCpl !== null && target) out.push(k.metaCpl <= target
      ? { tone: "good", anchor: "meta", title: `En Meta cada lead cuesta ${formatMoney(k.metaCpl)}, dentro de tu objetivo de ${formatMoney(target)}.` }
      : { tone: k.metaCpl > target * 2 ? "bad" : "watch", weight: 3, anchor: "meta", title: `En Meta cada lead cuesta ${formatMoney(k.metaCpl)} (objetivo ${formatMoney(target)}).` });
    if (k.metaSpend && k.metaLeads === 0) out.push(k.metaLinkClicks
      ? { tone: "watch", weight: 2, anchor: "meta", title: `Tus promociones compraron visitas, no leads: ${formatMoney(k.metaCpc ?? 0)} por clic (${formatNumber(k.metaLinkClicks)} clics).`,
        detail: "Para conseguir prospectos en Meta usa el objetivo «Leads» o «Mensajes» (WhatsApp) en lugar de visitas al perfil; así Meta busca gente que escribe, no solo gente que da clic." }
      : { tone: "bad", weight: 3, anchor: "meta", title: `Gastaste ${formatMoney(k.metaSpend)} en Meta sin un lead ni una conversación.` });
    if (k.frequency !== null && k.frequency > FATIGUE_FREQUENCY) out.push({ tone: "watch", weight: 2, anchor: "meta", title: `Cada persona vio tus anuncios ${k.frequency.toFixed(1)} veces en 28 días.`, detail: "Arriba de 3 la gente se cansa del mismo anuncio y el costo sube. Cambia la creatividad o amplía la audiencia." });
    if (k.metaCpl !== null && k.googleCpl !== null) {
      const cheaper = k.metaCpl < k.googleCpl ? "Meta" : "Google";
      out.push({ tone: "watch", anchor: "meta", title: `${cheaper} consigue leads más baratos: Meta ${formatMoney(k.metaCpl)} vs Google ${formatMoney(k.googleCpl)}.`, detail: "Compara también cuántos de esos leads cierran en el CRM: un lead barato que no compra sale caro." });
    }
  }
  return rankInsights(out);
}
