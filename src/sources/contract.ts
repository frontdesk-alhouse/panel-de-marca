/**
 * Contrato de métricas crudas en `metric_daily`. Cada fuente escribe estos
 * nombres; la calificación y los KPIs solo leen estos nombres. `dim_key` vacío
 * = total del día. Los promedios se guardan ponderados (valor × peso) para que
 * se puedan sumar por ventana.
 *
 * ga4        sessions, engaged_sessions, key_events          dims: "" · "channel:<Default Channel Group>"
 * gsc        clicks, impressions, position_weighted (pos×impr) dims: "" · "query:<texto>"
 * gads       impressions, clicks, cost_mxn, conversions       dims: "" · "campaign:<nombre>" · "term:<búsqueda>" (sin impressions)
 *            impression_share (0-1, diario)                  dims: "campaign:<nombre>"
 *            campaign_info (presupuesto diario; meta = estado) dims: "campaign:<nombre>"
 *            qs_weighted (QS×impr), qs_impressions            dims: ""
 *            brand_impression_share (instantánea 0-1)        dims: ""
 * meta       impressions, clicks, spend_mxn, leads, conversations (WhatsApp/DM) dims: "" · "campaign:<nombre>" (reach solo por campaña)
 *            frequency_28d (instantánea)                      dims: ""
 * instagram  followers, media_count (instantáneas)             dims: ""
 *            views, reach, total_interactions, accounts_engaged, profile_links_taps, follows, unfollows (diarias) dims: ""
 *            post_published (meta: caption, permalink, format), post_reach, post_views, post_saved, post_shares,
 *            post_total_interactions, post_likes, post_comments (acumuladas, fecha = publicación) dims: "post:<id>"
 * clarity    sessions, rage_sessions, dead_sessions,
 *            quickback_sessions, scroll_weighted (0-1 × ses), active_time_s, pages_weighted, excessive_scroll_sessions, error_click_sessions  dims: "" · "url:<ruta>" · "device:<x>" · "channel:<x>"
 * gbp        views, calls, website_clicks, directions         dims: ""
 * comp       perf, seo, a11y, lcp_ms, sitemap_urls, blog_urls,
 *            has_schema, has_meta_description, h1_count (instantáneas) dims: "site:<dominio>"
 * serp       position (mejor lugar 1-30; ausente = fuera del top 30) dims: "q:<búsqueda>|site:<dominio>"
 *            checked (1 = búsqueda medida; meta.top = top 10)  dims: "q:<búsqueda>"
 * comp (más) service_urls, trust_pages, fresh_days, has_canonical, indexable,
 *            title_keyword, has_https, has_sitemap (instantáneas) dims: "site:<dominio>"
 * links      ref_domains, domain_score (instantáneas, mensual)  dims: "site:<dominio>"
 * maps       gbp_found (0/1), gbp_rating, gbp_reviews (mensual) dims: "site:<dominio>"
 * igcomp     followers, posts_total, posts_30d, avg_interactions, engagement (semanal) dims: "site:<dominio>"
 * psi        lcp_ms, inp_ms, cls, lighthouse_seo,
 *            lighthouse_a11y (instantáneas)                   dims: "mobile:<ruta>" · "desktop:<ruta>"
 * geo        checks_ok, checks_total (diario; meta.report = GeoReport en checks_total) dims: ""
 */
export const SOURCE_IDS = ["ga4", "gsc", "gads", "meta", "instagram", "clarity", "gbp", "psi", "comp", "serp", "links", "maps", "igcomp", "ideas", "geo"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

export const SOURCE_LABELS: Record<SourceId, string> = {
  ga4: "Google Analytics",
  gsc: "Search Console",
  gads: "Google Ads",
  meta: "Meta Ads",
  instagram: "Instagram",
  clarity: "Microsoft Clarity",
  gbp: "Google Business Profile",
  psi: "PageSpeed Insights",
  comp: "Competencia",
  serp: "Posiciones en Google (Apify)",
  links: "Enlaces y autoridad (Apify)",
  maps: "Google Maps (Apify)",
  igcomp: "Instagram de la competencia (Apify)",
  ideas: "Ideas de contenido",
  geo: "Visibilidad en IA",
};

export const PAID_CHANNELS = new Set([
  "Paid Search", "Paid Social", "Paid Other", "Paid Video", "Paid Shopping", "Display", "Cross-network",
]);
