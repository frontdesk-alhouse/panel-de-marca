import assert from "node:assert/strict";
import test from "node:test";
import { instagramHandle, internalLinks, pageFacts, pickKeyPages, siteFacts } from "./extract";
import { isAllowed, normalizeDomain, parseRobots } from "./scrape";

const HOME = `<!doctype html><html lang="es-MX"><head><title>Dulce Sol | Pastelería en Monterrey</title>
<meta name="description" content="Pasteles artesanales &amp; galletas.">
<meta property="og:site_name" content="Dulce Sol">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","name":"x"},{"@type":"Bakery LocalBusiness","name":"Dulce Sol Pastelería","telephone":"+52 81 1234 5678","address":{"@type":"PostalAddress","addressLocality":"Monterrey"},"sameAs":["https://www.instagram.com/dulcesol.mty/","https://facebook.com/dulcesol"]}]}</script>
<style>.x{}</style></head><body><nav><a href="/nosotros">Nosotros</a><a href="https://otro.com/x">fuera</a></nav>
<h1>Pasteles para cada ocasión</h1><h2>Pasteles de cumpleaños</h2><p>Desde $450 MXN. Boda: $3,200</p>
<a href="https://www.facebook.com/sharer/sharer.php?u=x">compartir</a><script>var a=1</script><footer>© 2026</footer></body></html>`;

test("datos de la marca desde JSON-LD, og y el texto visible", () => {
  const f = siteFacts(HOME);
  assert.equal(f.name, "Dulce Sol Pastelería");
  assert.equal(f.lang, "es-MX");
  assert.equal(f.city, "Monterrey");
  assert.equal(f.phone, "+52 81 1234 5678");
  assert.equal(f.instagram, "dulcesol.mty");
  assert.ok(f.socials.some((s) => s.includes("facebook.com/dulcesol")));
  assert.ok(!f.socials.some((s) => s.includes("sharer")), "sin botones de compartir");
  assert.deepEqual(f.prices, ["Desde $450 MXN", "$3,200"]);
});

test("sin JSON-LD: nombre desde og:site_name o el título", () => {
  assert.equal(siteFacts(`<title>Estudio Norte — Diseño</title>`).name, "Estudio Norte");
});

test("página: título, descripción, encabezados y texto sin menú ni scripts", () => {
  const p = pageFacts("https://dulcesol.example/", HOME);
  assert.equal(p.title, "Dulce Sol | Pastelería en Monterrey");
  assert.equal(p.description, "Pasteles artesanales & galletas.");
  assert.deepEqual(p.headings, ["Pasteles para cada ocasión", "Pasteles de cumpleaños"]);
  assert.ok(p.text.includes("Desde $450 MXN"));
  assert.ok(!p.text.includes("var a") && !p.text.includes("Nosotros") && !p.text.includes("2026"));
});

test("elige primero servicios, nosotros y precios, sin blog ni legales", () => {
  const o = "https://dulcesol.example";
  const urls = [`${o}/en/services`, `${o}/blog/receta-1`, `${o}/aviso-de-privacidad`, `${o}/nosotros`, `${o}/servicios/bodas`, `${o}/foto.jpg`, `${o}/tienda/caja-12`, `https://otro.com/servicios`, `${o}/precios`];
  assert.deepEqual(pickKeyPages(urls, o, 3), [`${o}/precios`, `${o}/nosotros`, `${o}/servicios/bodas`]);
  const all = pickKeyPages(urls, o, 20);
  assert.equal(all.at(-1), `${o}/tienda/caja-12`, "las demás después de las clave");
  assert.ok(!all.some((u) => /privacidad|\.jpg|otro\.com|\/en\//.test(u)), "legales, imágenes, traducciones y otros dominios fuera");
});

test("enlaces internos cuando no hay sitemap", () => {
  assert.deepEqual(internalLinks(HOME, "https://dulcesol.example"), ["https://dulcesol.example/nosotros"]);
});

test("instagram: perfil sí, publicaciones no", () => {
  assert.equal(instagramHandle("https://instagram.com/estudio_norte"), "estudio_norte");
  assert.equal(instagramHandle("https://www.instagram.com/p/Cx1/"), null);
});

test("robots.txt: reglas para todos y para el panel, comodines y sitemaps", () => {
  const r = parseRobots("User-agent: Googlebot\nDisallow: /solo-google\n\nUser-agent: *\nDisallow: /admin\nDisallow: /*.pdf$\nSitemap: https://x.mx/sm.xml\n");
  assert.deepEqual(r.sitemaps, ["https://x.mx/sm.xml"]);
  assert.ok(!isAllowed("/admin/panel", r.disallow));
  assert.ok(!isAllowed("/docs/menu.pdf", r.disallow));
  assert.ok(isAllowed("/docs/menu.pdf?v=2", r.disallow));
  assert.ok(isAllowed("/solo-google", r.disallow));
  assert.ok(isAllowed("/servicios", r.disallow));
});

test("dominio: limpia https, www y rutas; rechaza IPs y locales", () => {
  assert.equal(normalizeDomain("https://www.DulceSol.example/inicio"), "dulcesol.example");
  assert.equal(normalizeDomain("estudio-ejemplo.com.mx"), "estudio-ejemplo.com.mx");
  for (const bad of ["192.168.1.10", "localhost", "panel.local", "no es un sitio"]) assert.throws(() => normalizeDomain(bad), bad);
});
