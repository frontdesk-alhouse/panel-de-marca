import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/server";
import { setupCompletedAt } from "@/lib/workspace/store";
import { getViewer } from "@/auth";
import { isDbConfigured } from "@/db";
import { Notice } from "@/components/layout/Notice";
import { loadWorkspace } from "@/lib/workspace/load";
import { isLocalMode } from "@/lib/mode";
import { featureFor, isFeatureAvailable } from "@/lib/integrations/features";
import { ConnectEmptyState } from "@/components/layout/ConnectEmptyState";

/**
 * Devuelve un aviso si la página no puede cargar datos (sin sesión, sin base, sin
 * configuración o, en modo local, sin la conexión que la alimenta); null si puede.
 * `href` es la ruta de la sección, para saber qué conexión necesita.
 */
export async function pageGate(title: string, href?: string): Promise<React.ReactNode | null> {
  const t = await getMessages();
  if (!(await getViewer())) return <Notice><p>{t.gate.signIn}</p></Notice>;
  if (!isDbConfigured()) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-4xl">{title}</h1>
        <Notice><p className="font-medium">{t.gate.noDb}</p></Notice>
      </div>
    );
  }
  let ready = false;
  try { ready = await loadWorkspace(); } catch (e) { console.error("[workspace]", e); }
  if (!ready && isLocalMode()) redirect("/setup");
  if (!ready) {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-4xl">{title}</h1>
        <Notice><p className="font-medium">{t.gate.noWorkspace}</p><p>{t.gate.importHint}</p></Notice>
      </div>
    );
  }
  if (isLocalMode()) {
    if (!setupCompletedAt()) redirect("/setup");
    const feature = href ? featureFor(href) : undefined;
    if (feature && !isFeatureAvailable(feature)) return <ConnectEmptyState title={title} connect={feature.connect} />;
  }
  return null;
}

export async function LoadError({ title }: { title: string }) {
  const t = await getMessages();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">{title}</h1>
      <Notice><p>{t.gate.loadError}</p></Notice>
    </div>
  );
}
