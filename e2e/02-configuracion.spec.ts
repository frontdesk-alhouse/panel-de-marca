import { expect, test } from "@playwright/test";

/**
 * La configuración inicial completa, como la haría una agencia nueva, sin ninguna llave.
 * Usa example.com / example.org (dominios reservados por IANA para pruebas: no cambian).
 * Depende de 01 (base vacía) y deja la marca lista para 03.
 */
test("configuración inicial de punta a punta sin llaves", async ({ page }) => {
  // Varias lecturas reales de internet (example.com, Google): presupuesto amplio.
  test.setTimeout(300_000);
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup/);

  // Bienvenida
  await page.getByRole("button", { name: "Empezar" }).click();

  // Paso 1 · Tu sitio
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Cuál es tu sitio web?");
  await page.getByLabel("Dominio").fill("example.com");
  await page.getByRole("button", { name: "Leer mi sitio" }).click();
  await expect(page.getByRole("heading", { name: "Esto encontré en example.com" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Continuar", exact: true }).click();

  // Paso 2 · Briefing
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cuéntame de tu marca");
  await page.getByLabel("¿A quién le vendes?").fill("Familias de Monterrey");
  await page.getByLabel("¿Quién es tu competencia?").fill("Competidor de prueba (example.org)");
  const precios = page.getByRole("button", { name: "Sus precios" });
  await precios.click();
  await expect(precios).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Continuar sin Claude" }).click();

  // Paso 3 · Tu marca: sin Claude se llena del sitio y falta lo que solo sabe la persona
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Completa tu ficha");
  const guardar = page.getByRole("button", { name: "Guardar y continuar" });
  await expect(guardar).toBeDisabled();
  await page.getByLabel("Nombre de la marca").fill("Estudio E2E");
  await page.getByLabel("Tu nombre").fill("Prueba E2E");
  await page.getByLabel("Ciudad principal").fill("Monterrey");
  await page.getByLabel("Qué es tu marca").fill("Pastelería de prueba para las pruebas automáticas.");
  await page.getByRole("textbox", { name: "Servicios o productos" }).fill("pasteles, galletas");
  await page.getByRole("textbox", { name: "Servicios o productos" }).press("Enter");
  await page.getByLabel("Idioma del panel").selectOption("es");
  await expect(guardar).toBeEnabled();
  await guardar.click();

  // Paso 4 · Mercado: el competidor del briefing se agrega solo
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dónde quieres ganar y contra quién");
  await expect(page.getByRole("list", { name: "Competidores" })).toContainText("example.org", { timeout: 60_000 });
  await page.getByRole("textbox", { name: "Tus búsquedas" }).fill("pasteles monterrey");
  await page.getByRole("textbox", { name: "Tus búsquedas" }).press("Enter");
  await page.getByRole("button", { name: "Sugerir con Google" }).click();
  // Depende de Google: basta con que responda (lista, «sin más» o un error claro).
  await expect(
    page.getByRole("list", { name: "Búsquedas sugeridas" })
      .or(page.getByText("Sin más sugerencias por ahora."))
      .or(page.getByRole("alert"))
      .first(),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Guardar y continuar" }).click();

  // Paso 5 · Conexiones: una llave que no funciona no se guarda
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Conecta tus cuentas");
  await expect(page.getByText("0 de 7 conectadas")).toBeVisible();
  const psi = page.locator("section#psi");
  await psi.getByRole("button", { name: "Conectar" }).click();
  await psi.getByLabel("API key de PageSpeed").fill("AIzaLlaveInvalidaParaPruebas");
  await psi.getByRole("button", { name: "Guardar y probar" }).click();
  await expect(psi.getByRole("alert")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("0 de 7 conectadas")).toBeVisible();
  await page.getByRole("button", { name: "Continuar sin conectar" }).click();

  // Paso 6 · Primera actualización y entrada al panel
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Traigo tus datos por primera vez");
  await page.getByRole("button", { name: "Empezar actualización" }).click();
  await expect(page.getByRole("list", { name: "Avance por fuente" })).toContainText("Ideas de contenido");
  await page.getByRole("button", { name: "Ir a mi panel" }).click();
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  await expect(page.getByRole("heading", { name: "Pregúntale a tu panel" })).toBeVisible();
});
