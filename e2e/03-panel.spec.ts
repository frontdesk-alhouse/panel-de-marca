import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // La guía de bienvenida ya se vio (si no, el diálogo tapa la página).
  await page.addInitScript(() => localStorage.setItem("ah-panel-onboarding-v1", "1"));
});


/** El panel ya configurado (lo dejó 02): menú, secciones sin conexión, Ajustes, competencia y CRM. */
test.describe("panel configurado", () => {
  test("la marca de la configuración quedó guardada", async ({ page }) => {
    await page.goto("/ajustes?tab=marca");
    await expect(page.getByLabel("Nombre de la marca")).toHaveValue("Estudio E2E");
    await expect(page.getByLabel("Ciudad principal")).toHaveValue("Monterrey");
    await expect(page.getByRole("list", { name: "Servicios o productos" })).toContainText("pasteles");
  });

  test("menú local: con Ajustes, sin Google Ads hasta conectarlo, sin «Salir»", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Secciones" }).first();
    await expect(nav.getByRole("link", { name: "Ajustes" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Google Ads" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Salir" })).toHaveCount(0);
  });

  test("una sección sin conexión dice qué conectar y lleva a Ajustes", async ({ page }) => {
    await page.goto("/trafico");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tráfico y audiencia");
    await expect(page.getByRole("heading", { name: "Conecta Google Analytics y Search Console" })).toBeVisible();
    await page.getByRole("link", { name: "Conectar", exact: true }).click();
    await expect(page).toHaveURL(/\/ajustes#google/);
    await expect(page.locator("section#google").getByRole("link", { name: "Conectar con Google" })).toBeVisible();
  });

  test("las pestañas de Ajustes se usan con el teclado", async ({ page }) => {
    await page.goto("/ajustes");
    const conexiones = page.getByRole("tab", { name: "Conexiones" });
    // Esperar a que la página esté lista (hidratada) antes de usar el teclado.
    await expect(conexiones).toHaveAttribute("tabindex", "0");
    await expect(page.locator("section#psi")).toBeVisible();
    await conexiones.focus();
    await page.keyboard.press("ArrowRight");
    const marca = page.getByRole("tab", { name: "Tu marca" });
    await expect(marca).toHaveAttribute("aria-selected", "true");
    await expect(marca).toBeFocused();
    await page.keyboard.press("End");
    await expect(page.getByRole("tab", { name: "Búsquedas y competencia" })).toHaveAttribute("aria-selected", "true");
  });

  test("agregar un competidor desde Ajustes y que se quede guardado", async ({ page }) => {
    await page.goto("/ajustes?tab=mercado");
    await page.getByRole("textbox", { name: "Agregar competidor" }).fill("example.net");
    await page.getByRole("button", { name: "Agregar", exact: true }).first().click();
    await expect(page.getByRole("list", { name: "Competidores" })).toContainText("example.net", { timeout: 60_000 });
    // Esperar a que el guardado llegue al servidor (no solo a que el botón vuelva a estar activo).
    const saved = page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/ajustes"));
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await saved;
    await expect(page.getByRole("button", { name: "Guardar", exact: true })).toBeEnabled({ timeout: 30_000 });
    await page.goto("/ajustes?tab=mercado");
    await expect(page.getByRole("list", { name: "Competidores" })).toContainText("example.net");
    await expect(page.getByRole("list", { name: "Competidores" })).toContainText("example.org");
  });

  test("una llave inválida en Ajustes no se guarda (ni después de recargar)", async ({ page }) => {
    await page.goto("/ajustes#clarity");
    const card = page.locator("section#clarity");
    await card.getByLabel("Token de exportación de datos").fill("token-invalido-de-prueba");
    await card.getByRole("button", { name: "Guardar y probar" }).click();
    await expect(card.getByRole("alert")).toBeVisible({ timeout: 60_000 });
    await page.reload();
    await expect(page.getByText("0 de 7 conectadas")).toBeVisible();
    await expect(page.locator("section#clarity").getByText("Conectada")).toHaveCount(0);
  });

  test("el CRM guarda un prospecto sin ninguna conexión", async ({ page }) => {
    // Esperar a que el formulario esté listo antes de escribir.
    await page.goto("/crm/nuevo");
    await expect(page.getByRole("button", { name: "Crear prospecto" })).toBeEnabled();
    await page.getByRole("textbox", { name: "Empresa", exact: true }).fill("Prospecto E2E");
    await page.getByRole("textbox", { name: "Contacto", exact: true }).fill("Contacto E2E");
    await page.getByRole("button", { name: "Crear prospecto" }).click();
    await expect(page).toHaveURL(/\/crm\/\d+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prospecto E2E");
  });

  test("rehacer la configuración se ve a pantalla completa, sin el menú del panel", async ({ page }) => {
    await page.goto("/setup?paso=sitio");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Cuál es tu sitio web?");
    await expect(page.getByRole("navigation", { name: "Secciones" })).toHaveCount(0);
  });
});
