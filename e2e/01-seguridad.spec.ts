import { expect, test } from "@playwright/test";

/**
 * Sin marca configurada y sin login: el panel solo debe abrir la configuración, y solo
 * desde esta computadora. Corre primero (la base está vacía).
 */
test.describe("modo local · seguridad", () => {
  test("sin marca, cualquier página manda a la configuración", async ({ page }) => {
    for (const path of ["/", "/resumen", "/crm", "/competencia"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/setup/);
    }
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Tu panel de marketing");
  });

  test("/login no existe en local: lleva al inicio", async ({ request }) => {
    const res = await request.get("/login", { maxRedirects: 0 });
    expect(res.status()).toBe(307);
    expect(res.headers().location).toMatch(/^(http:\/\/127\.0\.0\.1:\d+)?\/$/);
  });

  test("rechaza un Host ajeno (DNS rebinding)", async ({ request }) => {
    const res = await request.get("/", { headers: { Host: "attacker.example" }, maxRedirects: 0 });
    expect(res.status()).toBe(403);
  });

  test("otra página del navegador no puede escribir en el panel", async ({ request }) => {
    const res = await request.post("/api/sync/ideas", { headers: { Origin: "https://evil.example" }, data: {} });
    expect(res.status()).toBe(403);
  });

  test("los crons de la nube no responden sin su secreto", async ({ request }) => {
    expect((await request.get("/api/cron/sync/ideas")).status()).toBe(401);
  });

  test("encabezados de seguridad y sin X-Powered-By", async ({ request }) => {
    const res = await request.get("/setup");
    const h = res.headers();
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-powered-by"]).toBeUndefined();
    // HSTS solo en Vercel: aquí el panel corre en http.
    expect(h["strict-transport-security"]).toBeUndefined();
  });

  test("un regreso de Google falso no hace nada", async ({ request }) => {
    const res = await request.get("/?state=falso&code=falso", { maxRedirects: 0 });
    // Sin la cookie del flujo no se reescribe al callback: es la página normal (que manda a /setup).
    expect([200, 307]).toContain(res.status());
    expect(res.headers().location ?? "").not.toContain("google=");
  });
});
