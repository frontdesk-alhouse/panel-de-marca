"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { copyText } from "./clipboard";

type Props = { text: string; label: string; copiedLabel: string; failedLabel: string; className?: string };

/** Botón pequeño que copia un texto fijo (comandos de instalación, links). */
export function CopyButton({ text, label, copiedLabel, failedLabel, className = "" }: Props) {
  const [isCopied, setIsCopied] = useState(false);
  const handleClick = async () => {
    if (!(await copyText(text))) return void toast.error(failedLabel);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };
  return (
    <button type="button" onClick={handleClick}
      className={`inline-flex h-9 items-center gap-2 rounded-lg bg-background px-3 text-sm transition-[background-color,transform] duration-150 hover:bg-card active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none ${className}`}>
      {isCopied ? <Check className="h-4 w-4 text-good-ink" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      <span aria-live="polite">{isCopied ? copiedLabel : label}</span>
    </button>
  );
}
