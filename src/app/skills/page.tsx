import { existsSync } from "node:fs";
import path from "node:path";
import { Download, ExternalLink, FileText } from "lucide-react";
import { getMessages } from "@/i18n/server";
import { DIMENSIONS } from "@/lib/scorecard/config";
import { installCommand, PUBLIC_REPO_URL, SKILLS } from "@/lib/skills/catalog";
import { SKILLS_DIR } from "@/lib/skills/zip";
import { requestOrigin } from "@/lib/http/origin";
import { CopyButton } from "@/components/handoff/CopyButton";
import { SectionInfo } from "@/components/layout/SectionInfo";
import { ShareButton } from "@/components/handoff/ShareButton";
import { BuilderConnect } from "@/components/builders/BuilderConnect";
import { sitePlatform } from "@/lib/builders/platform";

export const dynamic = "force-dynamic";

/** Catálogo de skills para Claude: qué dimensión mejora cada uno, descarga, GitHub e instalación. */
export default async function SkillsPage() {
  const t = await getMessages();
  const s = t.skills;
  const origin = await requestOrigin();
  const dimLabel = (id: string) => DIMENSIONS.find((d) => d.id === id)?.label ?? id;
  const available = SKILLS.filter((k) => existsSync(path.join(SKILLS_DIR, k.id, "SKILL.md")));
  const platform = await sitePlatform().catch(() => null);

  return (
    <div className="space-y-12">
      <header className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-2"><h1 className="font-display text-4xl md:text-5xl">{t.pages["/skills"].title}</h1><SectionInfo href="/skills" label={t.pages["/skills"].title} className="h-8 w-8" /></div>
          <ShareButton url={PUBLIC_REPO_URL} title={t.shell.defaultTitle} text={t.share.text}
            label={t.share.button} copiedLabel={t.share.copied} failedLabel={s.copyFailed} />
        </div>
        <p className="max-w-[65ch] text-muted-foreground">{s.intro}</p>
      </header>

      <BuilderConnect platform={platform} />

      <ul className="grid gap-5 lg:grid-cols-3">
        {available.map((k) => {
          const item = s.items[k.id];
          const zipPath = `/api/skills/${k.id}/zip`;
          const cmd = installCommand(k, `${origin}${zipPath}`);
          const dims = [...k.dimensions.map(dimLabel)];
          return (
            <li key={k.id} id={k.id} className="flex scroll-mt-24 flex-col gap-5 rounded-2xl bg-card p-6">
              <div className="space-y-2">
                <p className="font-mono text-[11px] uppercase text-muted-foreground">{s.improves}: {dims.join(" · ")}</p>
                <h2 className="font-display text-2xl">{item?.name ?? k.id}</h2>
                <p className="text-sm text-muted-foreground">{item?.description}</p>
              </div>
              <code className="block overflow-x-auto whitespace-pre rounded-lg bg-background px-3 py-2 font-mono text-[11px]">{cmd}</code>
              <div className="mt-auto flex flex-wrap gap-2">
                <a href={zipPath} download className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3 text-sm text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2">
                  <Download className="h-4 w-4" aria-hidden />{s.download}
                </a>
                <CopyButton text={cmd} label={s.copyInstall} copiedLabel={s.copied} failedLabel={s.copyFailed} />
                <a href={`/api/skills/${k.id}/skill-md`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-background px-3 text-sm hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2">
                  <FileText className="h-4 w-4" aria-hidden />SKILL.md
                </a>
                {k.repoUrl ? (
                  <a href={k.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-lg bg-background px-3 text-sm hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2">
                    <ExternalLink className="h-4 w-4" aria-hidden />{s.github}
                  </a>
                ) : <span className="self-center text-xs text-muted-foreground">{s.onlyHere}</span>}
                <ShareButton url={k.repoUrl ?? `${origin}/skills#${k.id}`} title={item?.name ?? k.id} text={item?.description ?? ""}
                  label={s.share} copiedLabel={s.copied} failedLabel={s.copyFailed} isCompact />
              </div>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="how" className="max-w-[70ch] space-y-3">
        <h2 id="how" className="font-display text-2xl">{s.howTitle}</h2>
        <p className="text-sm">{s.howCode}</p>
        <p className="text-sm">{s.howApp}</p>
        <p className="text-sm">{s.howUse}</p>
      </section>

      <section aria-labelledby="otras" className="max-w-[70ch] space-y-3">
        <h2 id="otras" className="font-display text-2xl">{s.otherTitle}</h2>
        <p className="text-sm text-muted-foreground">{s.otherIntro}</p>
        <ul className="list-disc space-y-2 pl-5 text-sm">
          {s.otherItems.map((x) => <li key={x}>{x}</li>)}
        </ul>
      </section>
    </div>
  );
}
