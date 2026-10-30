import Link from "next/link";
import { getMessages } from "@/i18n/server";
import { AREAS } from "@/lib/nav/sections";
import { isTechnical } from "@/lib/nav/guide";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { ViewModeToggle } from "@/components/layout/ViewModeToggle";

export const dynamic = "force-dynamic";

/** Guía completa: qué hay en cada sección y para qué sirve, con lo técnico marcado. */
export default async function GuiaPage() {
  const t = await getMessages();
  const g = t.guide;
  const label = (href: string, fallback: string) => t.nav.items[href] ?? fallback;
  const groups = AREAS.map((a) => ({
    key: a.key,
    title: t.nav.areas[a.key] ?? a.label,
    Icon: NAV_ICONS[a.sections.length ? a.key : a.href],
    sections: (a.sections.length ? a.sections : [{ href: a.href, label: a.label }]).map((s) => ({ href: s.href, label: label(s.href, s.label).replace(" · Clarity", "") })),
  }));

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[65ch] space-y-3">
          <h1 className="font-display text-4xl md:text-5xl">{g.open}</h1>
          <p className="text-muted-foreground">
            Qué vas a encontrar en cada sección y para qué te sirve. Lo marcado como «{g.technical}» pide saber de marketing digital;
            en la vista simple no aparece en el menú.
          </p>
        </div>
        <div className="w-56"><ViewModeToggle /></div>
      </header>

      {groups.map(({ key, title, Icon, sections }) => (
        <section key={key} aria-labelledby={`g-${key}`} className="space-y-3">
          <h2 id={`g-${key}`} className="flex items-center gap-2 font-display text-2xl">{Icon && <Icon className="h-5 w-5" aria-hidden />}{title}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {sections.map((s) => {
              const item = g.items[s.href];
              return (
                <li key={s.href}>
                  <Link href={s.href} className="flex h-full flex-col gap-2 rounded-2xl bg-card p-5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-medium">{s.label}</span>
                      {isTechnical(s.href) && <span className="rounded-full bg-background px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">{g.technical}</span>}
                    </span>
                    {item && (
                      <>
                        <span className="text-sm"><span className="text-muted-foreground">{g.see}: </span>{item.what}</span>
                        <span className="text-sm"><span className="text-muted-foreground">{g.use}: </span>{item.use}</span>
                      </>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
