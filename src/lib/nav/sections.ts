/** Estructura del panel: tres áreas; cada área agrupa sus secciones. */
export interface NavItem { href: string; label: string }
export interface NavArea { key: "inicio" | "resumen" | "negocio" | "estrategia" | "website" | "social" | "crm"; href: string; label: string; sections: NavItem[] }

export const AREAS: NavArea[] = [
  { key: "inicio", href: "/", label: "Inicio", sections: [] },
  { key: "resumen", href: "/resumen", label: "Resumen", sections: [] },
  { key: "negocio", href: "/negocio", label: "Negocio", sections: [] },
  { key: "estrategia", href: "/estrategia", label: "Estrategia", sections: [] },
  {
    key: "website", href: "/trafico", label: "Website", sections: [
      { href: "/trafico", label: "Tráfico" },
      { href: "/seo", label: "SEO" },
      { href: "/ideas", label: "Ideas" },
      { href: "/anuncios", label: "Google Ads" },
      { href: "/comportamiento", label: "Comportamiento · Clarity" },
      { href: "/sitio", label: "Sitio" },
      { href: "/competencia", label: "Competencia" },
      { href: "/calificacion", label: "Calificación" },
    ],
  },
  {
    key: "social", href: "/social", label: "Social media", sections: [
      { href: "/social", label: "General" },
      { href: "/social/instagram", label: "Instagram orgánico" },
      { href: "/social/paid", label: "Instagram paid" },
      { href: "/social/competencia", label: "Competencia" },
    ],
  },
  { key: "crm", href: "/crm", label: "CRM", sections: [] },
];

export function areaFor(pathname: string): NavArea {
  if (pathname === "/") return AREAS[0];
  return AREAS.find((a) => a.href !== "/" && (pathname.startsWith(a.href) || a.sections.some((s) => pathname.startsWith(s.href)))) ?? AREAS[0];
}
