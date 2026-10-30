"use client";

import { useSyncExternalStore } from "react";

/**
 * Estado de la columna del copiloto: abierta o cerrada (se recuerda en este navegador) y una
 * pregunta pendiente que llega del buscador del encabezado.
 */
const OPEN_KEY = "ah-panel-copilot-open";
const EVENT = "ah-panel-copilot";

let pending: string | null = null;

function notify() {
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

function isOpen(): boolean {
  try { return localStorage.getItem(OPEN_KEY) === "1"; } catch { return false; }
}

export function setCopilotOpen(open: boolean) {
  try { localStorage.setItem(OPEN_KEY, open ? "1" : "0"); } catch { /* sin almacenamiento */ }
  notify();
}

export function toggleCopilot() {
  setCopilotOpen(!isOpen());
}

/** Abre la columna y le deja una pregunta para que la haga al montar. */
export function askCopilot(question: string) {
  pending = question;
  setCopilotOpen(true);
}

/** Toma la pregunta pendiente (una sola vez). */
export function takePendingQuestion(): string | null {
  const q = pending;
  pending = null;
  return q;
}

export function usePendingQuestion(): string | null {
  return useSyncExternalStore(subscribe, () => pending, () => null);
}

export function useCopilotOpen(): boolean {
  return useSyncExternalStore(subscribe, isOpen, () => false);
}
