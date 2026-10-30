/**
 * «Copiar para Claude»: convierte un análisis del panel en instrucciones listas para
 * pegar en Claude Code (que puede tocar el código del sitio y correr scripts), en la
 * app de Claude (que guía paso a paso) o en otra IA (ChatGPT, Gemini). Puro: corre en
 * el navegador con lo que la persona eligió (acciones y skills).
 */
export type HandoffTarget = "code" | "app" | "other";
export type HandoffLang = "es" | "en";
export type Impact = "alto" | "medio" | "bajo";
export type Confidence = "alta" | "media" | "baja";

export interface HandoffMetric {
  label: string;
  /** Valor ya formateado, p. ej. «1.2 %». */
  value: string;
  /** Meta o umbral para verde, ya formateado. */
  target?: string;
  band?: "green" | "yellow" | "red";
  source?: string;
}

/** Por qué creerle a una recomendación: el dato, qué tan sólido es y cuánto mueve. */
export interface Evidence {
  confidence: Confidence;
  /** De dónde sale la confianza: «benchmark de industria», «umbral propio», «muestra chica»… */
  basis: string;
  /** Puntos que puede sumar a la calificación general si llega a verde (aprox.). */
  points?: number;
}

export interface HandoffItem {
  id: string;
  title: string;
  detail?: string;
  impact?: Impact;
  metric?: HandoffMetric;
  evidence?: Evidence;
}

export interface HandoffSkill {
  id: string;
  name: string;
  short?: string;
  zipUrl: string;
  repoUrl?: string;
}

export interface HandoffInput {
  /** De dónde sale: «Calificación», «Análisis semanal», «SEO»… */
  origin: string;
  brand: { name: string; domain: string; city?: string; context?: string };
  /** Fecha de los datos (AAAA-MM-DD). */
  asOf: string;
  summary?: string;
  items: readonly HandoffItem[];
  /** Notas que no son acciones: lo que no conviene tocar todavía, riesgos. */
  notes?: readonly string[];
  skills: readonly HandoffSkill[];
  panelUrl: string;
  /** Fecha de hoy para el ejemplo del bloque de cambios (por defecto, la de los datos). */
  today?: string;
}

/** Áreas válidas del bloque de cambios (las mismas de la bitácora). */
export const CHANGE_BLOCK_AREAS = "general, visibilidad, conversion, inversion, pipeline, adquisicion, marca, experiencia";

const IMPACT_ORDER: Record<Impact, number> = { alto: 0, medio: 1, bajo: 2 };

