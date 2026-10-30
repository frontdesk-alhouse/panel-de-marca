import type { DimensionId, MetricDefinition } from "@/lib/scorecard/types";

/**
 * Skills que el panel recomienda y deja descargar. Cada uno vive en `skills/<id>/`
 * (se publica con el repo) y, si tiene repo propio, también en GitHub.
 * Los textos visibles están en i18n (`skills.items[id]`).
 */
export const SKILL_IDS = ["seo-geo", "anuncios-eficiencia", "conversion-medicion"] as const;
export type SkillId = (typeof SKILL_IDS)[number];

export interface SkillEntry {
  id: SkillId;
  /** Repo propio en GitHub, si existe. */
  repoUrl?: string;
  /** Dimensiones de la calificación que ayuda a mover. */
  dimensions: readonly DimensionId[];
  /** Métricas fuera de esas dimensiones que también ayuda a mover. */
  extraMetrics?: readonly string[];
  /** Métricas de esas dimensiones que NO le tocan (las mueve otro skill). */
  skipMetrics?: readonly string[];
}

/** Repo público del panel: lo que se comparte con «Compartir el panel». */
export const PUBLIC_REPO_URL = "https://github.com/frontdesk-alhouse/panel-de-marca";

export const SKILLS: readonly SkillEntry[] = [
  {
    id: "seo-geo",
    repoUrl: "https://github.com/frontdesk-alhouse/seo-geo-skill",
    dimensions: ["visibilidad"],
    extraMetrics: ["lighthouse_seo"],
    skipMetrics: ["gbp_action_rate"],
  },
  {
    id: "anuncios-eficiencia",
    dimensions: ["inversion"],
    extraMetrics: ["paid_conversion", "lead_qualified_rate"],
  },
  {
    id: "conversion-medicion",
    dimensions: ["conversion", "experiencia"],
    extraMetrics: ["engagement_rate"],
    skipMetrics: ["lighthouse_seo", "paid_conversion"],
  },
];

export function isSkillId(id: string): id is SkillId {
  return (SKILL_IDS as readonly string[]).includes(id);
}

export function getSkill(id: string): SkillEntry | undefined {
  return SKILLS.find((s) => s.id === id);
}

/** Skills que ayudan a mover una métrica (puede haber más de uno). */
export function skillsForMetric(metric: Pick<MetricDefinition, "id" | "dimension">): SkillId[] {
  return SKILLS.filter((s) =>
    !s.skipMetrics?.includes(metric.id) && (s.dimensions.includes(metric.dimension) || Boolean(s.extraMetrics?.includes(metric.id))),
  ).map((s) => s.id);
}

/** Skills para una dimensión completa. */
export function skillsForDimension(dimension: DimensionId): SkillId[] {
  return SKILLS.filter((s) => s.dimensions.includes(dimension)).map((s) => s.id);
}

/** Comando para instalar en Claude Code: clonar el repo propio, o bajar el zip del panel. */
export function installCommand(skill: SkillEntry, zipUrl: string): string {
  const dest = `~/.claude/skills/${skill.id}`;
  if (skill.repoUrl) return `git clone ${skill.repoUrl}.git ${dest}`;
  return `mkdir -p ~/.claude/skills && curl -fsSL "${zipUrl}" -o /tmp/${skill.id}.zip && unzip -o /tmp/${skill.id}.zip -d ~/.claude/skills`;
}
