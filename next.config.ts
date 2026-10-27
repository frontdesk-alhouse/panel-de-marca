import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * Tipografías: las de la marca si existen en src/app/fonts/brand/ (carpeta fuera de git,
 * con licencia propia), si no las abiertas de src/app/fonts/open.ts.
 */
const brandFonts = path.join(process.cwd(), "src/app/fonts/brand/index.ts");
const fontsModule = existsSync(brandFonts) ? "./src/app/fonts/brand/index.ts" : "./src/app/fonts/open.ts";

/**
 * Encabezados de seguridad. Mínimos a propósito: no bloquean los scripts de Next ni el
 * login de Google, pero impiden meter el panel en un iframe ajeno (clickjacking),
 * plugins y cambios de <base>. HSTS solo en Vercel: el modo local corre en http.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  ...(process.env.VERCEL ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: { resolveAlias: { "@brand-fonts": fontsModule } },
  poweredByHeader: false,
  headers: async () => [{ source: "/:path*", headers: securityHeaders }],
};

export default nextConfig;
