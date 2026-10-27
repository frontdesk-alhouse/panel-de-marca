import { loadWorkspace } from "@/lib/workspace/load";
import { ws } from "@/lib/workspace/store";
import { redirect } from "next/navigation";
import { getViewer, signIn } from "@/auth";
import { getMessages } from "@/i18n/server";


async function loginWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/" });
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getViewer()) redirect("/");
  const { error } = await searchParams;
  const t = await getMessages();
  const errors: Record<string, string> = { AccessDenied: t.login.denied, Configuration: t.login.notConfigured };
  const message = error ? (errors[error] ?? t.login.failed) : null;
  const name = (await loadWorkspace().catch(() => false)) ? ws().brand.name : null;

  return (
    <main className="min-h-[calc(100dvh-1rem)] md:min-h-[calc(100dvh-1.5rem)] grid md:grid-cols-[1.15fr_1fr] gap-2 md:gap-3">
      <section className="hidden md:flex flex-col justify-between p-10 text-[#09090b]">
        <p className="font-mono text-[11px] uppercase">{name ?? t.shell.defaultTitle}</p>
        <p className="font-display text-6xl leading-[0.95] tracking-tight max-w-[12ch]">{t.login.tagline}</p>
      </section>
      <section className="bg-background rounded-[20px] flex flex-col justify-center gap-8 px-6 py-16 md:px-16">
        <div className="space-y-3 max-w-sm">
          <h1 className="font-display text-4xl leading-none">{name ? t.shell.title(name) : t.shell.defaultTitle}</h1>
          <p className="text-muted-foreground">{t.login.withTeam}</p>
        </div>
        {message && (
          <p role="alert" className="text-sm rounded-xl bg-card px-4 py-3 max-w-sm">{message}</p>
        )}
        <form action={loginWithGoogle} className="max-w-sm">
          <button
            type="submit"
            className="w-full h-11 rounded-md bg-primary text-primary-foreground font-mono text-xs uppercase hover:opacity-85 active:translate-y-px transition"
          >
            {t.login.button}
          </button>
        </form>
      </section>
    </main>
  );
}
