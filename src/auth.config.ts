import type { NextAuthConfig } from "next-auth";

/** Bypass de login SOLO en `next dev` con AUTH_DEV_BYPASS=1; en producción NODE_ENV lo anula. */
export function isDevBypass(): boolean {
  return process.env.NODE_ENV === "development" && process.env.AUTH_DEV_BYPASS === "1";
}

// Config compatible con edge: sin base de datos ni imports de Node.
export const authConfig: NextAuthConfig = {
  // Vercel y el proxy local van detrás de un host conocido; Auth.js exige declararlo.
  trustHost: true,
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      if (isDevBypass()) return true;
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/login")) return true;
      return Boolean(auth?.user);
    },
  },
};
