"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, RotateCcw } from "lucide-react";
import { Markdown } from "./Markdown";
import { cn } from "@/lib/utils";

interface Msg { role: "user" | "assistant"; content: string }
const STORAGE_KEY = "ah-panel-chat";
const MODEL_KEY = "ah-panel-chat-model";
const MODELS = [{ key: "sonnet", label: "Sonnet 5.5", hint: "Rápido" }, { key: "opus", label: "Opus 5.5", hint: "Más profundo" }] as const;
type ModelKey = (typeof MODELS)[number]["key"];

/** Chat con el analista del panel. La conversación se guarda solo en este navegador. */
export function Chat({ suggestions, initialQuestion }: { suggestions: string[]; initialQuestion?: string }) {
  const router = useRouter();
  const askedInitial = useRef(false);
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

  // Pregunta que llega del buscador del encabezado (?q=): se hace una vez y se limpia la URL.
  useEffect(() => {
    if (!initialQuestion || askedInitial.current) return;
    askedInitial.current = true;
    router.replace("/");
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
    const append = (text: string) => setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: m.at(-1)!.content + text }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: history.slice(-40) }) });
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
          const ev = JSON.parse(line) as { type: string; text?: string; label?: string; message?: string };
          if (ev.type === "text" && ev.text) { setStatus(null); append(ev.text); }
          else if (ev.type === "tool") setStatus(ev.label ?? "Consultando datos");
          else if (ev.type === "error") append(`\n\n_${ev.message}_`);
        }
      }
    } catch {
      append("\n\nSe cortó la conexión. Intenta de nuevo.");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  const empty = messages.length === 0;
  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl bg-card">
      <div className="flex items-center justify-between px-5 pt-4">
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
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5" aria-live="polite">
        {empty && (
          <div className="space-y-4">
            <p className="font-display text-2xl leading-tight md:text-3xl">¿Qué quieres saber de tu marketing?</p>
            <p className="max-w-[60ch] text-sm text-muted-foreground">Pregunta sobre tu sitio, Google Ads, Instagram, la competencia o el CRM. Leo los datos del panel en vivo antes de responder.</p>
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
              : <div className="max-w-[92%]">{m.content ? <Markdown text={m.content} /> : null}</div>}
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
