import { loadScorecard } from "@/lib/scorecard/load";
import type { Insight } from "../insights";
import type { Period } from "../period";
import { loadAds } from "./ads";
import { loadBehavior } from "./behavior";
import { loadGoogleAds } from "./gads";
import { loadSocial } from "./social";
import { loadGoals } from "./goals";
import { loadActivity } from "./activity";
import { loadCompetition } from "./competition";
import { loadSeo } from "./seo";
import { loadSite } from "./site";
import { loadTraffic } from "./traffic";

export interface SectionSummary {
  id: string;
  title: string;
  href: string;
  question: string;
  insights: Insight[];
}

export interface FocusItem extends Insight {
  section: string;
  href: string;
}

const TONE_RANK = { bad: 0, watch: 1, good: 2 } as const;

export async function loadOverview(p: Period) {
  const [traffic, seo, site, ads, gads, behavior, social, competition, score] = await Promise.all([
    loadTraffic(p), loadSeo(p), loadSite(p), loadAds(p), loadGoogleAds(p), loadBehavior(p), loadSocial(p), loadCompetition(), loadScorecard(),
  ]);

  const [goals, activity] = await Promise.all([loadGoals(gads, social).catch(() => []), loadActivity().catch(() => [])]);

  const sections: SectionSummary[] = [
    { id: "trafico", title: "Tráfico y audiencia", href: "/trafico", question: "¿Quién llega y de dónde?", insights: traffic.insights },
    { id: "seo", title: "SEO", href: "/seo", question: "¿Te encuentran en Google?", insights: seo.insights },
    { id: "anuncios", title: "Google Ads", href: "/anuncios", question: "¿Los anuncios de Google traen clientes?", insights: gads.connected ? gads.insights : ads.insights },
    { id: "comportamiento", title: "Comportamiento (Clarity)", href: "/comportamiento", question: "¿Dónde se frustra la gente en tu sitio?", insights: behavior.insights },
    { id: "sitio", title: "Sitio", href: "/sitio", question: "¿Qué hace la gente al llegar?", insights: site.insights },
    { id: "social", title: "Social media", href: "/social", question: "¿Instagram y Meta te acercan a clientes?", insights: social.insights },
    { id: "competencia", title: "Competencia", href: "/competencia", question: "¿Cómo estás frente a tu competencia?", insights: competition.insights },
  ];

  // En qué concentrarte: lo que hay que atender primero en todo el panel, sin repetir.
  const focus: FocusItem[] = sections
    .flatMap((s) => s.insights.filter((i) => i.tone !== "good").map((i) => ({ ...i, section: s.title, href: s.href })))
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1) || TONE_RANK[a.tone] - TONE_RANK[b.tone])
    .slice(0, 6);

  return {
    sections,
    focus,
    traffic,
    kpis: {
      sessions: traffic.kpis.sessions,
      contacts: site.kpis.contacts,
      organicClicks: seo.kpis.clicks,
      paidShare: ads.compare.paid.sessions + ads.compare.organic.sessions > 0
        ? ads.compare.paid.sessions / (ads.compare.paid.sessions + ads.compare.organic.sessions)
        : null,
    },
    refs: { sessions: traffic.refs.sessions, contacts: site.refs.contacts, clicks: seo.refs.clicks, paidShare: ads.refs.share },
    contactsDetail: site.contactsDetail,
    behavior: behavior.connected ? behavior.total : null,
    goals,
    activity,
    comparable: { traffic: traffic.comparable, site: site.comparable, seo: seo.comparable },
    leadsNotTracked: site.funnel[2].value > 0 && site.funnel[3].value === 0,
    score,
  };
}