const TEXT = {
  es: {
    title: (origin: string, brand: string) => `# ${origin} de ${brand}: qué hacer`,
    context: "## Contexto",
    brand: "Marca",
    site: "Sitio",
    city: "Ciudad",
    business: "Negocio",
    data: (asOf: string, url: string) => `Datos del panel de marca al ${asOf} (${url}).`,
    summary: "## Resumen",
    actions: "## Qué hay que mover (en orden)",
    impact: { alto: "impacto alto", medio: "impacto medio", bajo: "impacto bajo" },
    now: "hoy",
    goal: "meta",
    band: { green: "verde", yellow: "amarillo", red: "rojo" },
    source: "fuente",
    confidence: (e: Evidence) => `Confianza ${e.confidence}: ${e.basis}.${e.points ? ` Puede sumar hasta +${e.points} puntos a la calificación.` : ""}`,
    notes: "## Ten en cuenta",
    skills: "## Skills que debes usar",
    skillLine: (s: HandoffSkill) =>
      `- **${s.id}** (${s.name}${s.short ? `: ${s.short}` : ""}). Si no lo tienes: ${s.repoUrl ? `${s.repoUrl} o ` : ""}${s.zipUrl}`,
    noSkills: "No hay un skill específico para esto; trabaja con buenas prácticas y explica tus fuentes.",
    how: "## Cómo trabajar",
    code: [
      "1. Carga los skills de arriba antes de empezar y sigue su método, no uno improvisado.",
      "2. Ubica dónde vive el sitio (repo local, Webflow, Framer u otro). Si no lo sabes, pregúntamelo antes de suponer.",
      "3. Empieza por la acción de mayor impacto. Antes de cambiar algo, mide el estado actual con los scripts del skill.",
      "4. Haz los cambios en una rama o en staging; no publiques a producción sin mi visto bueno.",
      "5. Verifica cada cambio con el mismo instrumento con que mediste y dime qué métrica del panel debería moverse y en cuánto tiempo.",
      "6. Si algo no se puede hacer desde aquí (cuentas de anuncios, Search Console), dame los pasos exactos para hacerlo yo.",
    ],
    app: [
      "1. Usa los skills de arriba (súbelos en Ajustes → Capacidades → Skills si aún no están).",
      "2. Guíame paso a paso, empezando por la acción de mayor impacto. Una acción a la vez.",
      "3. Para cada paso dime dónde hacer clic o qué pegar, en qué plataforma (Webflow, Framer, Google Ads, Meta, GA4…), y cómo compruebo que quedó.",
      "4. Si necesitas ver algo (código, una captura, un exporte), pídemelo en lugar de suponer.",
      "5. Al final, dime qué métrica del panel debería moverse y en cuánto tiempo.",
    ],
    other: [
      "1. Los skills de arriba son instrucciones en Markdown (archivo SKILL.md dentro del zip). Si puedes cargar archivos, te los subo; si no, pídeme que te pegue el SKILL.md y síguelo como método.",
      "2. Guíame paso a paso, empezando por la acción de mayor impacto. Una acción a la vez.",
      "3. Para cada paso dime dónde hacer clic o qué pegar, en qué plataforma, y cómo compruebo que quedó.",
      "4. No inventes datos: si necesitas algo (código, una captura, un exporte), pídemelo.",
      "5. Al final, dime qué métrica del panel debería moverse y en cuánto tiempo.",
    ],
    done: "## Cuándo está hecho",
    doneText: "Cuando cada acción tenga evidencia (captura, URL o resultado del script) y sepamos qué número del panel revisar y cuándo. Vuelve a sincronizar el panel después de publicar.",
    log: "## Al terminar: registra los cambios en el panel",
    logText: (today: string) => [
      "Cierra tu respuesta con este bloque, una línea por cambio que de verdad quedó hecho (no lo pendiente). Lo pego tal cual en el panel y se registra solo en la bitácora:",
      "",
      "```panel-cambios",
      `- ${today} | propio | conversion | Qué cambió, en una frase | https://enlace-opcional`,
      "```",
      "",
      `Formato: fecha AAAA-MM-DD | propio o externo | área (${CHANGE_BLOCK_AREAS}) | qué cambió | enlace opcional.`,
    ],
  },
  en: {
    title: (origin: string, brand: string) => `# ${origin} for ${brand}: what to do`,
    context: "## Context",
    brand: "Brand",
    site: "Site",
    city: "City",
    business: "Business",
    data: (asOf: string, url: string) => `Brand panel data as of ${asOf} (${url}).`,
    summary: "## Summary",
    actions: "## What needs to move (in order)",
    impact: { alto: "high impact", medio: "medium impact", bajo: "low impact" },
    now: "now",
    goal: "target",
    band: { green: "green", yellow: "yellow", red: "red" },
    source: "source",
    confidence: (e: Evidence) => `Confidence ${({ alta: "high", media: "medium", baja: "low" } as const)[e.confidence]}: ${e.basis}.${e.points ? ` Can add up to +${e.points} points to the score.` : ""}`,
    notes: "## Keep in mind",
    skills: "## Skills to use",
    skillLine: (s: HandoffSkill) =>
      `- **${s.id}** (${s.name}${s.short ? `: ${s.short}` : ""}). If it isn't installed: ${s.repoUrl ? `${s.repoUrl} or ` : ""}${s.zipUrl}`,
    noSkills: "There is no specific skill for this; follow best practices and cite your sources.",
    how: "## How to work",
    code: [
      "1. Load the skills above before starting and follow their method, not an improvised one.",
      "2. Find where the site lives (local repo, Webflow, Framer or other). If you don't know, ask me before assuming.",
      "3. Start with the highest-impact action. Before changing anything, measure the current state with the skill's scripts.",
      "4. Make changes on a branch or in staging; don't publish to production without my OK.",
      "5. Verify each change with the same instrument you measured with, and tell me which panel metric should move and how soon.",
      "6. If something can't be done from here (ad accounts, Search Console), give me the exact steps to do it myself.",
    ],
    app: [
      "1. Use the skills above (upload them in Settings → Capabilities → Skills if they aren't there yet).",
      "2. Guide me step by step, starting with the highest-impact action. One action at a time.",
      "3. For each step tell me where to click or what to paste, on which platform (Webflow, Framer, Google Ads, Meta, GA4…), and how I check it worked.",
      "4. If you need to see something (code, a screenshot, an export), ask me instead of assuming.",
      "5. At the end, tell me which panel metric should move and how soon.",
    ],
    other: [
      "1. The skills above are Markdown instructions (SKILL.md inside the zip). If you can take files, I'll upload them; if not, ask me to paste SKILL.md and follow it as the method.",
      "2. Guide me step by step, starting with the highest-impact action. One action at a time.",
      "3. For each step tell me where to click or what to paste, on which platform, and how I check it worked.",
      "4. Don't make up data: if you need something (code, a screenshot, an export), ask me.",
      "5. At the end, tell me which panel metric should move and how soon.",
    ],
    done: "## When it's done",
    doneText: "When every action has evidence (screenshot, URL or script output) and we know which panel number to check and when. Sync the panel again after publishing.",
    log: "## When you finish: log the changes in the panel",
    logText: (today: string) => [
      "End your answer with this block, one line per change that is actually done (not pending). I paste it as is into the panel and it logs itself:",
      "",
      "```panel-cambios",
      `- ${today} | propio | conversion | What changed, in one sentence | https://optional-link`,
      "```",
      "",
      `Format: date YYYY-MM-DD | propio (ours) or externo (external) | area (${CHANGE_BLOCK_AREAS}) | what changed | optional link.`,
    ],
  },
} as const;

