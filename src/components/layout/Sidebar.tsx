"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { AREAS, areaFor, type NavArea } from "@/lib/nav/sections";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";
import { useT } from "@/i18n/client";

/** Áreas y secciones con sus nombres en el idioma del panel. */
function useAreas(): NavArea[] {
  const t = useT();
  return AREAS.map((a) => ({ ...a, label: t.nav.areas[a.key], sections: a.sections.map((s) => ({ ...s, label: t.nav.items[s.href] ?? s.label })) }));
}

function useHref() {
  const p = useSearchParams().get("p");
  return (href: string) => (p ? `${href}?p=${p}` : href);
}

/** Activa una sección: la primera de un área comparte ruta con ella y solo cuenta con la ruta exacta. */
export function isActive(pathname: string, href: string, area: NavArea) {
  if (href === "/") return pathname === "/";
  if (href === area.href && area.sections.length) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const item = "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition";

/** Navegación lateral: áreas con sus secciones e íconos (estilo de las herramientas de análisis). */
export interface NavOptions {
  /** Secciones escondidas (funciones avanzadas sin conectar, en modo local). */
  hidden?: string[];
  /** Muestra «Ajustes» al final (modo local). */
  showSettings?: boolean;
}

export function SidebarNav({ onNavigate, collapsed = false, hidden = [], showSettings = false }: { onNavigate?: () => void; collapsed?: boolean } & NavOptions) {
  const pathname = usePathname();
  const current = areaFor(pathname);
  const withP = useHref();
  const t = useT();
  const areas = useAreas();
  return (
    <nav aria-label={t.nav.sections} className={collapsed ? "space-y-3" : "space-y-5"}>
      {areas.map((a) => {
        const Icon = NAV_ICONS[a.href];
        if (!a.sections.length) {
          const active = isActive(pathname, a.href, a);
          return (
            <Link key={a.key} href={withP(a.href)} onClick={onNavigate} aria-current={active ? "page" : undefined}
              title={collapsed ? a.label : undefined} aria-label={collapsed ? a.label : undefined}
              className={cn(item, collapsed && "justify-center px-0", active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-card hover:text-foreground")}>
              {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}{!collapsed && a.label}
            </Link>
          );
        }
        const GroupIcon = NAV_ICONS[a.key];
        return (
          <div key={a.key} className="space-y-1">
            {collapsed
              ? <hr className="mx-2 border-border" aria-hidden />
              : <p className={cn("flex items-center gap-2 px-2.5 font-mono text-[10px] uppercase", current.key === a.key ? "text-foreground" : "text-muted-foreground")}>
                  {GroupIcon && <GroupIcon className="h-3.5 w-3.5" aria-hidden />}{a.label}
                </p>}
            <ul className="space-y-0.5">
              {a.sections.filter((s) => !hidden.includes(s.href)).map((s) => {
                const active = isActive(pathname, s.href, a);
                const SIcon = NAV_ICONS[s.href];
                return (
                  <li key={s.href}>
                    <Link href={withP(s.href)} onClick={onNavigate} aria-current={active ? "page" : undefined}
                      title={collapsed ? `${a.label} · ${s.label}` : undefined} aria-label={collapsed ? `${a.label}: ${s.label}` : undefined}
                      className={cn(item, collapsed && "justify-center px-0", active ? "bg-primary text-primary-foreground" : "text-foreground/75 hover:bg-card hover:text-foreground")}>
                      {SIcon && <SIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />}
                      {!collapsed && <span className="truncate">{s.label.replace(" · Clarity", "")}</span>}
                      {!collapsed && s.label.includes("Clarity") && <span className={cn("ml-auto font-mono text-[9px] uppercase", active ? "opacity-70" : "text-muted-foreground")}>Clarity</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      {showSettings && (() => {
        const active = pathname.startsWith("/ajustes");
        return (
          <Link href="/ajustes" onClick={onNavigate} aria-current={active ? "page" : undefined}
            title={collapsed ? t.nav.settings : undefined} aria-label={collapsed ? t.nav.settings : undefined}
            className={cn(item, collapsed && "justify-center px-0", active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-card hover:text-foreground")}>
            <Settings className="h-4 w-4 shrink-0" aria-hidden />{!collapsed && t.nav.settings}
          </Link>
        );
      })()}
    </nav>
  );
}

/** Ruta legible para el encabezado: «Website / Tráfico». */
export function useCrumbs() {
  const pathname = usePathname();
  const areas = useAreas();
  const key = areaFor(pathname).key;
  const area = areas.find((a) => a.key === key) ?? areas[0];
  const section = area.sections.find((s) => isActive(pathname, s.href, area));
  return { area, section, Icon: NAV_ICONS[section?.href ?? area.href] };
}
