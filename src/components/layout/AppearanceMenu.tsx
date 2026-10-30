"use client";

import { useRef, useState } from "react";
import { Check, ImagePlus, Palette, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FRAME_PRESETS } from "@/lib/appearance/presets";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { resizeLogo, setFrame, setLogo, useFrame, useLogo } from "./appearance";

/** Muestra del gradiente: la misma receta de .shader-frame en pequeño. */
function swatch(colors: readonly string[]) {
  return {
    background: `radial-gradient(70% 80% at 15% 20%, ${colors[0]} 0%, transparent 65%), radial-gradient(60% 70% at 85% 25%, ${colors[1]} 0%, transparent 65%), radial-gradient(80% 70% at 50% 105%, ${colors[2]} 0%, transparent 70%), ${colors[3]}`,
  };
}

/** Apariencia del panel: fondo de gradiente y logo de la esquina (se guardan en este navegador). */
export function AppearanceMenu() {
  const t = useT().appearance;
  const frame = useFrame();
  const logo = useLogo();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) return setError(t.badType);
    try {
      if (!setLogo(await resizeLogo(file))) setError(t.tooBig);
    } catch {
      setError(t.badType);
    }
  }

  return (
    <Popover>
      <PopoverTrigger aria-label={t.button} title={t.button}
        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground active:scale-95">
        <Palette className="h-4 w-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 gap-4 p-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.background}</p>
          <div role="radiogroup" aria-label={t.background} className="grid grid-cols-3 gap-2">
            {FRAME_PRESETS.map((p) => {
              const on = p.id === frame;
              return (
                <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setFrame(p.id)}
                  className={cn("group space-y-1 rounded-lg p-1 text-left transition active:scale-95", on ? "ring-2 ring-ring" : "hover:bg-card")}>
                  <span className="relative block h-10 rounded-md" style={swatch(p.colors)}>
                    {on && <Check className="absolute right-1 top-1 h-3.5 w-3.5 text-foreground" aria-hidden />}
                  </span>
                  <span className="block px-0.5 text-[11px] text-muted-foreground">{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">{t.logo}</p>
          <p className="text-xs text-muted-foreground">{t.logoHint}</p>
          <div className="flex items-center gap-2">
            {logo && <img src={logo} alt="" className="h-9 w-9 rounded-md bg-card object-contain p-1" />}
            <button type="button" onClick={() => input.current?.click()}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-card px-2.5 text-xs font-medium transition hover:bg-accent active:scale-95">
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />{logo ? t.change : t.upload}
            </button>
            {logo && (
              <button type="button" onClick={() => setLogo(null)} aria-label={t.remove} title={t.remove}
                className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition hover:bg-card hover:text-foreground active:scale-95">
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
            <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" tabIndex={-1}
              onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        </div>
        <p className="text-[11px] text-muted-foreground">{t.local}</p>
      </PopoverContent>
    </Popover>
  );
}
