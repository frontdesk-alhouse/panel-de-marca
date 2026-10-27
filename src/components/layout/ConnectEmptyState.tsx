import Link from "next/link";
import { Plug } from "lucide-react";
import { integration, type IntegrationId } from "@/lib/integrations/catalog";
import { getMessages } from "@/i18n/server";

/** Tarjeta «Conectar»: qué enciende, cuánto cuesta y a dónde ir. */
export async function ConnectCard({ connect, heading }: { connect: IntegrationId; heading?: string }) {
  const t = await getMessages();
  const it = integration(connect);
  const text = t.integrations[it.id];
  return (
    <section aria-labelledby={`connect-${it.id}`} className="max-w-xl rounded-2xl bg-card p-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Plug className="h-4 w-4" aria-hidden strokeWidth={1.75} />
        <span className="font-mono text-[11px] uppercase">{t.connect.notConnected} · {t.cost[it.cost]}</span>
      </div>
      <h2 id={`connect-${it.id}`} className="mt-3 text-xl font-medium">{heading ?? t.connect.title(text.name)}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{text.unlocks}</p>
      <p className="mt-1 text-sm text-muted-foreground">{text.costNote} {t.connect.minutes(it.minutes)}</p>
      <Link href={`/ajustes#${it.id}`} className="mt-5 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2">
        {t.connect.cta}
      </Link>
    </section>
  );
}

/** Sección sin conexión: el título de la sección y la tarjeta para conectarla. */
export async function ConnectEmptyState({ title, connect }: { title: string; connect: IntegrationId }) {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl">{title}</h1>
      <ConnectCard connect={connect} />
    </div>
  );
}