function metricLine(m: HandoffMetric, t: (typeof TEXT)[HandoffLang]): string {
  const parts = [`${t.now}: ${m.value}`];
  if (m.target) parts.push(`${t.goal}: ${m.target}`);
  if (m.band) parts.push(t.band[m.band]);
  if (m.source) parts.push(`${t.source}: ${m.source}`);
  return `${m.label} (${parts.join(" · ")})`;
}

/** Orden estable: primero impacto alto, luego más puntos posibles, luego el orden original. */
export function sortItems(items: readonly HandoffItem[]): HandoffItem[] {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) =>
      (IMPACT_ORDER[a.item.impact ?? "medio"] - IMPACT_ORDER[b.item.impact ?? "medio"])
      || ((b.item.evidence?.points ?? 0) - (a.item.evidence?.points ?? 0))
      || a.i - b.i)
    .map(({ item }) => item);
}

export function buildHandoff(input: HandoffInput, target: HandoffTarget, lang: HandoffLang = "es"): string {
  const t = TEXT[lang];
  const out: string[] = [t.title(input.origin, input.brand.name), "", t.context];
  out.push(`- ${t.brand}: ${input.brand.name}`);
  out.push(`- ${t.site}: https://${input.brand.domain}`);
  if (input.brand.city) out.push(`- ${t.city}: ${input.brand.city}`);
  if (input.brand.context) out.push(`- ${t.business}: ${input.brand.context}`);
  out.push(`- ${t.data(input.asOf, input.panelUrl)}`);

  if (input.summary?.trim()) out.push("", t.summary, input.summary.trim());

  const items = sortItems(input.items.filter((i) => i.title.trim()));
  if (items.length) {
    out.push("", t.actions);
    items.forEach((item, n) => {
      const tag = item.impact ? ` _(${t.impact[item.impact]})_` : "";
      out.push(`${n + 1}. **${item.title.trim()}**${tag}`);
      if (item.metric) out.push(`   - ${metricLine(item.metric, t)}`);
      if (item.evidence) out.push(`   - ${t.confidence(item.evidence)}`);
      if (item.detail?.trim()) out.push(`   - ${item.detail.trim()}`);
    });
  }

  const notes = (input.notes ?? []).filter((n) => n.trim());
  if (notes.length) out.push("", t.notes, ...notes.map((n) => `- ${n.trim()}`));

  out.push("", t.skills);
  out.push(...(input.skills.length ? input.skills.map(t.skillLine) : [t.noSkills]));
  out.push("", t.how, ...t[target]);
  out.push("", t.done, t.doneText);
  out.push("", t.log, ...t.logText(input.today ?? input.asOf));
  return `${out.join("\n")}\n`;
}
