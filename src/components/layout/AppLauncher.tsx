"use client";

import { LayoutGrid } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { buildPlatformGroups } from "@/lib/platforms/links";
import { useT } from "@/i18n/client";

/** Lanzador de plataformas al estilo de Google: cada cuenta a un clic, sin buscar en el historial. */
export function AppLauncher() {
  const w = useWorkspace();
  const t = useT();
  const groups = buildPlatformGroups(w);
  return (
    <Popover>
      <PopoverTrigger aria-label={t.shell.openPlatforms} title={t.shell.platforms}
        className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground transition-[background-color,transform] duration-150 hover:bg-card hover:text-foreground active:scale-[0.95] data-[popup-open]:bg-card data-[popup-open]:text-foreground motion-reduce:transform-none">
        <LayoutGrid className="h-5 w-5" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="bottom" align="end" sideOffset={8} className="w-[min(92vw,360px)] max-h-[80dvh] overflow-y-auto rounded-2xl p-3">
        <nav aria-label={`${t.shell.platforms} · ${w.brand.name}`} className="space-y-3">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className="px-2 pb-1 font-mono text-[10px] uppercase text-muted-foreground">{g.title}</h2>
              <ul className="grid grid-cols-3 gap-1">
                {g.items.map((p) => (
                  <li key={p.key}>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" title={p.use}
                      className="flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center transition-[background-color,transform] duration-150 hover:bg-background active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-background">
                        {/* eslint-disable-next-line @next/next/no-img-element -- favicon externo de 32 px; next/image no aporta aquí */}
                        <img src={p.icon ?? `https://www.google.com/s2/favicons?domain=${p.domain}&sz=64`} alt="" width={22} height={22} loading="lazy" className="h-[22px] w-[22px]" />
                      </span>
                      <span className="text-[11px] leading-tight">{p.name}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>
      </PopoverContent>
    </Popover>
  );
}
