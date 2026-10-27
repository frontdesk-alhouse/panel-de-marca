import {
  Award, BadgeDollarSign, Briefcase, Camera, Contact, Gauge, Globe, LayoutDashboard, Lightbulb, Megaphone, MousePointerClick,
  Search, Share2, Sparkles, Target, Trophy, Users, type LucideIcon,
} from "lucide-react";

/** Ícono de cada área y sección (por ruta): un mismo ícono en barra lateral, encabezado y tarjetas. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  "/": Sparkles,
  "/resumen": LayoutDashboard,
  "/negocio": Briefcase,
  "/estrategia": Target,
  "/trafico": Users, "/seo": Search, "/ideas": Lightbulb, "/anuncios": Megaphone, "/comportamiento": MousePointerClick,
  "/sitio": Gauge, "/competencia": Trophy, "/calificacion": Award,
  "/social": Share2, "/social/instagram": Camera, "/social/paid": BadgeDollarSign, "/social/competencia": Trophy,
  "/crm": Contact,
  website: Globe, social: Share2,
};
