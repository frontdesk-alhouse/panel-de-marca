/** Estructura del panel: tres áreas; cada área agrupa sus secciones. */
export interface NavItem { href: string; label: string }
export interface NavArea { key: "inicio" | "resumen" | "negocio" | "estrategia" | "website" | "social" | "crm" | "skills"; href: string; label: string; sections: NavItem[] }

export const AREAS: NavArea[] = [
  { key: "inicio", href: "/", label: "Inicio", sections: [] },
  { key: "resumen", href: "/resumen", label: "Resumen", sections: [] },
  {
    // Negocio junta datos de varias fuentes (CRM, anuncios, sitio) para ver clientes e ingreso.
    key: "negocio", href: "/negocio", label: "Negocio", sections: [
      { href: "/negocio", label: "Métricas de negocio" },
      { href: "/crm", label: "CRM" },
    ],
  },
  { key: "estrategia", href: "/estrategia", label: "Estrategia", sections: [] },
  {
    key: "website", href: "/calificacion", label: "Website", sections: [
      { href: "/calificacion", label: "Calificación" },
      { href: "/trafico", label: "Tráfico" },
      { href: "/seo", label: "SEO" },
      { href: "/seo/ia", label: "Visibilidad en IA" },
      { href: "/ideas", label: "Ideas" },
      { href: "/anuncios", label: "Google Ads" },
      { href: "/comportamiento", label: "Comportamiento · Clarity" },
      { href: "/sitio", label: "Sitio" },
      { href: "/competencia", label: "Competencia" },
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
  { key: "skills", href: "/skills", label: "Skills", sections: [] },
];

export function areaFor(pathname: string): NavArea {
  if (pathname === "/") return AREAS[0];
  return AREAS.find((a) => a.href !== "/" && (pathname.startsWith(a.href) || a.sections.some((s) => pathname.startsWith(s.href)))) ?? AREAS[0];
}
