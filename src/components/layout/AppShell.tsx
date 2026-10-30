"use client";

import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav, useCrumbs, type NavOptions } from "./Sidebar";
import { useT } from "@/i18n/client";
import { ThemeToggle } from "./ThemeToggle";
import { AppLauncher } from "./AppLauncher";
import { SyncNow } from "./SyncNow";
import { ViewModeToggle } from "./ViewModeToggle";
import { Onboarding } from "@/components/onboarding/Onboarding";
import { ShareButton } from "@/components/handoff/ShareButton";
import { PUBLIC_REPO_URL } from "@/lib/skills/catalog";
import { AppearanceMenu } from "./AppearanceMenu";
import { CommunityCard } from "./CommunityCard";
import { UpdateNotice } from "./UpdateNotice";
import { useLogo } from "./appearance";

interface Viewer { name: string; email: string }

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "AH";

const COLLAPSE_KEY = "ah-panel-sidebar-collapsed";

function Brand({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const name = useWorkspace().brand.name;
  const logo = useLogo();
  const mark = logo && <img src={logo} alt="" className={compact ? "h-8 w-8 rounded-md object-contain" : "h-7 w-7 shrink-0 rounded-md object-contain"} />;
  if (compact) return <Link href="/" aria-label={`${name} · ${t.connect.home}`} className="mx-auto font-display text-lg leading-none text-foreground">{mark || initials(name)}</Link>;
  return (
    <Link href="/" className="flex items-center gap-2 px-2.5 text-foreground">
      {mark}
      <span className="truncate font-display text-lg leading-none">{name}</span>
      <span className="font-mono text-[11px] uppercase text-muted-foreground">{t.shell.panel}</span>
    </Link>
  );
}

function UserBox({ viewer, logout, compact = false }: { viewer: Viewer; logout?: () => Promise<void>; compact?: boolean }) {
  const t = useT();
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground" title={viewer.name}>{initials(viewer.name)}</span>
        <AppearanceMenu />
        <ThemeToggle />
        {logout && (
          <form action={logout}>
            <button type="submit" aria-label={t.shell.logout} title={t.shell.logout} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground"><LogOut className="h-4 w-4" aria-hidden /></button>
          </form>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl bg-card p-2">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground" aria-hidden>{initials(viewer.name)}</span>
      <span className="min-w-0 flex-1 truncate text-sm" title={viewer.email}>{viewer.name}</span>
      <AppearanceMenu />
      <ThemeToggle />
      {logout && (
        <form action={logout}>
          <button type="submit" aria-label={t.shell.logout} title={t.shell.logout} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground">
            <LogOut className="h-4 w-4" aria-hidden />
          </button>
        </form>
      )}
    </div>
  );
}

function Crumbs() {
  const { area, section, Icon } = useCrumbs();
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
      <span className={section ? "text-muted-foreground" : "font-medium"}>{area.label}</span>
      {section && <><span className="text-muted-foreground/60">/</span><span className="truncate font-medium">{section.label.replace(" · Clarity", "")}</span></>}
    </p>
  );
}

/** Campo para preguntarle al analista desde cualquier página: abre el chat con la pregunta. */
function AskBox() {
  const t = useT();
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form role="search" className="relative hidden md:block" onSubmit={(e) => { e.preventDefault(); if (q.trim()) { router.push(`/?q=${encodeURIComponent(q.trim())}`); setQ(""); } }}>
      <label htmlFor="ask" className="sr-only">{t.shell.ask}</label>
      <Sparkles className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input id="ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.shell.ask} maxLength={500}
        className="h-9 w-72 rounded-lg bg-card pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-96" />
    </form>
  );
}

/**
 * Estructura del panel: barra lateral fija en escritorio (panel deslizable en
 * celular), encabezado pegajoso con la ruta y el buscador, y el contenido.
 */
export function AppShell({ viewer, logout, nav, children }: { viewer: Viewer; logout?: () => Promise<void>; nav?: NavOptions; children: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    // Preferencia guardada en este navegador; se lee después de hidratar.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage una sola vez
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch { /* sin almacenamiento */ }
  }, []);
  const toggle = () => setCollapsed((c) => {
    try { localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1"); } catch { /* sin almacenamiento */ }
    return !c;
  });
  return (
    <div className="flex min-h-[calc(100dvh-1rem)] md:min-h-[calc(100dvh-1.5rem)]">
      <aside className={`sticky top-3 hidden h-[calc(100dvh-1.5rem)] shrink-0 flex-col gap-6 rounded-l-[20px] border-r border-border bg-background py-5 lg:flex ${collapsed ? "w-16 px-2" : "w-64 px-3"}`}>
        <Brand compact={collapsed} />
        <div className="min-h-0 flex-1 overflow-y-auto"><Suspense fallback={null}><SidebarNav collapsed={collapsed} {...nav} /></Suspense></div>
        {!collapsed && <CommunityCard />}
        {!collapsed && <ViewModeToggle />}
        <UserBox viewer={viewer} logout={logout} compact={collapsed} />
      </aside>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 gap-6 p-4">
          <SheetTitle className="sr-only">{t.shell.navigation}</SheetTitle>
          <Brand />
          <div className="min-h-0 flex-1 overflow-y-auto"><Suspense fallback={null}><SidebarNav onNavigate={() => setOpen(false)} {...nav} /></Suspense></div>
          <ViewModeToggle />
          <UserBox viewer={viewer} logout={logout} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 rounded-tr-[20px] border-b border-border/60 glass-bar px-4 md:px-8">
          <button type="button" onClick={() => setOpen(true)} aria-label={t.shell.openNav} className="grid h-9 w-9 place-items-center rounded-md hover:bg-card lg:hidden">
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" onClick={toggle} aria-label={collapsed ? t.shell.showSidebar : t.shell.hideSidebar} title={collapsed ? t.shell.showSidebar : t.shell.hideSidebar}
            aria-pressed={collapsed} className="hidden h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground lg:grid">
            {collapsed ? <PanelLeftOpen className="h-5 w-5" aria-hidden /> : <PanelLeftClose className="h-5 w-5" aria-hidden />}
          </button>
          <Suspense fallback={null}><Crumbs /></Suspense>
          <div className="ml-auto flex items-center gap-2"><UpdateNotice /><AskBox /><SyncNow /><ShareButton url={PUBLIC_REPO_URL} title={t.shell.defaultTitle} text={t.share.text} label={t.share.button} copiedLabel={t.share.copied} failedLabel={t.skills.copyFailed} isCompact /><AppLauncher /></div>
        </header>
        <Onboarding />
        <main className={`mx-auto w-full min-w-0 px-4 py-8 md:px-8 md:py-10 ${collapsed ? "max-w-[1600px]" : "max-w-[1320px]"}`}>{children}</main>
      </div>
    </div>
  );
}
