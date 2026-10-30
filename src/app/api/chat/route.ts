import { isViewerRequest, requireWorkspace } from "@/lib/api-auth";
import { localeSettings } from "@/lib/workspace/store";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { assistantSystem } from "@/lib/assistant/context";
import { assistantTools } from "@/lib/assistant/tools";
import { COPILOT_LABELS, copilotTools } from "@/lib/assistant/copilot";
import { getViewer } from "@/auth";
import { CHAT_MODELS } from "@/lib/assistant/weekly";
import { todayIso } from "@/lib/dates";
import { toApiHistory } from "@/lib/assistant/chat-history";

export const maxDuration = 300;

const Body = z.object({
  model: z.enum(["sonnet", "opus"]).default("sonnet"),
  // Holgado al recibir: el historial se limpia con toApiHistory (vacíos, larguísimos, roles seguidos).
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(200_000) })).min(1).max(400),
  /** Página que la persona tiene abierta (columna del copiloto). Solo rutas internas. */
  page: z.object({ path: z.string().regex(/^\/[a-z0-9/_-]*$/i).max(120), title: z.string().max(80) }).optional(),
});

/** Mensaje de sistema con la página abierta: así «esto» o «esta gráfica» tiene referente. */
function pageNote(page?: { path: string; title: string }): string {
  if (!page) return "";
  const title = page.title.replace(/[\n\r]/g, " ").slice(0, 80);
  return ` La persona tiene abierta la página «${title}» (${page.path}) del panel: si dice «esto», «esta página» o «esta gráfica», se refiere a ella; lee esa sección antes de responder.`;
}

/** Etiqueta legible de lo que el asistente está consultando (se muestra mientras piensa). */
const TOOL_LABEL: Record<string, string> = { leer_seccion: "Leyendo el panel", ultimo_analisis_semanal: "Revisando el análisis semanal", plan_de_medios: "Revisando el plan de medios", ...COPILOT_LABELS };

/**
 * Chat del panel: Claude con herramientas de lectura y un copiloto que propone cambios (se aplican solo con el botón «Aplicar»).
 * Responde un stream NDJSON: {type:"text",text} · {type:"tool",label} · {type:"proposal",id,summary} · {type:"done"} · {type:"error",message}.
 */
export async function POST(req: Request) {
  if (!(await isViewerRequest(req))) return Response.json({ error: "No autorizado" }, { status: 401 });
  const missing = await requireWorkspace();
  if (missing) return missing;
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "Falta ANTHROPIC_API_KEY" }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const history = parsed.success ? toApiHistory(parsed.data.messages) : [];
  if (!parsed.success || history.at(-1)?.role !== "user") return Response.json({ error: "Conversación inválida" }, { status: 400 });

  const viewer = (await getViewer())?.email ?? "desconocido";
  const client = new Anthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const runner = client.beta.messages.toolRunner({
          model: CHAT_MODELS[parsed.data.model].id,
          max_tokens: 16000,
          // El sistema fijo se cachea; la fecha va en un mensaje de sistema aparte para no romper el caché.
          system: [{ type: "text", text: assistantSystem(), cache_control: { type: "ephemeral" } }],
          output_config: { effort: "medium" },
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          tools: [...assistantTools(), ...copilotTools({ viewer, onProposal: (p) => send({ type: "proposal", id: p.id, summary: p.summary }) })],
          max_iterations: 10,
          messages: [
            ...history,
            { role: "system", content: `Hoy es ${todayIso()} (zona horaria ${localeSettings().timeZone}).${pageNote(parsed.data.page)}` },
          ],
          stream: true,
        });
        for await (const messageStream of runner) {
          for await (const event of messageStream) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") send({ type: "text", text: event.delta.text });
            if (event.type === "content_block_start" && event.content_block.type === "tool_use") send({ type: "tool", label: TOOL_LABEL[event.content_block.name] ?? "Consultando datos" });
          }
          const message = await messageStream.finalMessage();
          if (message.stop_reason === "refusal") { send({ type: "error", message: "No puedo responder eso. Intenta reformular la pregunta." }); break; }
        }
        send({ type: "done" });
      } catch (e) {
        console.error("[chat]", e);
        const message = e instanceof Anthropic.RateLimitError ? "Demasiadas preguntas seguidas; espera un momento." : "No se pudo completar la respuesta.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
