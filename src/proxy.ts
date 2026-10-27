import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { authConfig } from "@/auth.config";
import { isLocalMode } from "@/lib/mode";
import { localRequestProblem, requestInfo } from "@/lib/local/guard";
import { INSTANCE_HEADER, instanceId, isBindVerified } from "@/lib/local/bind-flag";
import { OAUTH_COOKIE } from "@/lib/integrations/oauth-cookie";

const { auth } = NextAuth(authConfig);
type AuthProxy = (req: NextRequest, ev: NextFetchEvent) => Promise<Response | undefined>;
const authProxy = auth as unknown as AuthProxy;

/** Local: sin login, pero solo pedidos de esta misma computadora. Nube: login con Google. */
function localProxyInner(req: NextRequest): Response {
  if (!isBindVerified()) return new Response("El panel está arrancando; recarga en unos segundos.", { status: 503, headers: { "Retry-After": "2" } });
  const problem = localRequestProblem(requestInfo(req));
  if (problem) {
    console.warn(`[local] pedido rechazado (${problem}): ${req.method} ${req.nextUrl.pathname}`);
    return new Response("Este panel solo se puede abrir desde la misma computadora.", { status: 403 });
  }
  const { pathname, searchParams } = req.nextUrl;
  if (pathname.startsWith("/login")) return NextResponse.redirect(new URL("/", `http://${req.headers.get("host")}`));
  // Regreso de Google: llega a la raíz (forma aceptada para apps de escritorio) y va al callback.
  if (pathname === "/" && searchParams.has("state") && (searchParams.has("code") || searchParams.has("error")) && req.cookies.has(OAUTH_COOKIE)) {
    const target = req.nextUrl.clone();
    target.pathname = "/api/setup/google/callback";
    return NextResponse.rewrite(target);
  }
  // El layout necesita saber si es /setup (va a pantalla completa, sin menú).
  const headers = new Headers(req.headers);
  headers.set(PATH_HEADER, pathname);
  return NextResponse.next({ request: { headers } });
}

/** Cada respuesta lleva el identificador de este panel (ver bind-check). */
function localProxy(req: NextRequest): Response {
  const res = localProxyInner(req);
  res.headers.set(INSTANCE_HEADER, instanceId());
  return res;
}

/** Ruta del pedido para el layout (solo modo local; ver app/layout.tsx). */
const PATH_HEADER = "x-panel-path";

export default function proxy(req: NextRequest, ev: NextFetchEvent) {
  if (isLocalMode()) return localProxy(req);
  // Nube: igual que antes. Las rutas /api/* verifican su propia autorización (sesión o CRON_SECRET).
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/") || pathname.startsWith("/login")) return NextResponse.next();
  return authProxy(req, ev);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg).*)"],
};
