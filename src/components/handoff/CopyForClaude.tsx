"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bot, Check, Code2, MessageSquare, Puzzle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { buildHandoff, sortItems, type Confidence, type HandoffTarget } from "@/lib/handoff/build";
import type { HandoffPayload } from "@/lib/handoff/from-panel";
import { cn } from "@/lib/utils";
import { copyText } from "./clipboard";

type Props = { payload: HandoffPayload; className?: string; defaultOpen?: boolean };

const TARGET_KEY = "ah-panel-handoff-target";

const TARGETS: { key: HandoffTarget; label: string; hint: string; Icon: typeof Code2 }[] = [
  { key: "code", label: "Claude Code", hint: "Trabaja en el código de tu sitio y verifica", Icon: Code2 },
  { key: "app", label: "App de Claude", hint: "Te guía paso a paso en claude.ai", Icon: MessageSquare },
  { key: "other", label: "Otra IA", hint: "ChatGPT, Gemini u otra; el skill va como archivo", Icon: Bot },
];

const CONFIDENCE: Record<Confidence, { label: string; dot: string }> = {
  alta: { label: "Confianza alta", dot: "bg-good" },
  media: { label: "Confianza media", dot: "bg-warn" },
  baja: { label: "Confianza baja", dot: "bg-muted-foreground/60" },
};

function readTarget(): HandoffTarget {
  try {
    const v = localStorage.getItem(TARGET_KEY);
    return v === "app" || v === "other" ? v : "code";
  } catch {
    return "code";
  }
}

/**
 * «Copiar para Claude»: eliges dónde lo vas a usar, qué acciones pasarle (cada una con
 * su evidencia) y qué skills incluir; el texto se arma con eso y se copia.
 */
