"use client";

import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

/** Pop-up del prospecto: al cerrarlo regresa a la lista (atrás en el historial). */
export function LeadModal({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <Dialog open onOpenChange={(open) => { if (!open) router.back(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-6 sm:max-w-6xl md:p-8">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">Detalle del prospecto: datos, seguimiento e historial.</DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  );
}
