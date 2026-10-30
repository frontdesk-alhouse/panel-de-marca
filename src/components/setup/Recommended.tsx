"use client";

import { ArrowRight } from "lucide-react";
import { useT } from "@/i18n/client";
import { INTEGRATIONS, RECOMMENDED_ORDER } from "@/lib/integrations/catalog";
import type { IntegrationState } from "@/lib/integrations/status";
import { cn } from "@/lib/utils";

const COST_BADGE: Record<string, string> = { free: "$0", "free-tier": "$0 para empezar", paid: "De pago" };

/**
 * «Completa tu panel»: lo que falta conectar, en orden de utilidad, con su costo a la vista.
 * Cada fila salta a su tarjeta y la abre.
 */
export function Recommended({ states }: { states: IntegrationState[] }) {
  const t = useT();
  const missing = RECOMMENDED_ORDER.filter((id) => !states.find((s) => s.id === id)?.connected);
  if (!missing.length) return null;
  const freeCount = missing.filter((id) => INTEGRATIONS.find((i) => i.id === id)?.cost !== "paid").length;
  return (
    <section aria-labelledby="rec-h" className="space-y-3 rounded-2xl bg-card p-5">
      <div className="space-y-1">
        <h2 id="rec-h" className="font-medium">Completa tu panel</h2>
        <p className="text-sm text-muted-foreground">
          {freeCount ? `Te faltan ${freeCount} ${freeCount === 1 ? "conexión que no cuesta" : "conexiones que no cuestan"} nada. ` : ""}Cada una enciende secciones del panel; empieza por arriba.
        </p>
      </div>
      <ol className="divide-y divide-border">
        {missing.map((id) => {
          const it = INTEGRATIONS.find((i) => i.id === id)!;
          const text = t.integrations[id];
          return (
            <li key={id}>
              <a href={`#${id}`} className="group flex items-center gap-3 py-3 text-sm">
                <span className={cn("shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase", it.cost === "paid" ? "bg-background text-muted-foreground" : "bg-good/15 text-good-ink")}>{COST_BADGE[it.cost]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{text.name} <span className="font-normal text-muted-foreground">· ~{it.minutes} min</span></span>
                  <span className="block truncate text-xs text-muted-foreground">{text.unlocks}</span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
