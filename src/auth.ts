import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { authConfig, isDevBypass } from "@/auth.config";
import { isEmailAllowed, parseAllowlist } from "@/lib/allowlist";
import { isLocalMode } from "@/lib/mode";
import { isLoopbackHost } from "@/lib/local/guard";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Solo correos verificados de la lista blanca ALLOWED_EMAILS.
    signIn({ profile }) {
      if (!profile?.email || profile.email_verified !== true) return false;
      return isEmailAllowed(profile.email, parseAllowlist(process.env.ALLOWED_EMAILS));
    },
  },
});

export interface Viewer {
  name: string;
  email: string;
  image?: string | null;
}

export const LOCAL_VIEWER: Viewer = { name: "Local", email: "local@localhost" };

/** En modo local no hay login: la persona es quien está en esta computadora. */
async function localViewer(): Promise<Viewer | null> {
  try {
    const { headers } = await import("next/headers");
    return isLoopbackHost((await headers()).get("host")) ? LOCAL_VIEWER : null;
  } catch {
    return null; // fuera de un pedido (build, scripts): nadie
  }
}

/** Usuario actual para páginas y rutas. En dev con bypass o en modo local devuelve un usuario local. */
export async function getViewer(): Promise<Viewer | null> {
  if (isLocalMode()) return localViewer();
  if (isDevBypass()) return { name: "Desarrollo local", email: "dev@localhost" };
  const session = await auth();
  if (!session?.user?.email) return null;
  return { name: session.user.name ?? session.user.email, email: session.user.email, image: session.user.image };
}
