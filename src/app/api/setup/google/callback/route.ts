import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isViewerRequest, unauthorized } from "@/lib/api-auth";
import { isLocalMode } from "@/lib/mode";
import { endFlow, OAUTH_COOKIE, oauthClient, peekFlow } from "@/lib/integrations/google-oauth";
import { setSecrets } from "@/lib/secrets";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Google regresa aquí (vía la raíz) con el código: se cambia por el refresh token y se guarda. */
export async function GET(req: Request) {
  if (!isLocalMode()) return Response.json({ error: "Solo en modo local" }, { status: 404 });
  if (!(await isViewerRequest(req))) return unauthorized();
  const url = new URL(req.url);
  const flowId = (await cookies()).get(OAUTH_COOKIE)?.value;
  const saved = peekFlow(flowId);
  const back = saved?.back ?? "/setup";
  // Redirección relativa: el navegador se queda en el host que abrió (127.0.0.1 o localhost).
  // Aquí el Host ya no sirve: el proxy reescribió el pedido desde la raíz.
  // Solo un regreso con el state correcto cierra el flujo: un link ajeno no lo cancela.
  const done = (result: string, close: boolean) => {
    if (close) endFlow(flowId);
    const headers: Record<string, string> = { Location: `${back}?google=${result}#google` };
    if (close) headers["Set-Cookie"] = `${OAUTH_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
    return new Response(null, { status: 303, headers });
  };
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  if (!saved || !same(state, saved.state)) return done("caducado", false);
  if (url.searchParams.get("error") || !code) return done("cancelado", true);
  try {
    const { tokens } = await oauthClient(saved.origin).getToken({ code, codeVerifier: saved.verifier });
    if (!tokens.refresh_token) return done("sin-token", true);
    setSecrets({ GOOGLE_REFRESH_TOKEN: tokens.refresh_token });
    return done("ok", true);
  } catch (err) {
    console.error("[google-oauth]", err instanceof Error ? err.message : err);
    return done("error", true);
  }
}
