import Link from "next/link";
import { Info } from "lucide-react";
import { getSource } from "@/sources/registry";
import { SOURCE_LABELS, type SourceId } from "@/sources/contract";

type Item = SourceId | { label: string; on: boolean };
type Props = { intro: string; items: readonly Item[] };

/**
 * «De dónde sale esto», en chiquito para la esquina del encabezado: las fuentes activas como
 * pastillas con punto verde; las que faltan, en un «+N sin conectar» que lleva a Ajustes.
 * La explicación larga va en el ícono de información (title + texto para lectores de pantalla).
 */
export function DataSources({ intro, items }: Props) {
  const rows = items.map((it) => (typeof it === "string" ? { label: SOURCE_LABELS[it], on: Boolean(getSource(it)?.isConfigured()) } : it));
  const on = rows.filter((r) => r.on);
  const off = rows.filter((r) => !r.on);
  return (
    <section aria-label="Fuentes que usa esta sección" className="flex max-w-md flex-wrap items-center justify-end gap-1.5">
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-muted-foreground" title={intro}>
        <Info className="h-3 w-3" aria-hidden />Usa<span className="sr-only">: {intro}</span>
      </span>
      <ul className="contents">
        {on.map((r) => (
          <li key={r.label} className="inline-flex items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden />{r.label}
          </li>
        ))}
      </ul>
      {off.length > 0 && (
        <Link href="/ajustes" title={`Sin conectar: ${off.map((r) => r.label).join(", ")}`}
          className="rounded-full px-2 py-0.5 text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          +{off.length} sin conectar
        </Link>
      )}
    </section>
  );
}
