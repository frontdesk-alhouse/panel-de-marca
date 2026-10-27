import type { PublicWorkspace } from "@/lib/workspace/schema";

/**
 * Accesos directos a cada plataforma de la marca, ya apuntando a la cuenta correcta.
 * Los usa el lanzador del encabezado y el analista del chat (para dar el link exacto
 * cuando recomienda una acción, p. ej. pausar una campaña). No contienen secretos.
 */
export interface Platform {
  key: string; name: string; url: string; domain: string;
  /** Ícono propio cuando el favicon del dominio es el genérico de Google. */
  icon?: string;
  /** Para qué entrar: se muestra como ayuda y se le da al analista. */
  use: string;
}
export interface PlatformGroup { title: string; items: Platform[] }

/** Arma los accesos desde la configuración; sin un ID, el link va a la página general de la plataforma. */
export function buildPlatformGroups(w: PublicWorkspace): PlatformGroup[] {
  const p = w.platforms;
  const domain = w.brand.domain;
  const ads: Platform[] = [
    { key: "google_ads", icon: "https://cdn.simpleicons.org/googleads", name: "Google Ads", domain: "ads.google.com", url: p.googleAdsCustomerId ? `https://ads.google.com/aw/campaigns?__c=${p.googleAdsCustomerId}` : "https://ads.google.com/aw/campaigns", use: "Campañas de búsqueda: pausar o activar (interruptor junto a la campaña), presupuesto, palabras negativas, términos de búsqueda." },
    { key: "meta_ads", name: "Meta Ads", domain: "adsmanager.facebook.com", url: p.metaAdAccountId ? `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${p.metaAdAccountId}` : "https://adsmanager.facebook.com/adsmanager/manage/campaigns", use: "Anuncios de Instagram y Facebook: pausar o activar, presupuesto, públicos y creatividades." },
  ];
  const measure: Platform[] = [
    { key: "ga4", icon: "https://cdn.simpleicons.org/googleanalytics", name: "Analytics", domain: "analytics.google.com", url: p.ga4PropertyId ? `https://analytics.google.com/analytics/web/#/p${p.ga4PropertyId}/reports/intelligenthome` : "https://analytics.google.com/analytics/web/", use: "Visitas, canales y eventos clave (generate_lead) del sitio." },
    { key: "gsc", icon: "https://cdn.simpleicons.org/googlesearchconsole", name: "Search Console", domain: "search.google.com", url: `https://search.google.com/search-console${p.gscProperty ? `?resource_id=${encodeURIComponent(p.gscProperty)}` : ""}`, use: "Búsquedas orgánicas, indexación y sitemap." },
    { key: "clarity", name: "Clarity", domain: "clarity.microsoft.com", url: p.clarityProjectId ? `https://clarity.microsoft.com/projects/view/${p.clarityProjectId}/dashboard` : "https://clarity.microsoft.com/projects", use: "Grabaciones y mapas de calor: dónde se frustra o se va la gente." },
    { key: "psi", icon: "https://cdn.simpleicons.org/pagespeedinsights", name: "PageSpeed", domain: "pagespeed.web.dev", url: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(`https://${domain}/`)}`, use: "Velocidad del sitio en celular y computadora." },
  ];
  const presence: Platform[] = [
    { key: "site", name: domain, domain, url: `https://${domain}`, use: "El sitio publicado." },
    ...(p.siteEditor ? [{ key: "site_editor", name: p.siteEditor.name, domain: hostOf(p.siteEditor.url), url: p.siteEditor.url, use: "Editar y publicar el sitio." }] : []),
    { key: "gbp", icon: "https://cdn.simpleicons.org/googlemaps", name: "Perfil de Google", domain: "business.google.com", url: "https://business.google.com/locations", use: `Perfil de negocio${p.gbpName ? ` «${p.gbpName}»` : ""}: reseñas, fotos, horario y publicaciones.` },
    ...(w.brand.instagram ? [{ key: "instagram", name: "Instagram", domain: "instagram.com", url: `https://www.instagram.com/${w.brand.instagram}/`, use: "La cuenta de Instagram." }] : []),
    { key: "meta_suite", name: "Meta Business", domain: "business.facebook.com", url: "https://business.facebook.com/latest/home", use: "Publicar y programar en Instagram y Facebook, mensajes y bandeja de entrada." },
  ];
  return [
    { title: "Anuncios", items: ads },
    { title: "Medición", items: measure },
    { title: "Presencia", items: presence },
  ];
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/** Bloque de texto para el analista: así puede dar el link exacto en sus respuestas. */
export function platformsForPrompt(groups: PlatformGroup[]): string {
  return groups.flatMap((g) => g.items).map((p) => `- ${p.name}: ${p.url} (${p.use})`).join("\n");
}
