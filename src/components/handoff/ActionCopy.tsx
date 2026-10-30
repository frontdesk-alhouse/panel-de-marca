"use client";

import { Bot, ChevronDown, Code2, Copy, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { buildHandoff, type HandoffTarget } from "@/lib/handoff/build";
import type { HandoffPayload } from "@/lib/handoff/from-panel";
import { copyText } from "./clipboard";

const TARGETS: { key: HandoffTarget; label: string; hint: string; Icon: typeof Code2 }[] = [
  { key: "code", label: "Claude Code", hint: "Hace el cambio en el código de tu sitio", Icon: Code2 },
  { key: "app", label: "App de Claude", hint: "Te guía paso a paso", Icon: MessageSquare },
  { key: "other", label: "Otra IA", hint: "ChatGPT, Gemini u otra", Icon: Bot },
];

/**
 * «Pásaselo a tu IA» para UNA acción: copia un texto solo de esa tarea (qué vimos, pasos,
 * cómo sabremos que funcionó) con el skill de su frente. Se elige a qué IA en un menú corto.
 */
export function ActionCopy({ payload, skillName }: { payload: HandoffPayload; skillName?: string }) {
  async function copy(target: HandoffTarget) {
    const text = buildHandoff(payload.input, target, payload.lang);
    if (!(await copyText(text))) return void toast.error("No se pudo copiar.");
    toast.success(`Copiado. Pégalo en ${TARGETS.find((t) => t.key === target)?.label}.`);
  }
  return (
    <Popover>
      <PopoverTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.97]">
        <Copy className="h-3.5 w-3.5" aria-hidden />Pásaselo a tu IA<ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 gap-1 p-1.5">
        {skillName && <p className="px-2 pb-1 pt-1.5 text-[11px] text-muted-foreground">Incluye el skill «{skillName}».</p>}
        {TARGETS.map(({ key, label, hint, Icon }) => (
          <button key={key} type="button" onClick={() => copy(key)}
            className="flex w-full items-start gap-2.5 rounded-md p-2 text-left transition hover:bg-card">
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
