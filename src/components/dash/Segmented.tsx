"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export interface SegmentItem<K extends string> { key: K; label: string; meta?: string }

/**
 * Control segmentado (patrón de Apple): una opción activa, flechas del teclado
 * para moverse, respuesta inmediata al presionar.
 */
export function Segmented<K extends string>({ items, value, onChange, label, size = "md" }: {
  items: SegmentItem<K>[]; value: K; onChange: (k: K) => void; label: string; size?: "sm" | "md";
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (i: number) => { const n = (i + items.length) % items.length; onChange(items[n].key); refs.current[n]?.focus(); };
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl bg-background p-1">
      {items.map((it, i) => {
        const active = it.key === value;
        return (
          <button key={it.key} ref={(el) => { refs.current[i] = el; }} type="button" role="tab" aria-selected={active} tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.key)}
            onKeyDown={(e) => { if (e.key === "ArrowRight") move(i + 1); if (e.key === "ArrowLeft") move(i - 1); }}
            className={cn(
              "shrink-0 rounded-lg text-left transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:transform-none",
              size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-sm",
              active ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08)]" : "text-muted-foreground hover:text-foreground",
            )}>
            <span className="block font-medium">{it.label}</span>
            {it.meta && <span className="block font-mono text-[10px] uppercase opacity-70">{it.meta}</span>}
          </button>
        );
      })}
    </div>
  );
}
