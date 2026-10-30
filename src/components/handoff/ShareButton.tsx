"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "./clipboard";

type Props = { url: string; title: string; text: string; label: string; copiedLabel: string; failedLabel: string; isCompact?: boolean };

/** Comparte con la hoja nativa del sistema (celular, Safari); si no existe, copia el link. */
export function ShareButton({ url, title, text, label, copiedLabel, failedLabel, isCompact = false }: Props) {
  const handleClick = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title, text });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // la persona cerró la hoja
      }
    }
    if (await copyText(url)) toast.success(copiedLabel);
    else toast.error(failedLabel);
  };
  return (
    <button type="button" onClick={handleClick} aria-label={label} title={label}
      className={`inline-flex h-9 items-center gap-2 rounded-lg text-sm transition-[background-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none ${isCompact ? "w-9 justify-center text-muted-foreground hover:bg-card hover:text-foreground" : "bg-background px-3 hover:bg-card"}`}>
      <Share2 className="h-4 w-4" aria-hidden />
      {!isCompact && <span>{label}</span>}
    </button>
  );
}
