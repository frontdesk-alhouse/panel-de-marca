import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * Tipografías: las de la marca si existen en src/app/fonts/brand/ (carpeta fuera de git,
 * con licencia propia), si no las abiertas de src/app/fonts/open.ts.
 */
const brandFonts = path.join(process.cwd(), "src/app/fonts/brand/index.ts");
const fontsModule = existsSync(brandFonts) ? "./src/app/fonts/brand/index.ts" : "./src/app/fonts/open.ts";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: { resolveAlias: { "@brand-fonts": fontsModule } },
};

export default nextConfig;
