import { getMessages } from "@/i18n/server";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { isLocalMode } from "@/lib/mode";
import { loadWorkspace } from "@/lib/workspace/load";
import { competitors, ws } from "@/lib/workspace/store";
import { workspaceToForm } from "@/lib/briefing/brand-form";
import { integrationStates } from "@/lib/integrations/status";
import { SettingsView } from "@/components/setup/SettingsView";

export async function generateMetadata() {
  const t = await getMessages();
  return { title: t.setup.settings.title };
}

/** Ajustes (modo local): las mismas piezas de la configuración inicial, sin pasos. */
export default async function AjustesPage({ searchParams }: { searchParams: Promise<{ google?: string; tab?: string }> }) {
  if (!isLocalMode()) notFound();
  if (!(await getViewer())) notFound();
  if (!(await loadWorkspace())) redirect("/setup");
  const { google, tab } = await searchParams;
  return (
    <SettingsView
      form={workspaceToForm(ws())}
      competitors={competitors().filter((c) => !c.self).map((c) => ({ name: c.name, domain: c.domain, city: c.city, mapsQuery: c.mapsQuery, ...(c.instagram ? { instagram: c.instagram } : {}) }))}
      states={integrationStates()}
      hasApify={Boolean(process.env.APIFY_TOKEN)}
      googleResult={google ?? null}
      initialTab={tab === "marca" || tab === "mercado" ? tab : "conexiones"}
    />
  );
}
