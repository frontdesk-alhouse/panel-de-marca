"use client";
import Link from "next/link";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatMoney, formatNumber, formatPct } from "@/lib/format";
import type { GlossaryKey } from "@/lib/analytics/glossary";
import { MetricTip } from "./MetricTip";

const isRight = (c: { type: string }) => c.type !== "text" && c.type !== "chips" && c.type !== "link";

export type CellValue = string | number | null | { text: string; tone?: "neutral" | "good" | "bad" | "watch" }[] | { text: string; href: string };
export type Row = Record<string, CellValue> & { id: string };

export interface Column {
  key: string;
  label: string;
  type: "text" | "number" | "pct" | "duration" | "position" | "mxn" | "chips" | "link";
  /** Ocultar en celular para que la tabla quepa */
  hideOnMobile?: boolean;
  /** Explicación del glosario en el encabezado */
  term?: GlossaryKey;
}

interface Props {
  rows: Row[];
  columns: Column[];
  initialSort?: { key: string; dir: "asc" | "desc" };
  caption: string;
  limit?: number;
  emptyText?: string;
}

/** Links de terceros (resultados de Google, Instagram): solo http(s); un «javascript:» se muestra como texto. */
function safeHttpUrl(url: string): string | null {
  try {
    const p = new URL(url).protocol;
    return p === "https:" || p === "http:" ? url : null;
  } catch {
    return null;
  }
}

function render(type: Column["type"], v: CellValue): React.ReactNode {
  if (v === null || v === undefined) return <span className="text-muted-foreground">-</span>;
  if (type === "link" && typeof v === "object" && !Array.isArray(v)) {
    // Ruta interna del panel (/crm/12): navega dentro del panel (en el CRM abre el pop-up).
    if (v.href && /^\/(?!\/)/.test(v.href)) {
      return <Link href={v.href} scroll={false} className="font-medium underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground">{v.text}</Link>;
    }
    const href = v.href ? safeHttpUrl(v.href) : null;
    if (!href) return v.text;
    return <a href={href} target="_blank" rel="noopener noreferrer" className="underline decoration-muted-foreground/50 underline-offset-4 hover:decoration-foreground">{v.text}</a>;
  }
  if (typeof v === "object" && !Array.isArray(v)) return v.text;
  if (type === "chips") return Array.isArray(v) && v.length ? <span className="inline-flex flex-wrap gap-1">{v.map((c) => <Chip key={c.text} tone={c.tone}>{c.text}</Chip>)}</span> : null;
  if (typeof v !== "number") return String(v);
  switch (type) {
    case "pct": return formatPct(v, v < 0.1 ? 1 : 0);
    case "duration": return formatDuration(v);
    case "position": return formatNumber(v, 1);
    case "mxn": return formatMoney(v);
    default: return formatNumber(v);
  }
}

const sortable = (v: CellValue) => (Array.isArray(v) ? v.length : v !== null && typeof v === "object" ? v.text : v);

/** Tabla con orden por columna (clic en el encabezado) y «ver todo». */
export function DataTable({ rows, columns, initialSort, caption, limit = 12, emptyText = "Sin datos en el periodo." }: Props) {
  const [sort, setSort] = useState(initialSort);
  const [expanded, setExpanded] = useState(false);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = sortable(a[sort.key]);
      const vb = sortable(b[sort.key]);
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return (va > vb ? 1 : va < vb ? -1 : 0) * factor;
    });
  }, [rows, sort]);

  const shown = expanded ? sorted : sorted.slice(0, limit);
  const toggle = (key: string) =>
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" }));

  if (!rows.length) return <p className="text-sm text-muted-foreground">{emptyText}</p>;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm border-separate border-spacing-0">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((c) => {
                const active = sort?.key === c.key;
                return (
                  <th key={c.key} scope="col" aria-sort={active ? (sort?.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={cn("px-1 pb-2 font-mono text-[10px] uppercase text-muted-foreground font-normal border-b border-border", isRight(c) ? "text-right" : "text-left", c.hideOnMobile && "hidden md:table-cell")}>
                    {c.type !== "chips" ? (
                      <button type="button" onClick={() => toggle(c.key)} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
                        {c.label}
                        {active && (sort?.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />)}
                      </button>
                    ) : c.label}
                    {c.term && <span className="ml-1 normal-case align-middle"><MetricTip term={c.term}><span className="sr-only">Qué es {c.label}</span></MetricTip></span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="hover:bg-secondary/50">
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-1 py-2 border-b border-border/70 align-top", isRight(c) ? "text-right tabular-nums whitespace-nowrap" : "text-left", c.hideOnMobile && "hidden md:table-cell")}>
                    {render(c.type, r[c.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <button type="button" onClick={() => setExpanded((e) => !e)} className="h-8 rounded-md bg-background px-3 font-mono text-[11px] uppercase hover:bg-secondary transition">
          {expanded ? "Ver menos" : `Ver las ${rows.length}`}
        </button>
      )}
    </div>
  );
}

export function Chip({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "bad" | "watch" }) {
  const dot = { neutral: "bg-muted-foreground", good: "bg-good", bad: "bg-bad", watch: "bg-warn" }[tone];
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[11px] whitespace-nowrap">
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} aria-hidden />
      {children}
    </span>
  );
}
