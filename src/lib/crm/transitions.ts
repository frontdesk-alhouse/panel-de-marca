import type { LEAD_OUTCOMES, LEAD_STAGES } from "@/db/schema";

type Stage = (typeof LEAD_STAGES)[number];
type Outcome = (typeof LEAD_OUTCOMES)[number];

interface Dates { proposalAt: Date | null; closedAt: Date | null }

/**
 * Fechas y resultado que se derivan de la etapa: así la calificación (tiempo a
 * propuesta, tasa de cierre) sale del CRM sin captura doble.
 */
export function deriveFromStage(stage: Stage, current: Dates, now = new Date()): Dates & { outcome: Outcome | null } {
  const proposalAt = current.proposalAt ?? (stage === "propuesta" || stage === "cerrado" ? now : null);
  if (stage === "cerrado") return { proposalAt, closedAt: current.closedAt ?? now, outcome: "ganado" };
  if (stage === "perdido") return { proposalAt: current.proposalAt, closedAt: current.closedAt ?? now, outcome: "perdido" };
  return { proposalAt, closedAt: null, outcome: null };
}

/** Siguiente paso vencido: tiene fecha y ya pasó, y el prospecto sigue abierto. */
export function isOverdue(nextStepAt: string | null, stage: Stage, today: string): boolean {
  return Boolean(nextStepAt && nextStepAt < today && stage !== "cerrado" && stage !== "perdido");
}
