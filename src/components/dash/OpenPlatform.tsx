import { ExternalLink } from "lucide-react";
import { buildPlatformGroups } from "@/lib/platforms/links";
import { ws } from "@/lib/workspace/store";

/** Botón a la plataforma donde se ejecuta la recomendación (pausar, ajustar presupuesto…). */
export function OpenPlatform({ platform, action }: { platform: string; action?: string }) {
  const p = buildPlatformGroups(ws()).flatMap((g) => g.items).find((x) => x.key === platform);
  if (!p) return null;
  return (
    <a href={p.url} target="_blank" rel="noopener noreferrer"
      className="inline-flex h-8 items-center gap-1.5 rounded-md bg-background px-3 font-mono text-[11px] uppercase transition-[background-color,transform] duration-150 hover:bg-secondary active:scale-[0.97] motion-reduce:transform-none">
      {action ?? `Abrir ${p.name}`}<ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
}
