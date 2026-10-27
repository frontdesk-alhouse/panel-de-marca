import "@/lib/workspace/test-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMaps } from "./maps";
import { parseLinks } from "./links";
import { parseHome, parseSitemapEntries, summarizeSitemap } from "./competitors";

test("Maps: cuenta el perfil solo si su sitio es el dominio del estudio", () => {
  // Forma real (corrida 2026-10-24): buscar Estudio Ejemplo devolvió otra agencia.
  const rows = parseMaps([
    { searchString: "Estudio Ejemplo Guadalajara", title: "Brandhouse Marketing", website: "http://www.brandhouse.com.mx/", totalScore: 4.9, reviewsCount: 8 },
    { searchString: "Rival Uno agencia Guadalajara", title: "Rival Uno", website: "https://www.rival-uno.mx/", totalScore: 5, reviewsCount: 31 },
  ], "2026-10-24");
  const v = (dim: string, m: string) => rows.find((r) => r.dimKey === dim && r.metric === m)?.value;
  assert.equal(v("site:ejemplo.mx", "gbp_found"), 0);
  assert.equal(v("site:rival-uno.mx", "gbp_found"), 1);
  assert.equal(v("site:rival-uno.mx", "gbp_reviews"), 31);
  assert.equal(rows.some((r) => r.dimKey === "site:rival-dos.com"), false);
});

test("Enlaces: guarda dominios que enlazan y puntaje por estudio", () => {
  const rows = parseLinks(new Map([["rival-uno.mx", { item: { domain: "rival-uno.mx", domain_score: 24, referring_domains_count: 34 }, date: "2026-10-24" }]]));
  assert.deepEqual(rows.map((r) => [r.metric, r.value]), [["ref_domains", 34], ["domain_score", 24]]);
});

test("Home: detecta canonical, noindex y servicio en el título", () => {
  const h = parseHome('<title>Estudio de branding en Guadalajara</title><link rel="canonical" href="x"><meta name="robots" content="noindex">');
  assert.equal(h.has_canonical, 1);
  assert.equal(h.indexable, 0);
  assert.equal(h.title_keyword, 1);
});

test("Sitemap: cuenta páginas de servicio, señales de confianza y frescura", () => {
  const xml = `<urlset>
    <url><loc>https://x.mx/</loc><lastmod>2026-10-01</lastmod></url>
    <url><loc>https://x.mx/branding-guadalajara</loc></url>
    <url><loc>https://x.mx/blog/que-es-branding</loc><lastmod>2026-10-20T10:00:00Z</lastmod></url>
    <url><loc>https://x.mx/nosotros</loc></url>
    <url><loc>https://x.mx/proyectos/cliente-a</loc></url>
  </urlset>`;
  const s = summarizeSitemap(parseSitemapEntries(xml), "2026-10-24");
  assert.equal(s.urls, 5);
  assert.equal(s.blog, 1);
  assert.equal(s.service, 1);
  assert.equal(s.trust, 2);
  assert.equal(s.freshDays, 4);
});

test("Instagram de competencia: seguidores, posts recientes y engagement por publicación", async () => {
  const { parseIgProfiles } = await import("./igcomp");
  const rows = parseIgProfiles([{ username: "rival.uno", followersCount: 1000, postsCount: 300, latestPosts: [
    { timestamp: "2026-10-20T10:00:00Z", likesCount: 40, commentsCount: 10 },
    { timestamp: "2026-08-01T10:00:00Z", likesCount: 20, commentsCount: 0 },
  ] }], "2026-10-24");
  const v = (m: string) => rows.find((r) => r.metric === m)?.value;
  assert.equal(v("followers"), 1000);
  assert.equal(v("posts_30d"), 1);
  assert.equal(v("avg_interactions"), 35);
  assert.equal(v("engagement"), 0.035);
});

test("Instagram de competencia: si hay publicaciones del actor de posts, mandan sobre las del perfil", async () => {
  const { parseIgProfiles } = await import("./igcomp");
  const rows = parseIgProfiles([{ username: "estudio.ejemplo", followersCount: 95, latestPosts: [] }], "2026-10-24", [
    { ownerUsername: "estudio.ejemplo", timestamp: "2026-10-20T10:00:00Z", likesCount: 10, commentsCount: 2 },
    { ownerUsername: "estudio.ejemplo", timestamp: "2026-10-20T11:00:00Z", likesCount: 6, commentsCount: 0 },
  ]);
  const v = (m: string) => rows.find((r) => r.metric === m)?.value;
  assert.equal(v("posts_30d"), 2);
  assert.equal(v("avg_interactions"), 9);
});
