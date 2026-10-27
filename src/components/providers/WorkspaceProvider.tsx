"use client";

import { createContext, useContext } from "react";
import type { PublicWorkspace } from "@/lib/workspace/schema";
import { setClientLocale } from "@/lib/workspace/store";

const WorkspaceContext = createContext<PublicWorkspace | null>(null);

/** Da a los componentes del navegador la parte pública de la configuración (sin brief ni contexto del analista). */
export function WorkspaceProvider({ value, children }: { value: PublicWorkspace | null; children: React.ReactNode }) {
  // Los formatos de moneda y fecha del navegador leen esto sin necesitar el contexto de React.
  if (value) setClientLocale(value.locale);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): PublicWorkspace {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace necesita WorkspaceProvider con configuración cargada");
  return value;
}
