/** Mensaje del chat tal como lo guarda la pantalla. */
export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  /** Mensaje de falla de la pantalla («no se pudo conectar»): no es parte de la conversación. */
  error?: boolean;
  proposals?: { summary: string }[];
}

export const MAX_TURNS = 40;
export const MAX_CHARS = 12_000;

/**
 * Lo que se le manda a la API: nunca algo que rechace. Quita los mensajes de falla, convierte
 * una respuesta que solo trajo propuestas en texto, recorta los muy largos, junta mensajes
 * seguidos del mismo rol, empieza siempre por la persona y se queda con los últimos 40.
 */
export function toApiHistory(msgs: readonly ChatMsg[]): { role: "user" | "assistant"; content: string }[] {
  const clean = msgs
    .filter((m) => !m.error)
    .map((m) => {
      const text = m.content.trim() || (m.proposals?.length ? `(Propuse: ${m.proposals.map((p) => p.summary).join("; ")})` : "");
      return { role: m.role, content: text };
    })
    .filter((m) => m.content);
  const merged: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of clean) {
    const last = merged.at(-1);
    if (last && last.role === m.role) merged[merged.length - 1] = { role: m.role, content: `${last.content}\n\n${m.content}` };
    else merged.push(m);
  }
  let out = merged.slice(-MAX_TURNS).map((m) => ({ role: m.role, content: m.content.length > MAX_CHARS ? `${m.content.slice(0, MAX_CHARS - 1)}…` : m.content }));
  while (out.length && out[0].role !== "user") out = out.slice(1);
  return out;
}