export function CopyForClaude({ payload, className = "", defaultOpen = false }: Props) {
  const { input, lang, defaultItems } = payload;
  const [target, setTarget] = useState<HandoffTarget>("code");
  // La preferencia guardada se lee después de hidratar (el servidor no la conoce).
  // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con localStorage una sola vez
  useEffect(() => setTarget(readTarget()), []);
  const [items, setItems] = useState<Set<string>>(() => new Set(defaultItems));
  const [skills, setSkills] = useState<Set<string>>(() => new Set(input.skills.map((s) => s.id)));
  const [isCopied, setIsCopied] = useState(false);
  // Primero las marcadas de entrada y, dentro, por impacto y puntos posibles.
  const shown = useMemo(() => {
    const pre = new Set(defaultItems);
    const sorted = sortItems(input.items);
    return [...sorted.filter((i) => pre.has(i.id)), ...sorted.filter((i) => !pre.has(i.id))];
  }, [input.items, defaultItems]);

  const text = useMemo(() => buildHandoff(
    { ...input, items: input.items.filter((i) => items.has(i.id)), skills: input.skills.filter((s) => skills.has(s.id)) },
    target, lang,
  ), [input, items, skills, target, lang]);

  const toggle = (set: Set<string>, id: string) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; };
  const choose = (next: HandoffTarget) => {
    setTarget(next);
    try { localStorage.setItem(TARGET_KEY, next); } catch { /* sin almacenamiento */ }
  };
  const handleCopy = async () => {
    if (!(await copyText(text))) return void toast.error("No se pudo copiar. Abre «Ver el texto» y cópialo a mano.");
    setIsCopied(true);
    toast.success(`Copiado. Pégalo en ${TARGETS.find((t) => t.key === target)?.label}.`);
    setTimeout(() => setIsCopied(false), 2000);
  };
  const targetLabel = TARGETS.find((t) => t.key === target)!.label;

  return (
    <section aria-label="Copiar para tu IA" className={cn("space-y-5 rounded-2xl bg-card p-5", className)}>
      <div className="space-y-2">
        <p className="text-sm font-medium">¿Dónde lo vas a trabajar?</p>
        <div role="radiogroup" aria-label="Dónde lo vas a trabajar" className="grid gap-2 sm:grid-cols-3">
          {TARGETS.map(({ key, label, hint, Icon }) => {
            const isOn = target === key;
            return (
              <button key={key} type="button" role="radio" aria-checked={isOn} onClick={() => choose(key)}
                className={cn(
                  "relative flex items-start gap-2.5 rounded-xl border-2 p-3 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.98] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isOn ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-background hover:border-border",
                )}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className={cn("block text-xs", isOn ? "text-primary-foreground/75" : "text-muted-foreground")}>{hint}</span>
                </span>
                {isOn && <Check className="absolute right-2.5 top-2.5 h-3.5 w-3.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      </div>

      {input.items.length > 0 && (
        <details open={defaultOpen} className="group/items space-y-3">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
            <span className="font-medium">Qué le vas a pedir <span className="font-normal text-muted-foreground">· {items.size} de {input.items.length} acciones</span></span>
            <span className="text-xs text-muted-foreground group-open/items:hidden">Ver y elegir</span>
            <span className="hidden text-xs text-muted-foreground group-open/items:inline">Ocultar</span>
          </summary>
          <p className="text-xs text-muted-foreground">
            Vienen marcadas las que más pueden subir tu calificación y tienen datos firmes. Cada una dice de dónde sale y qué tan confiable es:
            <span className="ml-1 inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-good" />alta = comparada con la industria</span>,
            <span className="ml-1 inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warn" />media = umbral propio o propuesta de Claude</span>,
            <span className="ml-1 inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/60" />baja = pocos datos</span>.
          </p>
          <ul className="space-y-2">
            {shown.map((it) => {
              const isOn = items.has(it.id);
              const c = it.evidence ? CONFIDENCE[it.evidence.confidence] : null;
              return (
                <li key={it.id}>
                  <label className={cn("flex cursor-pointer gap-3 rounded-xl p-3 transition-colors", isOn ? "bg-background" : "bg-background/40 hover:bg-background/70")}>
                    <input type="checkbox" checked={isOn} onChange={() => setItems((s) => toggle(s, it.id))} className="mt-1 h-4 w-4 shrink-0 accent-primary" />
                    <span className="min-w-0 space-y-1 text-sm">
                      <span className="block font-medium">{it.title}</span>
                      {it.metric && (
                        <span className="block text-xs text-muted-foreground">
                          {it.metric.label}: <span className="text-foreground">{it.metric.value}</span>{it.metric.target ? ` · ${it.metric.target}` : ""}
                        </span>
                      )}
                      {it.evidence && c && (
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground"><span className={cn("h-2 w-2 rounded-full", c.dot)} />{c.label}</span>
                          <span>{it.evidence.basis}</span>
                          {it.evidence.points ? <span className="rounded-full bg-card px-2 py-0.5 font-medium text-foreground">hasta +{it.evidence.points} pts</span> : null}
                        </span>
                      )}
                      {it.detail && <span className="block text-xs text-muted-foreground">{it.detail}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {input.skills.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Skills que van incluidos <span className="font-normal text-muted-foreground">· le dan a la IA el método correcto</span></p>
          <ul className="flex flex-wrap gap-2">
            {input.skills.map((s) => {
              const isOn = skills.has(s.id);
              return (
                <li key={s.id}>
                  <label className={cn("flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-xs transition-colors", isOn ? "border-primary bg-background" : "border-transparent bg-background/40 text-muted-foreground")}>
                    <input type="checkbox" checked={isOn} onChange={() => setSkills((x) => toggle(x, s.id))} className="mt-0.5 h-3.5 w-3.5 accent-primary" />
                    <span>
                      <span className="flex items-center gap-1 font-medium text-foreground"><Puzzle className="h-3 w-3" aria-hidden />{s.name}</span>
                      {s.short && <span className="block text-muted-foreground">{s.short}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">¿Aún no los instalas? <Link href="/skills" className="underline underline-offset-2 hover:text-foreground">Cómo instalarlos</Link> (Claude, ChatGPT, Gemini u otras).</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={handleCopy}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none">
          {isCopied ? <Check className="h-4 w-4" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          Copiar para {targetLabel}
        </button>
        <span className="text-xs text-muted-foreground">{items.size} {items.size === 1 ? "acción" : "acciones"} · {skills.size} {skills.size === 1 ? "skill" : "skills"} · al final te devuelve los cambios para pegarlos en la bitácora</span>
      </div>

      <details className="text-xs">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Ver el texto</summary>
        <textarea readOnly value={text} rows={12} aria-label="Texto que se copia" onFocus={(e) => e.currentTarget.select()}
          className="mt-2 w-full resize-y rounded-lg bg-background p-3 font-mono text-[11px] leading-relaxed" />
      </details>
    </section>
  );
}
