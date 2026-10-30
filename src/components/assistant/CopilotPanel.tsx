"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { PanelRightClose, PanelRightOpen, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useCrumbs } from "@/components/layout/Sidebar";
import { cn } from "@/lib/utils";
import { Chat } from "./Chat";
import { setCopilotOpen, takePendingQuestion, toggleCopilot, useCopilotOpen, usePendingQuestion } from "./copilot-panel";

const SUGGESTIONS = ["Explícame esta página en palabras simples", "¿Qué debería mejorar primero aquí?", "¿Qué cambió en las últimas semanas?"];

/** ¿Pantalla de escritorio ancho (xl)? Ahí la columna va fija; abajo de eso, panel deslizable. */
const WIDE = "(min-width: 1280px)";
function useWide(): boolean {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(WIDE); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

/** Inicio ya tiene el chat a pantalla completa: ahí la columna sobra. */
export function useCopilotAvailable(): boolean {
  return usePathname() !== "/";
}

/** Botón del encabezado que abre y cierra la columna (atajo ⌘J / Ctrl+J). */
export function CopilotToggle() {
  const open = useCopilotOpen();
  const available = useCopilotAvailable();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); toggleCopilot(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  if (!available) return null;
  const label = open ? "Cerrar copiloto" : "Abrir copiloto";
  return (
    <button type="button" onClick={toggleCopilot} aria-pressed={open} aria-label={label} title={`${label} (⌘J)`}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm transition active:scale-95",
        open ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-card hover:text-foreground")}>
      {open ? <PanelRightClose className="h-4 w-4" aria-hidden /> : <PanelRightOpen className="h-4 w-4" aria-hidden />}
      <span className="hidden xl:inline">Copiloto</span>
    </button>
  );
}

function CopilotChat() {
  const { area, section } = useCrumbs();
  const path = usePathname();
  const pending = usePendingQuestion();
  const title = section ? `${area.label} · ${section.label.replace(" · Clarity", "")}` : area.label;
  return (
    <Chat compact suggestions={SUGGESTIONS} page={{ path, title }} initialQuestion={pending} onInitialAsked={() => takePendingQuestion()} />
  );
}

/**
 * Columna derecha con Claude: en escritorio va fija junto al contenido; en pantallas chicas
 * sale como panel deslizable. Comparte la conversación con el chat de Inicio.
 */
export function CopilotPanel() {
  const open = useCopilotOpen();
  const available = useCopilotAvailable();
  const wide = useWide();
  if (!available) return null;
  return (
    <>
      {open && wide && (
        <aside aria-label="Copiloto" className="sticky top-3 flex h-[calc(100dvh-1.5rem)] w-[400px] shrink-0 flex-col rounded-r-[20px] border-l border-border bg-background">
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
            <p className="flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4" aria-hidden />Copiloto</p>
            <button type="button" onClick={() => setCopilotOpen(false)} aria-label="Cerrar copiloto" title="Cerrar (⌘J)"
              className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-card hover:text-foreground">
              <PanelRightClose className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 p-3"><CopilotChat /></div>
        </aside>
      )}
      {/* Pantallas chicas: el mismo chat en un panel que se desliza desde la derecha. */}
      {!wide && (
        <Sheet open={open} onOpenChange={setCopilotOpen}>
          <SheetContent side="right" className="w-[min(100vw,420px)] gap-0 p-3">
            <SheetTitle className="flex items-center gap-2 px-1 pb-3 text-sm font-medium"><Sparkles className="h-4 w-4" aria-hidden />Copiloto</SheetTitle>
            <div className="min-h-0 flex-1"><CopilotChat /></div>
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}
