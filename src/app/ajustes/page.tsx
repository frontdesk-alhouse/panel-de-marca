import { getMessages } from "@/i18n/server";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { isLocalMode } from "@/lib/mode";
import { loadWorkspace } from "@/lib/workspace/load";
import { competitors, ws } from "@/lib/workspace/store";
import { workspaceToForm } from "@/lib/briefing/brand-form";
import { integrationStates } from "@/lib/integrations/status";
import { SettingsView } from "@/components/setup/SettingsView";
import { SourcesStatus } from "@/components/setup/SourcesStatus";
import { BuilderConnect } from "@/components/builders/BuilderConnect";
import { builderChoice } from "@/lib/builders/platform";

export async function generateMetadata() {
  const t = await getMessages();
  return { title: t.setup.settings.title };
}

/**
 * Ajustes. Siempre: qué está conectado y cuándo se actualizó cada fuente. En local, además, las
 * piezas de la configuración inicial para editar marca, mercado y llaves (en la nube viven en el despliegue).
 */
export default async function AjustesPage({ searchParams }: { searchParams: Promise<{ google?: string; tab?: string }> }) {
  if (!(await getViewer())) notFound();
  if (!isLocalMode()) {
    const t = await getMessages();
    return (
      <div className="space-y-8">
        <h1 className="font-display text-4xl">{t.setup.settings.title}</h1>
        <SourcesStatus />
        <BuilderConnect {...await builderChoice().catch(() => ({ chosen: null, detected: null }))} />
      </div>
    );
  }
  if (!(await loadWorkspace())) redirect("/setup");
  const { google, tab } = await searchParams;
  return (
    <SettingsView
      status={<><SourcesStatus /><BuilderConnect {...await builderChoice().catch(() => ({ chosen: null, detected: null }))} /></>}
      form={workspaceToForm(ws())}
      competitors={competitors().filter((c) => !c.self).map((c) => ({ name: c.name, domain: c.domain, city: c.city, mapsQuery: c.mapsQuery, ...(c.instagram ? { instagram: c.instagram } : {}) }))}
      states={integrationStates()}
      hasApify={Boolean(process.env.APIFY_TOKEN)}
      googleResult={google ?? null}
      initialTab={tab === "marca" || tab === "mercado" ? tab : "conexiones"}
    />
  );
}
