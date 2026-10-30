import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isViewerRequest, unauthorized } from "@/lib/api-auth";
import { isLocalMode } from "@/lib/mode";
import { ensureGoogleClient } from "@/lib/integrations/shared-google-app";
import { ADS_SCOPE, BASE_SCOPES, OAUTH_COOKIE, OAUTH_TTL_S, oauthClient, requestOrigin, startFlow } from "@/lib/integrations/google-oauth";

/** Manda a la persona a autorizar Google (con la app del panel o la suya). Solo modo local. */
export async function GET(req: Request) {
  if (!isLocalMode()) return Response.json({ error: "Solo en modo local" }, { status: 404 });
  if (!(await isViewerRequest(req))) return unauthorized();
  // Solo desde el propio panel: un link en otro sitio no arranca el permiso de Google.
  if (req.headers.get("sec-fetch-site") === "cross-site") return unauthorized();
  // Tu propia app si ya la guardaste; si no, la app «Alto Dashboard» de Alto House.
  if ((await ensureGoogleClient()) === "missing") {
    return Response.json({ error: "No se pudo obtener la app de Google del panel. Revisa tu conexión a internet o usa tu propia app (avanzado)." }, { status: 503 });
  }
  const url = new URL(req.url);
  const origin = requestOrigin(req);
  const client = oauthClient(origin);
  const { codeVerifier, codeChallenge } = await client.generateCodeVerifierAsync();
  const state = randomBytes(24).toString("base64url");
  const scope = url.searchParams.get("ads") === "1" ? [...BASE_SCOPES, ADS_SCOPE] : BASE_SCOPES;
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256" as never,
  });
  const back = url.searchParams.get("back") === "/ajustes" ? "/ajustes" : "/setup";
  const res = NextResponse.redirect(authUrl);
  res.cookies.set(OAUTH_COOKIE, startFlow({ state, verifier: codeVerifier as string, back, origin }), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: OAUTH_TTL_S, secure: false,
  });
  return res;
}
