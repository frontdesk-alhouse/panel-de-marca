"use client";

import Link from "next/link";
import { Settings } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { AREAS, areaFor, type NavArea } from "@/lib/nav/sections";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./nav-icons";
import { useT } from "@/i18n/client";
import { isTechnical } from "@/lib/nav/guide";
import { SectionInfo } from "./SectionInfo";
import { useViewMode } from "./view-mode";

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
  const under = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
  if (!under(href)) return false;
  // Una subsección más específica gana (/seo/ia no enciende también /seo).
  return !area.sections.some((s) => s.href !== href && s.href.startsWith(`${href}/`) && under(s.href));
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
  const isSimple = useViewMode() === "simple";
  // Vista simple: fuera lo técnico (y los grupos que se queden vacíos).
  const areas = useAreas()
    .filter((a) => !(isSimple && !a.sections.length && isTechnical(a.href)))
    .map((a) => ({ ...a, sections: a.sections.filter((s) => !hidden.includes(s.href) && !(isSimple && isTechnical(s.href))) }))
    .filter((a) => a.sections.length || !AREAS.find((x) => x.key === a.key)?.sections.length);
  const tech = (href: string, active: boolean) => !collapsed && !isSimple && isTechnical(href) && (
    <span className={cn("ml-auto font-mono text-[9px] uppercase", active ? "opacity-70" : "text-muted-foreground")} title={t.guide.technicalHint}>{t.guide.technical}</span>
  );
  return (
    <nav aria-label={t.nav.sections} className={collapsed ? "space-y-3" : "space-y-1.5"}>
      {areas.map((a) => {
        const Icon = NAV_ICONS[a.href];
        if (!a.sections.length) {
          const active = isActive(pathname, a.href, a);
          return (
            <div key={a.key} className="group/row relative flex items-center">
              <Link href={withP(a.href)} onClick={onNavigate} aria-current={active ? "page" : undefined}
                title={collapsed ? a.label : undefined} aria-label={collapsed ? a.label : undefined}
                className={cn(item, "flex-1", !collapsed && "pr-9", collapsed && "justify-center px-0", active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-card hover:text-foreground")}>
                {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}{!collapsed && a.label}{tech(a.href, active)}
              </Link>
              {!collapsed && <SectionInfo href={a.href} label={a.label} className={cn("absolute right-1 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100", active && "text-primary-foreground/80 hover:text-foreground")} />}
            </div>
          );
        }
        const GroupIcon = NAV_ICONS[a.key];
        const inGroup = current.key === a.key;
        return (
          <div key={a.key} className="space-y-0.5">
            {collapsed
              ? <hr className="mx-2 border-border" aria-hidden />
              : <p className={cn("flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium", inGroup ? "text-foreground" : "text-foreground/80")}>
                  {GroupIcon && <GroupIcon className="h-4 w-4 shrink-0" aria-hidden />}{a.label}
                </p>}
            {/* Las secciones cuelgan del grupo: sangría y una línea guía muestran que son parte de él. */}
            <ul className={cn("space-y-0.5", !collapsed && "ml-[1.15rem] border-l border-border pl-2")}>
              {a.sections.map((s) => {
                const active = isActive(pathname, s.href, a);
                const SIcon = NAV_ICONS[s.href];
                return (
                  <li key={s.href} className="group/row relative flex items-center">
                    <Link href={withP(s.href)} onClick={onNavigate} aria-current={active ? "page" : undefined}
                      title={collapsed ? `${a.label} · ${s.label}` : undefined} aria-label={collapsed ? `${a.label}: ${s.label}` : undefined}
                      className={cn(item, "flex-1 py-1.5", !collapsed && "pr-9", collapsed && "justify-center px-0", active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-card hover:text-foreground")}>
                      {collapsed && SIcon && <SIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />}
                      {!collapsed && <span className="truncate">{s.label.replace(" · Clarity", "")}</span>}
                      {tech(s.href, active)}
                    </Link>
                    {!collapsed && <SectionInfo href={s.href} label={s.label.replace(" · Clarity", "")} className={cn("absolute right-1 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100", active && "text-primary-foreground/80 hover:text-foreground")} />}
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
