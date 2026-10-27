/**
 * Al arrancar cada instancia del servidor, carga la configuración de la marca en
 * memoria. Así cualquier código (también acciones de servidor en una instancia
 * nueva) la puede leer sin esperar. Si la base falla, las páginas reintentan.
 *
 * En modo local además abre la base (y aplica migraciones) y arranca el programador,
 * que reemplaza a los crons de Vercel.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { isLocalMode } = await import("@/lib/mode");
  try {
    const { loadWorkspace } = await import("@/lib/workspace/load");
    await loadWorkspace();
  } catch (err) {
    console.error("[workspace] no se pudo cargar al arrancar:", err instanceof Error ? err.message : err);
  }
  if (isLocalMode() && process.env.NEXT_PHASE !== "phase-production-build") {
    const { verifyLoopbackOnly } = await import("@/lib/local/bind-check");
    void verifyLoopbackOnly();
    const { startScheduler } = await import("@/lib/local/scheduler");
    startScheduler();
  }
}
