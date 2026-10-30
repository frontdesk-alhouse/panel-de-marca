import { WorkspaceProvider } from "@/components/providers/WorkspaceProvider";
import { loadWorkspace } from "@/lib/workspace/load";
import { toPublic } from "@/lib/workspace/schema";
import { setupCompletedAt, ws } from "@/lib/workspace/store";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { bodyFont, displayFont } from "@brand-fonts";
import { Fragment_Mono } from "next/font/google";
import "./globals.css";
import { getViewer } from "@/auth";
import { signOut } from "@/auth";
import { isLocalMode } from "@/lib/mode";
import { hiddenNavHrefs } from "@/lib/integrations/features";
import { I18nProvider } from "@/i18n/client";
import { getLang } from "@/i18n/server";
import { messages } from "@/i18n";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { frameBootScript } from "@/lib/appearance/presets";

// Titulares y texto: los de la marca si existen, si no los abiertos (ver next.config.ts).
const fragmentMono = Fragment_Mono({ variable: "--font-fragment-mono", weight: "400", subsets: ["latin"], display: "swap" });

/** Configuración de la marca para el layout; null si aún no existe (el layout no debe tumbarse). */
async function currentWorkspace() {
  try {
    return (await loadWorkspace()) ? ws() : null;
  } catch (err) {
    console.error("[workspace]", err);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const name = (await currentWorkspace())?.brand.name;
  const t = messages(await getLang());
  return {
    title: name ? t.shell.title(name) : t.shell.defaultTitle,
    description: name ? t.shell.description(name) : t.shell.defaultDescription,
    robots: { index: false, follow: false },
  };
}

async function logout() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [viewer, workspace, lang] = await Promise.all([getViewer(), currentWorkspace(), getLang()]);
  const local = isLocalMode();
  // Local: mientras la configuración inicial no termina, /setup va a pantalla completa (sin menú).
  const path = local ? (await headers()).get("x-panel-path") ?? "" : "";
  const inSetup = local && (!workspace || !setupCompletedAt() || path.startsWith("/setup"));
  // Local: sin login ni «Salir»; se muestra el nombre de quien configuró la marca.
  const shown = viewer && local && workspace?.brand.owner ? { ...viewer, name: workspace.brand.owner } : viewer;
  return (
    <html lang={lang} className={`${displayFont.variable} ${bodyFont.variable} ${fragmentMono.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* Fondo elegido en este navegador antes de pintar (texto fijo generado de los presets). */}
        <script dangerouslySetInnerHTML={{ __html: frameBootScript("ah-panel-frame") }} />
      </head>
      <body className="shader-frame min-h-dvh p-2 md:p-3" suppressHydrationWarning>
        <ThemeProvider>
          <I18nProvider lang={lang}>
          <WorkspaceProvider value={workspace ? toPublic(workspace) : null}>
          {shown && workspace && !inSetup ? (
            <div className="bg-background rounded-[20px] min-h-[calc(100dvh-1rem)] md:min-h-[calc(100dvh-1.5rem)] shadow-[0_1px_0_rgb(255_255_255/0.6)_inset]">
              <AppShell viewer={{ name: shown.name, email: shown.email }} logout={local ? undefined : logout} nav={local ? { hidden: hiddenNavHrefs(), showSettings: true } : undefined}>{children}</AppShell>
            </div>
          ) : (
            children
          )}
          <Toaster />
          </WorkspaceProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
