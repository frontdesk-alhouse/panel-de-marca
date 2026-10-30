"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Check, RotateCcw, X } from "lucide-react";
import { Markdown } from "./Markdown";
import { cn } from "@/lib/utils";

type ProposalStatus = "pending" | "applying" | "applied" | "discarded" | "error";
interface Proposal { id: number; summary: string; status: ProposalStatus; result?: string }
interface Msg { role: "user" | "assistant"; content: string; proposals?: Proposal[] }
const STORAGE_KEY = "ah-panel-chat";
const MODEL_KEY = "ah-panel-chat-model";
const MODELS = [{ key: "sonnet", label: "Sonnet 5.5", hint: "Rápido" }, { key: "opus", label: "Opus 5.5", hint: "Más profundo" }] as const;
type ModelKey = (typeof MODELS)[number]["key"];

/** Página que se está viendo: el asistente la usa para entender «esto» o «esta gráfica». */
export interface ChatPage { path: string; title: string }

type Props = {
  suggestions: string[];
  initialQuestion?: string | null;
  /** En la columna lateral: encabezado y estado vacío más compactos, y no toca la URL. */
  compact?: boolean;
  page?: ChatPage;
  /** Avisa que ya se hizo la pregunta inicial (la columna la consume una vez). */
  onInitialAsked?: () => void;
};

