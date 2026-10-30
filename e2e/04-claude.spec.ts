import { expect, test } from "@playwright/test";
import { unzipSync } from "fflate";
import { existsSync } from "node:fs";

test.beforeEach(async ({ page }) => {
  // La guía de bienvenida ya se vio (si no, el diálogo tapa la página).
  await page.addInitScript(() => localStorage.setItem("ah-panel-onboarding-v1", "1"));
});


/** Skills descargables, «Copiar para Claude», Visibilidad en IA, bitácora de cambios y «Sincronizar ahora». */
test.describe("panel y Claude", () => {
  test("cada skill se descarga como zip con su SKILL.md en la raíz", async ({ request }) => {
    for (const id of ["seo-geo", "anuncios-eficiencia", "conversion-medicion"]) {
      const res = await request.get(`/api/skills/${id}/zip`);
      expect(res.status()).toBe(200);
      const files = unzipSync(new Uint8Array(await res.body()));
      const skill = new TextDecoder().decode(files[`${id}/SKILL.md`]);
      expect(skill).toMatch(new RegExp(`^---\\nname: ${id}\\n`));
    }
    expect((await request.get("/api/skills/..%2F.env/zip")).status()).toBe(404);
  });

  test("la página de skills enseña a instalar y deja compartir el repo", async ({ page, request }) => {
    expect(await (await request.get("/api/skills/seo-geo/skill-md")).text()).toMatch(/^---\nname: seo-geo/);
    await page.goto("/skills");
    await expect(page.getByRole("heading", { name: /En otras IA/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "SEO + GEO" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver en GitHub" })).toHaveAttribute("href", /github\.com\/frontdesk-alhouse\/seo-geo-skill/);
    await expect(page.getByRole("button", { name: "Compartir el panel" }).first()).toBeVisible();
  });

  test("Copiar para Claude copia instrucciones con el skill sugerido", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/seo/ia");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Visibilidad en IA");
    await page.getByRole("radio", { name: /App de Claude/ }).click();
    await page.getByRole("button", { name: "Copiar para App de Claude" }).click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("# Visibilidad en IA de Estudio E2E");
    expect(text).toContain("**seo-geo**");
    expect(text).toContain("paso a paso");
    expect(text).toContain("```panel-cambios");
  });

  test("Otra IA explica cómo usar el skill fuera de Claude", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/seo/ia");
    await page.getByRole("radio", { name: /Otra IA/ }).click();
    await page.getByRole("button", { name: "Copiar para Otra IA" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("SKILL.md");
  });

  test("pegar el bloque de cambios de la IA los registra sin formulario", async ({ page }) => {
    await page.goto("/calificacion");
    await page.getByLabel(/Pegar cambios de tu IA/).fill("Listo.\n```panel-cambios\n- 2026-10-28 | propio | conversion | Formulario corto publicado\n- 2026-10-28 | externo | seo | Core update de Google\n```");
    await page.getByRole("button", { name: "Registrar cambios" }).click();
    await expect(page.getByText("2 cambios registrados.")).toBeVisible();
    for (const title of ["Formulario corto publicado", "Core update de Google"]) {
      const item = page.getByRole("listitem").filter({ hasText: title });
      await item.getByRole("button", { name: "Borrar" }).click();
      await expect(item).toHaveCount(0);
    }
  });

  test("la batería de consultas sale de la marca y sus servicios", async ({ page }) => {
    await page.goto("/seo/ia");
    await expect(page.getByText(/Q-01 ¿A quién me recomiendas para pasteles en Monterrey\?/)).toBeVisible();
  });

  test("registrar un cambio lo deja en la bitácora y se puede borrar", async ({ page }) => {
    await page.goto("/calificacion");
    await page.getByText("O escribir uno a mano").click();
    await page.getByLabel("Qué cambió").fill("Publicamos el schema Organization");
    await page.getByRole("radio", { name: "Externo" }).check();
    await page.getByRole("button", { name: "Registrar cambio", exact: true }).click();
    await expect(page.getByText("Cambio registrado. Aparece en la gráfica.")).toBeVisible();
    const item = page.getByRole("listitem").filter({ hasText: "Publicamos el schema Organization" });
    await expect(item).toContainText("externo");
    await item.getByRole("button", { name: "Borrar" }).click();
    await expect(item).toHaveCount(0);
  });

  test("Sincronizar ahora sin conexiones no rompe", async ({ page }) => {
    await page.goto("/resumen");
    await page.getByRole("button", { name: "Sincronizar ahora" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Por qué un número puede no cambiar")).toBeVisible();
    // Sin conexiones solo queda el chequeo GEO (no necesita llaves).
    await expect(sheet.getByText("Visibilidad en IA (chequeo técnico)")).toBeVisible();
  });

  test("guía: se reabre, explica cada sección y la vista simple esconde lo técnico", async ({ page }) => {
    await page.goto("/calificacion");
    const nav = page.getByRole("navigation", { name: "Secciones" }).first();
    await page.getByRole("button", { name: "Guía del panel" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Tu marketing en un solo lugar")).toBeVisible();
    for (let i = 0; i < 5; i++) await dialog.getByRole("button", { name: "Siguiente" }).click();
    await dialog.getByRole("radio", { name: /Vista simple/ }).click();
    await page.keyboard.press("Escape");
    await expect(nav.getByRole("link", { name: "SEO", exact: true })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Calificación" })).toBeVisible();
    await page.getByRole("radio", { name: "Vista completa" }).first().click();
    await expect(nav.getByRole("link", { name: /^SEO/ })).toBeVisible();
    await nav.getByRole("button", { name: "Qué es esta sección: Calificación" }).click();
    await expect(page.getByText("Una nota de 0 a 100 en siete áreas, qué está bien y qué atender, con evidencia.")).toBeVisible();
  });

  test("la primera visita abre la guía de bienvenida", async ({ browser }) => {
    const page = await (await browser.newContext()).newPage();
    await page.goto("/calificacion");
    await expect(page.getByRole("dialog").getByText("Tu marketing en un solo lugar")).toBeVisible();
  });

  test("conexiones: «Completa tu panel» y réplica con dónde dar clic", async ({ page }) => {
    await page.goto("/ajustes?tab=conexiones");
    const rec = page.getByRole("region", { name: "Completa tu panel" });
    await expect(rec).toContainText("Microsoft Clarity");
    await rec.getByRole("link", { name: /Microsoft Clarity/ }).click();
    const card = page.locator("section#clarity");
    await expect(card.getByText("Clic aquí")).toHaveCount(2);
    await expect(card.getByText("Pegar el código de Clarity en tu sitio")).toBeVisible();
  });

  test("Conectar con Google usa la app «Panel de marca» sin crear nada en Google Cloud", async ({ request }) => {
    // La app compartida vive fuera de git (private/); en el repo público se pide a la nube.
    test.skip(!existsSync("private/google-oauth-app.json"), "sin private/google-oauth-app.json");
    const res = await request.get("/api/setup/google/start?back=/ajustes", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    const to = new URL(res.headers().location);
    expect(to.hostname).toBe("accounts.google.com");
    expect(to.searchParams.get("client_id")).toMatch(/^1097385279067-.+\.apps\.googleusercontent\.com$/);
    expect(to.searchParams.get("scope")).toContain("analytics.readonly");
    expect(to.searchParams.get("code_challenge_method")).toBe("S256");
  });
});
