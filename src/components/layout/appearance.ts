"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_FRAME, FRAME_VARS, framePreset, isValidLogo } from "@/lib/appearance/presets";

/**
 * Apariencia del panel en este navegador: el fondo de gradiente y el logo de la esquina.
 * Se guarda en localStorage y un evento avisa a los componentes que la usan.
 */
export const FRAME_KEY = "ah-panel-frame";
const LOGO_KEY = "ah-panel-logo";
const EVENT = "ah-panel-appearance";

function get(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

export function applyFrame(id: string) {
  const p = framePreset(id);
  FRAME_VARS.forEach((v, i) => document.documentElement.style.setProperty(v, p.colors[i]));
}

export function setFrame(id: string) {
  try { localStorage.setItem(FRAME_KEY, framePreset(id).id); } catch { /* sin almacenamiento */ }
  applyFrame(id);
  notify();
}

export function useFrame(): string {
  return useSyncExternalStore(subscribe, () => framePreset(get(FRAME_KEY)).id, () => DEFAULT_FRAME);
}

/** Guarda el logo; devuelve false si no cabe en el almacenamiento del navegador. */
export function setLogo(dataUrl: string | null): boolean {
  try {
    if (dataUrl === null) localStorage.removeItem(LOGO_KEY);
    else if (isValidLogo(dataUrl)) localStorage.setItem(LOGO_KEY, dataUrl);
    else return false;
  } catch {
    return false;
  }
  notify();
  return true;
}

export function useLogo(): string | null {
  return useSyncExternalStore(subscribe, () => {
    const v = get(LOGO_KEY);
    return isValidLogo(v) ? v : null;
  }, () => null);
}

/** Reduce la imagen a un máximo de 256 px por lado y la devuelve como PNG en data URL. */
export async function resizeLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("image"));
      i.src = url;
    });
    const scale = Math.min(1, 256 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}
