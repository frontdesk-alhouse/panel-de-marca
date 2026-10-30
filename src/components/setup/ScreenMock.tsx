import { Copy, Eye, MousePointer2 } from "lucide-react";
import type { MockBlock, MockScreen } from "@/lib/integrations/visual-guides";
import { cn } from "@/lib/utils";

/** Anillo y puntero sobre el elemento donde se da clic. */
function Target({ isOn, children, className = "" }: { isOn: boolean; children: React.ReactNode; className?: string }) {
  if (!isOn) return <span className={className}>{children}</span>;
  return (
    <span className={cn("relative inline-flex", className)}>
      <span className="absolute -inset-1.5 animate-pulse rounded-lg ring-2 ring-[#ff5a1f] motion-reduce:animate-none" aria-hidden />
      {children}
      <span className="pointer-events-none absolute -bottom-6 left-1/2 z-10 flex -translate-x-1/4 items-center gap-1 whitespace-nowrap rounded-md bg-[#ff5a1f] px-1.5 py-0.5 text-[10px] font-medium text-white shadow" aria-hidden>
        <MousePointer2 className="h-3 w-3 fill-white" />Clic aquí
      </span>
    </span>
  );
}

function Block({ b, s }: { b: MockBlock; s: MockScreen }) {
  if (b.kind === "lines") {
    return <div className="space-y-1.5">{Array.from({ length: b.count }, (_, i) => <div key={i} className="h-2 rounded-full bg-zinc-200" style={{ width: `${85 - i * 18}%` }} />)}</div>;
  }
  if (b.kind === "button") {
    const btn = (
      <span className={cn("inline-flex h-7 items-center rounded-md px-3 text-[11px] font-medium", b.variant === "primary" ? "text-white" : "border border-zinc-300 bg-white text-zinc-800")}
        style={b.variant === "primary" ? { background: s.accent } : undefined}>{b.label}</span>
    );
    return <div className={cn("flex", b.align === "right" && "justify-end")}><Target isOn={s.target === b.label}>{btn}</Target></div>;
  }
  if (b.kind === "secret") {
    return (
      <div className="rounded-md border border-zinc-200 bg-white p-2.5">
        <p className="text-[10px] text-zinc-500">{b.label}</p>
        <div className="mt-1.5 flex items-center gap-2 rounded bg-zinc-50 px-2 py-1">
          <span className="flex-1 truncate font-mono text-[10px] tracking-widest text-blue-600">••••••••••••••••••••••••</span>
          {b.actions.map((a) => (
            <Target key={a} isOn={s.target === a}>
              <span className="grid h-5 w-5 place-items-center rounded text-zinc-600" title={a}>{a === "copiar" ? <Copy className="h-3 w-3" /> : <Eye className="h-3 w-3" />}</span>
            </Target>
          ))}
        </div>
      </div>
    );
  }
  if (b.kind === "cards") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        {b.items.map((c) => (
          <div key={c.title} className="space-y-1.5 rounded-md border border-zinc-200 bg-white p-2.5">
            <p className="text-[10px] font-semibold text-zinc-800">{c.title}</p>
            <p className="text-[9px] text-zinc-500">{c.text}</p>
            <Target isOn={s.target === c.button}>
              <span className="inline-flex h-6 items-center rounded px-2 text-[10px] text-white" style={{ background: s.accent }}>{c.button}</span>
            </Target>
          </div>
        ))}
      </div>
    );
  }
  // Menú desplegable bajo su botón.
  return (
    <div className="ml-2 w-44 rounded-md border border-zinc-200 bg-white py-1 shadow-lg">
      {b.items.map((it) => (
        <div key={it} className="px-2.5 py-1">
          <Target isOn={s.target === it}><span className="text-[11px] text-zinc-800">{it}</span></Target>
        </div>
      ))}
    </div>
  );
}

/**
 * Réplica simplificada de la pantalla de una plataforma (siempre clara, como se ve allá),
 * con el lugar del clic marcado. Decorativa para lectores de pantalla: el texto del paso ya
 * dice dónde dar clic.
 */
export function ScreenMock({ s }: { s: MockScreen }) {
  return (
    <figure className="space-y-1.5">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-900 shadow-sm" aria-hidden>
        <div className="flex items-center gap-2 border-b border-zinc-200 bg-white px-3 py-1.5">
          <span className="flex gap-1">{["#ff5f57", "#febc2e", "#28c840"].map((c) => <span key={c} className="h-2 w-2 rounded-full" style={{ background: c }} />)}</span>
          <span className="flex-1 truncate rounded bg-zinc-100 px-2 py-0.5 font-mono text-[9px] text-zinc-500">{s.url}</span>
        </div>
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-white px-3 py-1.5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold"><span className="h-3 w-3 rounded" style={{ background: s.accent }} />{s.app}</span>
          {s.topNav && (
            <span className="mx-auto flex gap-3">
              {s.topNav.items.map((n) => <span key={n} className={cn("text-[10px]", n === s.topNav!.active ? "border-b-2 font-semibold" : "text-zinc-500")} style={n === s.topNav!.active ? { borderColor: s.accent } : undefined}>{n}</span>)}
            </span>
          )}
        </div>
        <div className="flex min-h-40">
          {s.sidebar && (
            <div className="w-32 shrink-0 space-y-0.5 border-r border-zinc-200 bg-white p-2">
              {s.sidebar.title && <p className="px-1.5 pb-1 text-[9px] font-semibold uppercase text-zinc-400">{s.sidebar.title}</p>}
              {s.sidebar.items.map((it) => (
                <p key={it} className={cn("truncate rounded px-1.5 py-1 text-[10px]", it === s.sidebar!.active ? "bg-zinc-100 font-semibold" : "text-zinc-600")}>{it}</p>
              ))}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3 p-3 pb-7">
            {s.tabs && (
              <div className="flex gap-3 overflow-hidden border-b border-zinc-200">
                {s.tabs.items.map((tb) => <span key={tb} className={cn("shrink-0 pb-1 text-[10px]", tb === s.tabs!.active ? "border-b-2 font-semibold" : "text-zinc-500")} style={tb === s.tabs!.active ? { borderColor: s.accent } : undefined}>{tb}</span>)}
              </div>
            )}
            <div>
              <p className="text-[13px] font-semibold">{s.title}</p>
              {s.subtitle && <p className="text-[10px] text-zinc-500">{s.subtitle}</p>}
            </div>
            {s.blocks.map((b, i) => <Block key={i} b={b} s={s} />)}
          </div>
        </div>
      </div>
      <figcaption className="text-[11px] text-muted-foreground">
        Réplica simplificada de {s.app}. {s.verified ? `Revisada contra la pantalla real el ${s.verified}.` : "Armada con la documentación de la plataforma; puede variar un poco."} Si ya no se ve así, el link de este paso te lleva al lugar correcto.
      </figcaption>
    </figure>
  );
}
