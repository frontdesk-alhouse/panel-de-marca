import { Fragment } from "react";

/** Solo enlaces https: nunca javascript:, data: ni rutas raras. */
function safeHref(url: string): string | null {
  try { return new URL(url).protocol === "https:" ? url : null; } catch { return null; }
}

/** Negritas (**x**), código (`x`) y enlaces [texto](https://…) dentro de una línea, como nodos de React (nunca HTML crudo). */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g).map((part, i) => {
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      return href
        ? <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline decoration-foreground/30 underline-offset-2 hover:decoration-foreground">{link[1]}</a>
        : <Fragment key={i}>{link[1]}</Fragment>;
    }
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="rounded bg-background px-1 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/**
 * Markdown mínimo para las respuestas del asistente: encabezados, viñetas,
 * listas numeradas, tablas y párrafos. Suficiente para lo que Claude escribe aquí.
 */
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        if (!/^\s*\|[\s:|-]+\|\s*$/.test(lines[i])) rows.push(lines[i].trim().slice(1, -1).split("|").map((c) => c.trim()));
        i++;
      }
      out.push(
        <div key={`t${i}`} className="overflow-x-auto">
          <table className="my-2 w-full text-sm">
            <thead><tr>{rows[0]?.map((c, j) => <th key={j} className="border-b border-border px-2 py-1 text-left font-mono text-[11px] uppercase text-muted-foreground">{inline(c)}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j} className="border-b border-border/60 px-2 py-1 tabular-nums">{inline(c)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (/^\s*([-*•]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+\.)\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*([-*•]|\d+\.)\s+/, "")); i++; }
      const List = ordered ? "ol" : "ul";
      out.push(<List key={`l${i}`} className={`my-2 space-y-1 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}>{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</List>);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)/);
    if (h) out.push(<p key={`h${i}`} className="mt-3 mb-1 font-medium">{inline(h[2])}</p>);
    else if (line.trim()) out.push(<p key={`p${i}`} className="my-1.5 leading-relaxed">{inline(line)}</p>);
    i++;
  }
  return <div className="text-[15px]">{out}</div>;
}
