"use client";

import { useState, useTransition } from "react";
import { Check, ExternalLink, Plug } from "lucide-react";
import { BUILDERS, VERIFIED, builderFor, type Builder, type BuilderId } from "@/lib/builders/catalog";
import { BUILDER_ICONS } from "@/lib/builders/icons";
import { CopyButton } from "@/components/handoff/CopyButton";
import { cn } from "@/lib/utils";
import { setSiteBuilder } from "@/lib/builders/actions";

const STATUS: Record<Builder["status"], { label: string; tone: string }> = {
  oficial: { label: "Oficial", tone: "bg-good/15 text-good-ink" },
  parcial: { label: "Oficial · no edita páginas", tone: "bg-warn/15 text-warn" },
  beta: { label: "Oficial · beta", tone: "bg-warn/15 text-warn" },
};

/** Logo de la plataforma en un solo color (sigue al tema); monograma si no hay logo. */
function Logo({ id, name }: { id: string; name: string }) {
  const icon = BUILDER_ICONS[id];
  if (!icon) return <span className="grid h-7 w-7 place-items-center rounded-md bg-foreground font-display text-sm text-background" aria-hidden>{name[0]}</span>;
  return <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden><path d={icon.path} /></svg>;
}

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
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{b.name}</span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px]", STATUS[b.status].tone)}>{STATUS[b.status].label}</span>
      </div>
      <p><span className="text-muted-foreground">Qué puede hacer tu IA: </span>{b.can}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase text-muted-foreground">En Claude Code (terminal)</p>
          {b.claudeCode.map((c) => <Command key={c} text={c} />)}
        </div>
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase text-muted-foreground">O en la app de Claude</p>
          <p>{b.claudeApp}</p>
          {b.mcpUrl && <Command text={b.mcpUrl} />}
          {b.otherAis && <p className="text-muted-foreground">{b.otherAis}</p>}
        </div>
      </div>
      {b.skills && (
        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase text-muted-foreground">Skills oficiales (opcional)</p>
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
 * «Conecta tu IA a tu sitio»: eliges en qué está montado tu sitio (íconos) y abajo salen los
 * pasos para conectar su servidor MCP oficial. La plataforma detectada viene elegida y marcada,
 * pero todas están a un clic.
 */
export function BuilderConnect({ chosen, detected: detectedId }: { chosen?: string | null; detected?: string | null }) {
  const detected = builderFor(detectedId);
  const [mine, setMine] = useState<BuilderId | null>(builderFor(chosen)?.id ?? null);
  const [selected, setSelected] = useState<BuilderId>(mine ?? detected?.id ?? BUILDERS[0].id);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<"ok" | "error" | null>(null);
  const current = BUILDERS.find((b) => b.id === selected) ?? BUILDERS[0];
  // «Tu sitio»: lo que elegiste; si no has elegido, lo que detectamos.
  const yours = mine ?? detected?.id ?? null;

  function choose(id: BuilderId) {
    setSelected(id);
    setSaved(null);
    start(async () => {
      const res = await setSiteBuilder(id);
      if (res.ok) setMine(id);
      setSaved(res.ok ? "ok" : "error");
    });
  }

  return (
    <section aria-labelledby="builders-h" className="space-y-5 rounded-2xl bg-card p-5 md:p-6">
      <div className="space-y-1.5">
        <h2 id="builders-h" className="flex items-center gap-2 font-display text-2xl md:text-3xl"><Plug className="h-5 w-5" aria-hidden />Conecta tu IA a tu sitio</h2>
        <p className="max-w-[70ch] text-sm text-muted-foreground">
          Lo que copias del panel le dice a tu IA qué cambiar. Para que lo haga directo en tu sitio, y no solo te lo explique, conéctala al servidor oficial (MCP) de tu constructor.
        </p>
      </div>
      <div className="space-y-3">
        <p className="text-sm font-medium" id="builders-q">¿Sobre qué está montado tu sitio web?</p>
        <div role="radiogroup" aria-labelledby="builders-q" className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {BUILDERS.map((b) => {
            const on = b.id === selected;
            return (
              <button key={b.id} type="button" role="radio" aria-checked={on} onClick={() => choose(b.id)}
                className={cn("relative flex flex-col items-center gap-2 rounded-xl bg-background px-2 py-3 text-xs transition-[box-shadow,transform] duration-150 active:scale-[0.97] motion-reduce:transform-none",
                  on ? "shadow-[inset_0_0_0_2px_var(--foreground)]" : "text-muted-foreground hover:text-foreground hover:shadow-[inset_0_0_0_1px_var(--border)]")}>
                {on && <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5" aria-hidden />}
                <Logo id={b.id} name={b.name} />
                <span className="font-medium">{b.name}</span>
                {b.id === yours && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] leading-none text-primary-foreground">Tu sitio</span>}
              </button>
            );
          })}
        </div>
        <p role="status" className="min-h-4 text-xs text-muted-foreground">
          {pending ? "Guardando…"
            : saved === "ok" ? `Listo: tu sitio está en ${current.name}. Lo que copies del panel para tu IA ya trae los pasos de ${current.name}.`
            : saved === "error" ? "No se pudo guardar; los pasos de abajo sí sirven."
            : mine ? `Elegiste ${builderFor(mine)?.name}: lo que copies del panel para tu IA trae sus pasos.`
            : detected ? `Lo detectamos como ${detected.name}. Si no es correcto, toca el tuyo y lo guardamos.`
            : "Toca el tuyo y lo guardamos: así lo que copies para tu IA trae los pasos correctos."}
        </p>
      </div>
      <div key={current.id} className="border-t border-border pt-5 animate-in fade-in-0 duration-200 motion-reduce:animate-none">
        <BuilderBody b={current} />
      </div>
      <p className="text-[11px] text-muted-foreground">Revisado contra la documentación oficial de cada plataforma el {VERIFIED}. Si algo ya no coincide, la guía oficial de cada una manda. Logos: simple-icons (CC0).</p>
    </section>
  );
}
