import Link from "next/link";
import { Plug } from "lucide-react";
import { getMessages } from "@/i18n/server";
import { isLocalMode } from "@/lib/mode";
import { INTEGRATIONS, RECOMMENDED_ORDER } from "@/lib/integrations/catalog";
import { integrationStates } from "@/lib/integrations/status";

/** Aviso corto: «te faltan N conexiones gratis». Solo en la versión local, donde se configuran. */
export async function MissingConnections() {
  if (!isLocalMode()) return null;
  const t = await getMessages();
  const states = integrationStates();
  const missingFree = RECOMMENDED_ORDER.filter((id) => !states.find((s) => s.id === id)?.connected && INTEGRATIONS.find((i) => i.id === id)?.cost !== "paid");
  if (!missingFree.length) return null;
  return (
    <Link href={`/ajustes?tab=conexiones#${missingFree[0]}`} className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 text-sm transition-colors hover:bg-secondary">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-good/15 text-good-ink"><Plug className="h-4 w-4" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">Te {missingFree.length === 1 ? "falta 1 conexión gratis" : `faltan ${missingFree.length} conexiones gratis`}: {missingFree.map((id) => t.integrations[id].name).join(", ")}</span>
        <span className="block text-xs text-muted-foreground">Cada una enciende más secciones. Con guía visual paso a paso.</span>
      </span>
      <span className="text-xs font-medium">Completar</span>
    </Link>
  );
}
