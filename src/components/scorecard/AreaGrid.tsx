"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export interface AreaEntry {
  id: string;
  title: string;
  /** Contenido de la tarjeta (se arma en el servidor). */
  card: React.ReactNode;
  /** Detalle del área para el pop-up (se arma en el servidor). */
  detail: React.ReactNode;
}

/**
 * Las áreas de la calificación como tarjetas: cada una abre su detalle en un pop-up, sin bajar
 * por la página. Un enlace con #área (de otra sección o compartido) abre el pop-up de esa área.
 */
export function AreaGrid({ areas }: { areas: AreaEntry[] }) {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const fromHash = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (areas.some((a) => a.id === id)) setOpen(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [areas]);

  const close = () => {
    setOpen(null);
    // Quita el #área sin saltar ni agregar una entrada al historial.
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  };
  const current = areas.find((a) => a.id === open);

  return (
    <>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {areas.map((a) => (
          <li key={a.id}>
            <button type="button" onClick={() => setOpen(a.id)} aria-haspopup="dialog"
              className="flex h-full w-full flex-col gap-2 rounded-2xl bg-card p-4 text-left transition-[background-color,transform] duration-150 hover:bg-secondary active:scale-[0.99] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {a.card}
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={Boolean(current)} onOpenChange={(o) => { if (!o) close(); }}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto p-6 sm:max-w-4xl md:p-8">
          {current && (
            <>
              <DialogTitle className="sr-only">{current.title}</DialogTitle>
              <DialogDescription className="sr-only">Qué mide esta área, sus métricas y qué la sube.</DialogDescription>
              {current.detail}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
