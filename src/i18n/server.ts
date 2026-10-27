import { hasWorkspace, ws } from "@/lib/workspace/store";
import { loadWorkspace } from "@/lib/workspace/load";
import { langFromAcceptLanguage, messages, type Lang, type Messages } from "./index";

/**
 * Idioma del panel en el servidor: el de la marca; antes de configurarla, el del navegador.
 * Nunca falla: un error de la base deja el español.
 */
export async function getLang(): Promise<Lang> {
  try {
    if (hasWorkspace() || (await loadWorkspace())) return ws().locale.language;
  } catch {
    // sin base: idioma del navegador
  }
  try {
    const { headers } = await import("next/headers");
    return langFromAcceptLanguage((await headers()).get("accept-language"));
  } catch {
    return "es";
  }
}

export async function getMessages(): Promise<Messages> {
  return messages(await getLang());
}
