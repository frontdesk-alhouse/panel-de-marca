import {
  Award, BadgeDollarSign, BookOpen, Bot, Briefcase, Camera, Contact, Gauge, Globe, LayoutDashboard, Lightbulb, Megaphone, MousePointerClick,
  Puzzle, Search, Share2, Sparkles, Target, Trophy, Users, type LucideIcon,
} from "lucide-react";

/** Ícono de cada área y sección (por ruta): un mismo ícono en barra lateral, encabezado y tarjetas. */
export const NAV_ICONS: Record<string, LucideIcon> = {
  "/": Sparkles,
  "/resumen": LayoutDashboard,
  "/negocio": Briefcase,
  "/estrategia": Target,
  "/trafico": Users, "/seo": Search, "/seo/ia": Bot, "/ideas": Lightbulb, "/anuncios": Megaphone, "/comportamiento": MousePointerClick,
  "/sitio": Gauge, "/competencia": Trophy, "/calificacion": Award,
  "/social": Share2, "/social/instagram": Camera, "/social/paid": BadgeDollarSign, "/social/competencia": Trophy,
  "/crm": Contact,
  "/skills": Puzzle, "/guia": BookOpen,
  website: Globe, social: Share2, negocio: Briefcase,
};
