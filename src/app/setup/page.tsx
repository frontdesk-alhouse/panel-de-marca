import { getMessages } from "@/i18n/server";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/auth";
import { isLocalMode } from "@/lib/mode";
import { loadWorkspace } from "@/lib/workspace/load";
import { competitors, setupCompletedAt, ws } from "@/lib/workspace/store";
import { workspaceToForm } from "@/lib/briefing/brand-form";
import { integrationStates } from "@/lib/integrations/status";
import { SetupWizard } from "@/components/setup/SetupWizard";
import { isStep, type StepId } from "@/components/setup/steps";

export async function generateMetadata() {
  const t = await getMessages();
  return { title: t.setup.pageTitle };
}

/** Configuración inicial (solo modo local). Lo primero que se ve al abrir el panel. */
export default async function SetupPage({ searchParams }: { searchParams: Promise<{ paso?: string; google?: string }> }) {
  if (!isLocalMode()) notFound();
  if (!(await getViewer())) notFound();
  const { paso, google } = await searchParams;
  let saved = false;
  try { saved = await loadWorkspace(); } catch (e) { console.error("[setup]", e); }
  if (saved && setupCompletedAt() && !paso && !google) redirect("/ajustes");
  const asked = isStep(paso) ? paso : null;
  const step: StepId = google ? "conexiones" : asked ?? (saved ? "mercado" : "bienvenida");
  return (
    <SetupWizard initial={{
      step,
      form: saved ? workspaceToForm(ws()) : null,
      competitors: saved ? competitors().filter((c) => !c.self).map((c) => ({ name: c.name, domain: c.domain, city: c.city, mapsQuery: c.mapsQuery, ...(c.instagram ? { instagram: c.instagram } : {}) })) : [],
      states: integrationStates(),
      hasClaude: Boolean(process.env.ANTHROPIC_API_KEY),
      hasApify: Boolean(process.env.APIFY_TOKEN),
      googleResult: google ?? null,
    }} />
  );
}
