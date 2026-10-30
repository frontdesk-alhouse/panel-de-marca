"use client";

import { useSyncExternalStore } from "react";
import { MessageSquare, Star, X } from "lucide-react";
import { useT } from "@/i18n/client";
import { PUBLIC_REPO_URL } from "@/lib/skills/catalog";

const KEY = "ah-panel-community-hidden";
const EVENT = "ah-panel-community";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

function isHidden(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

const link = "inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition active:scale-95";

/** Invitación a darle estrella o dejar un comentario en GitHub. Se puede cerrar. */
export function CommunityCard() {
  const t = useT().community;
  // Escondida en el servidor y hasta leer la preferencia: no parpadea al cargar.
  const hidden = useSyncExternalStore(subscribe, isHidden, () => true);
  if (hidden) return null;
  const close = () => {
    try { localStorage.setItem(KEY, "1"); } catch { /* sin almacenamiento */ }
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <div className="relative space-y-2 rounded-xl bg-card p-3">
      <button type="button" onClick={close} aria-label={t.close} title={t.close}
        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground">
        <X className="h-3.5 w-3.5" aria-hidden />
      </button>
      <p className="pr-6 text-xs font-medium">{t.title}</p>
      <p className="text-[11px] leading-snug text-muted-foreground">{t.text}</p>
      <div className="flex gap-1.5">
        <a href={PUBLIC_REPO_URL} target="_blank" rel="noopener noreferrer" className={`${link} bg-primary text-primary-foreground hover:opacity-90`}>
          <Star className="h-3.5 w-3.5" aria-hidden />{t.star}
        </a>
        <a href={`${PUBLIC_REPO_URL}/issues/new?title=${encodeURIComponent(t.issueTitle)}`} target="_blank" rel="noopener noreferrer" className={`${link} bg-background hover:bg-accent`}>
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />{t.review}
        </a>
      </div>
    </div>
  );
}
