"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { StrategyWizard } from "./StrategyWizard";

/** Sin estrategia: el asistente a la vista. Con estrategia: un botón que lo abre para rehacerla. */
export function StrategyStart({ hasStrategy }: { hasStrategy: boolean }) {
  const [open, setOpen] = useState(!hasStrategy);
  if (open) return <StrategyWizard hasStrategy={hasStrategy} onCancel={hasStrategy ? () => setOpen(false) : undefined} />;
  return (
    <button type="button" onClick={() => setOpen(true)}
      className="inline-flex h-9 items-center gap-2 rounded-lg bg-card px-3 text-sm transition hover:bg-accent active:scale-[0.98]">
      <RefreshCw className="h-4 w-4" aria-hidden />Hacer una nueva estrategia
    </button>
  );
}
