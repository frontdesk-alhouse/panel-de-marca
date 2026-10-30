"use client";

import { useSyncExternalStore } from "react";

/**
 * Vista simple (solo lo esencial) o completa. Es preferencia de cada navegador: se guarda en
 * localStorage y un evento avisa a todos los componentes que la usan.
 */
export type ViewMode = "simple" | "full";
const KEY = "ah-panel-view-mode";
const EVENT = "ah-panel-view-mode";

function read(): ViewMode {
  try {
    return localStorage.getItem(KEY) === "simple" ? "simple" : "full";
  } catch {
    return "full";
  }
}

export function setViewMode(mode: ViewMode): void {
  try { localStorage.setItem(KEY, mode); } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

export function useViewMode(): ViewMode {
  return useSyncExternalStore(subscribe, read, () => "full");
}
