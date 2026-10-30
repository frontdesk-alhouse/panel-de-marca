"use client";

import { BookOpen } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { OPEN_GUIDE_EVENT } from "@/components/onboarding/Onboarding";
import { setViewMode, useViewMode } from "./view-mode";

/** Abajo del menú: vista simple o completa, y reabrir la guía. */
export function ViewModeToggle() {
  const t = useT();
  const mode = useViewMode();
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Vista del panel" className="grid grid-cols-2 gap-0.5 rounded-lg bg-card p-0.5 text-xs">
        {(["simple", "full"] as const).map((m) => (
          <button key={m} type="button" role="radio" aria-checked={mode === m} onClick={() => setViewMode(m)}
            title={m === "simple" ? t.guide.simpleHint : t.guide.fullHint}
            className={cn("h-7 rounded-md transition-colors", mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
            {m === "simple" ? t.guide.simple : t.guide.full}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_GUIDE_EVENT))}
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-card hover:text-foreground">
        <BookOpen className="h-3.5 w-3.5" aria-hidden />{t.guide.open}
      </button>
    </div>
  );
}
