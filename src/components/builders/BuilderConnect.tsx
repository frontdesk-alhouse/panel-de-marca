import { ChevronDown, ExternalLink, Plug } from "lucide-react";
import { BUILDERS, VERIFIED, builderFor, type Builder } from "@/lib/builders/catalog";
import { CopyButton } from "@/components/handoff/CopyButton";
import { cn } from "@/lib/utils";

const STATUS: Record<Builder["status"], { label: string; tone: string }> = {
  oficial: { label: "Oficial", tone: "bg-good/15 text-good-ink" },
  parcial: { label: "Oficial · no edita páginas", tone: "bg-warn/15 text-warn" },
  beta: { label: "Oficial · beta", tone: "bg-warn/15 text-warn" },
};

/** Un comando con su botón de copiar (los comentarios entre paréntesis no se copian). */
function Command({ text }: { text: string }) {
  const [cmd, note] = text.split(/\s{2,}\(/);
  return (
    <div className="flex items-center gap-2 rounded-lg bg-background p-2">
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[11px]">{cmd.trim()}</code>
      {note && <span className="hidden shrink-0 text-[11px] text-muted-foreground lg:inline">({note}</span>}
      <CopyButton text={cmd.trim()} label="Copiar" copiedLabel="Copiado" failedLabel="No se pudo copiar" className="h-7 shrink-0 px-2 text-xs" />
    </div>
  );
}

function BuilderBody({ b }: { b: Builder }) {
  return (
    <div className="space-y-4 text-sm">
      <p><span className="text-muted-foreground">Qué puede hacer tu IA: </span>{b.can}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase text-muted-foreground">En Claude Code (terminal)</p>
          {b.claudeCode.map((c) => <Command key={c} text={c} />)}
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase text-muted-foreground">En la app de Claude</p>
          <p>{b.claudeApp}</p>
          {b.mcpUrl && <Command text={b.mcpUrl} />}
          {b.otherAis && <p className="text-muted-foreground">{b.otherAis}</p>}
        </div>
      </div>
      {b.skills && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase text-muted-foreground">Skills oficiales</p>
          <p><a href={b.skills.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{b.skills.name}</a> enseñan a la IA a usar {b.name} bien (auditorías, publicar con cuidado…).</p>
          {b.skills.install?.map((c) => <Command key={c} text={c} />)}
        </div>
      )}
      {b.limits && <p className="text-muted-foreground"><span className="font-medium text-foreground">Antes de empezar: </span>{b.limits}</p>}
      <a href={b.docs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs underline underline-offset-2">
        Guía oficial de {b.name}<ExternalLink className="h-3 w-3" aria-hidden />
      </a>
    </div>
  );
}

/**
 * «Conecta tu IA a tu sitio»: el servidor MCP oficial de cada constructor y cómo agregarlo a
 * Claude Code, la app de Claude u otras IA. La plataforma detectada va primero y abierta.
 * Con `only`, muestra solo la detectada (Ajustes).
 */
export function BuilderConnect({ platform, only = false }: { platform?: string | null; only?: boolean }) {
  const detected = builderFor(platform);
  const list = only ? (detected ? [detected] : []) : [...(detected ? [detected] : []), ...BUILDERS.filter((b) => b.id !== detected?.id)];
  return (
    <section aria-labelledby="builders-h" className="space-y-4">
      <div className="space-y-1.5">
        <h2 id="builders-h" className="flex items-center gap-2 font-display text-2xl md:text-3xl"><Plug className="h-5 w-5" aria-hidden />Conecta tu IA a tu sitio</h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Lo que copias del panel le dice a tu IA qué cambiar. Para que lo haga directo en tu sitio, y no solo te lo explique, conéctala al servidor oficial (MCP) de tu constructor.
          {detected ? ` Tu sitio está hecho en ${detected.name}.` : " Todavía no sabemos en qué está hecho tu sitio: lo detecta el chequeo diario de Visibilidad en IA."}
        </p>
      </div>
      {only && !detected && <p className="rounded-xl bg-card p-4 text-sm text-muted-foreground">Cuando el chequeo detecte tu plataforma, aquí verás cómo conectarla. Mientras, tienes todas en Skills.</p>}
      <ul className="space-y-2">
        {list.map((b) => (
          <li key={b.id}>
            <details className="group/b rounded-2xl bg-card" open={b.id === detected?.id}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
                <span className="font-medium">{b.name}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", STATUS[b.status].tone)}>{STATUS[b.status].label}</span>
                {b.id === detected?.id && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground">Tu sitio</span>}
                <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition-transform group-open/b:rotate-180 motion-reduce:transition-none" aria-hidden />
              </summary>
              <div className="border-t border-border p-4"><BuilderBody b={b} /></div>
            </details>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">Revisado contra la documentación oficial de cada plataforma el {VERIFIED}. Si algo ya no coincide, la guía oficial de cada una manda.</p>
    </section>
  );
}
