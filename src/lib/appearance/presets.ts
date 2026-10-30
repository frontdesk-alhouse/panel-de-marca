/**
 * Fondos de gradiente del marco del panel. Cada uno define los tres focos de color y la base
 * que usa `.shader-frame` (globals.css). Es preferencia de cada navegador.
 */
export interface FramePreset {
  id: string;
  label: string;
  /** Focos: arriba a la izquierda, arriba a la derecha, abajo; y el color base. */
  colors: [string, string, string, string];
}

export const FRAME_PRESETS: readonly FramePreset[] = [
  { id: "arena", label: "Arena", colors: ["rgb(242 178 120)", "rgb(140 160 178)", "rgb(250 205 140)", "rgb(228 196 160)"] },
  { id: "atardecer", label: "Atardecer", colors: ["rgb(255 122 51)", "rgb(214 120 170)", "rgb(255 197 61)", "rgb(238 160 120)"] },
  { id: "oceano", label: "Océano", colors: ["rgb(96 165 220)", "rgb(120 200 190)", "rgb(160 190 240)", "rgb(170 200 225)"] },
  { id: "lavanda", label: "Lavanda", colors: ["rgb(190 160 235)", "rgb(240 170 200)", "rgb(170 180 245)", "rgb(210 195 235)"] },
  { id: "bosque", label: "Bosque", colors: ["rgb(120 170 120)", "rgb(200 190 120)", "rgb(150 190 150)", "rgb(180 195 160)"] },
  { id: "grafito", label: "Grafito", colors: ["rgb(150 150 160)", "rgb(110 120 140)", "rgb(190 190 195)", "rgb(170 170 178)"] },
] as const;

export const DEFAULT_FRAME = "arena";
export const FRAME_VARS = ["--frame-1", "--frame-2", "--frame-3", "--frame-base"] as const;

export function framePreset(id: string | null | undefined): FramePreset {
  return FRAME_PRESETS.find((p) => p.id === id) ?? FRAME_PRESETS[0];
}

/** Tamaño máximo del logo guardado (data URL), para no llenar el almacenamiento del navegador. */
export const MAX_LOGO_CHARS = 400_000;

/** Un logo guardado solo vale si es una imagen raster en data URL y no es enorme. */
export function isValidLogo(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_LOGO_CHARS && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

/**
 * Script que corre antes de pintar: aplica el fondo guardado para que no parpadee el de
 * fábrica. Se genera desde los presets para que nunca se desincronice.
 */
export function frameBootScript(storageKey: string): string {
  const map = Object.fromEntries(FRAME_PRESETS.map((p) => [p.id, p.colors]));
  return `(function(){try{var m=${JSON.stringify(map)};var c=m[localStorage.getItem(${JSON.stringify(storageKey)})];if(!c)return;var v=${JSON.stringify(FRAME_VARS)};for(var i=0;i<4;i++)document.documentElement.style.setProperty(v[i],c[i]);}catch(e){}})();`;
}