/** Chat con el analista del panel. La conversación se guarda solo en este navegador. */
export function Chat({ suggestions, initialQuestion, compact = false, page, onInitialAsked }: Props) {
  const router = useRouter();
  const askedInitial = useRef<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState<ModelKey>("sonnet");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Se restaura después de hidratar (el servidor no ve localStorage); leerlo al iniciar el estado rompería la hidratación.
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con un sistema externo (localStorage) una sola vez
      if (saved) setMessages(JSON.parse(saved) as Msg[]);
      const m = localStorage.getItem(MODEL_KEY);
      if (m === "sonnet" || m === "opus") setModel(m);
    } catch { /* sin almacenamiento: conversación nueva */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40))); } catch { /* sin almacenamiento */ }
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  // Pregunta que llega de fuera (?q= en Inicio, o el buscador hacia la columna): se hace una vez.
  useEffect(() => {
    if (!initialQuestion || askedInitial.current === initialQuestion) return;
    askedInitial.current = initialQuestion;
    if (!compact) router.replace("/");
    onInitialAsked?.();
    void ask(initialQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al llegar con una pregunta nueva
  }, [initialQuestion]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    const history: Msg[] = [...messages, { role: "user", content: q }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setStatus("Pensando");
    // Conserva las propuestas del copiloto: llegan a mitad de la respuesta y el texto sigue después.
    const append = (text: string) => setMessages((m) => [...m.slice(0, -1), { ...m.at(-1)!, content: m.at(-1)!.content + text }]);
    const addProposal = (p: Proposal) => setMessages((m) => [...m.slice(0, -1), { ...m.at(-1)!, proposals: [...(m.at(-1)!.proposals ?? []), p] }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, page, messages: history.slice(-40).map(({ role, content }) => ({ role, content })) }) });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        append(err.error === "Falta ANTHROPIC_API_KEY" ? "El chat aún no está conectado: falta la API key de Anthropic." : "No se pudo conectar con el asistente.");
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const ev = JSON.parse(line) as { type: string; text?: string; label?: string; message?: string; id?: number; summary?: string };
          if (ev.type === "text" && ev.text) { setStatus(null); append(ev.text); }
          else if (ev.type === "tool") setStatus(ev.label ?? "Consultando datos");
          else if (ev.type === "error") append(`\n\n_${ev.message}_`);
          // El copiloto propone un cambio: se muestra con «Aplicar» (nunca se aplica solo).
          else if (ev.type === "proposal" && ev.id && ev.summary) addProposal({ id: ev.id, summary: ev.summary, status: "pending" });
        }
      }
    } catch {
      append("\n\nSe cortó la conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  /** «Aplicar» / «Descartar»: la única forma de que el copiloto cambie el panel. */
  async function decide(msgIndex: number, id: number, decision: "apply" | "discard") {
    const update = (patch: Partial<Proposal>) => setMessages((ms) => ms.map((m, i) => (i !== msgIndex ? m : { ...m, proposals: m.proposals?.map((p) => (p.id === id ? { ...p, ...patch } : p)) })));
    update({ status: "applying" });
    try {
      const res = await fetch("/api/copilot/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, decision }) });
      const body = (await res.json().catch(() => ({}))) as { result?: string; error?: string };
      if (!res.ok) return update({ status: "error", result: body.error ?? "No se pudo aplicar." });
      update({ status: decision === "apply" ? "applied" : "discarded", result: body.result });
      if (decision === "apply") router.refresh();
    } catch {
      update({ status: "error", result: "Se cortó la conexión." });
    }
  }

  const empty = messages.length === 0;
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-card">
      <div className={cn("flex items-center justify-between", compact ? "px-4 pt-3" : "px-5 pt-4")}>
        <div role="radiogroup" aria-label="Modelo" className="inline-flex rounded-lg bg-background p-0.5">
          {MODELS.map((m) => (
            <button key={m.key} type="button" role="radio" aria-checked={model === m.key} disabled={busy} title={m.hint}
              onClick={() => { setModel(m.key); try { localStorage.setItem(MODEL_KEY, m.key); } catch { /* sin almacenamiento */ } }}
              className={cn("h-7 rounded-md px-3 font-mono text-[11px] uppercase transition", model === m.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
              {m.label}
            </button>
          ))}
        </div>
        {!empty && (
          <button type="button" onClick={() => setMessages([])} disabled={busy} className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground disabled:opacity-50">
            <RotateCcw className="h-3 w-3" aria-hidden /> Nueva conversación
          </button>
        )}
      </div>
      <div className={cn("min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain", compact ? "px-4 py-4" : "px-5 py-5")} aria-live="polite">
        {empty && (
          <div className="space-y-4">
            <p className={cn("font-display leading-tight", compact ? "text-xl" : "text-2xl md:text-3xl")}>{compact && page ? `¿Qué quieres saber de ${page.title}?` : "¿Qué quieres saber de tu marketing?"}</p>
            <p className="max-w-[60ch] text-sm text-muted-foreground">{compact ? "Pregunta sobre lo que ves en esta página o sobre cualquier dato del panel. También puedo proponer cambios, como agregar competencia." : "Pregunta sobre tu sitio, Google Ads, Instagram, la competencia o el CRM. Leo los datos del panel en vivo antes de responder."}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full bg-background px-3.5 py-2 text-left text-sm transition hover:bg-secondary active:translate-y-px">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            {m.role === "user"
              ? <p className="max-w-[80%] rounded-2xl rounded-br-md bg-primary px-4 py-2.5 text-[15px] text-primary-foreground">{m.content}</p>
              : (
                <div className="max-w-[92%] space-y-3">
                  {m.content ? <Markdown text={m.content} /> : null}
                  {m.proposals?.map((p) => (
                    <div key={p.id} className="space-y-2 rounded-xl border border-border bg-background p-3 text-sm">
                      <p className="font-mono text-[10px] uppercase text-muted-foreground">Propuesta de cambio</p>
                      <p>{p.summary}</p>
                      {p.status === "pending" || p.status === "applying" ? (
                        <div className="flex gap-2">
                          <button type="button" disabled={p.status === "applying"} onClick={() => decide(i, p.id, "apply")}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50">
                            <Check className="h-3.5 w-3.5" aria-hidden />{p.status === "applying" ? "Aplicando…" : "Aplicar"}
                          </button>
                          <button type="button" disabled={p.status === "applying"} onClick={() => decide(i, p.id, "discard")}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs text-muted-foreground hover:bg-card hover:text-foreground disabled:opacity-50">
                            <X className="h-3.5 w-3.5" aria-hidden />Descartar
                          </button>
                        </div>
                      ) : (
                        <p role="status" className={cn("text-xs", p.status === "applied" ? "text-good-ink" : p.status === "error" ? "text-bad-ink" : "text-muted-foreground")}>
                          {p.status === "applied" ? "✓ Aplicado. " : p.status === "discarded" ? "Descartado. " : ""}{p.result}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>
        ))}
        {status && <p className="animate-pulse font-mono text-[11px] uppercase text-muted-foreground">{status}…</p>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void ask(input); }} className="flex shrink-0 items-end gap-2 rounded-b-2xl border-t border-border bg-card p-3">
        <label htmlFor="chat-input" className="sr-only">Pregunta</label>
        <textarea id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={4000}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(input); } }}
          placeholder="Pregunta algo sobre tus datos…" className="max-h-40 min-h-11 flex-1 resize-none rounded-xl bg-background px-4 py-3 text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <button type="submit" disabled={busy || !input.trim()} aria-label="Enviar" className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground transition hover:opacity-85 disabled:opacity-40">
          <ArrowUp className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
