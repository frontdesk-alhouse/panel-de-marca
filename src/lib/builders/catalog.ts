/**
 * Cómo conectar tu IA (Claude Code, la app de Claude, ChatGPT…) al constructor de tu sitio con
 * su servidor MCP oficial, para que pueda hacer los cambios y no solo explicarlos.
 *
 * Todo sale de la documentación oficial de cada plataforma, revisada el día de `VERIFIED`.
 * Si una plataforma cambia su URL o sus pasos, se corrige aquí y se actualiza la fecha.
 */
export const VERIFIED = "2026-10-29";

export const BUILDER_IDS = ["webflow", "framer", "shopify", "wordpress", "wix", "squarespace", "duda"] as const;
export type BuilderId = (typeof BUILDER_IDS)[number];

export interface Builder {
  id: BuilderId;
  name: string;
  /** «oficial»: edita el sitio; «parcial»: existe pero no edita páginas o está en beta. */
  status: "oficial" | "parcial" | "beta";
  /** Dirección del servidor MCP (si es remoto). */
  mcpUrl?: string;
  /** Comandos para Claude Code, en orden. */
  claudeCode: string[];
  /** Cómo agregarlo en la app de Claude (claude.ai o escritorio). */
  claudeApp: string;
  /** ChatGPT u otras IA, si la plataforma lo documenta. */
  otherAis?: string;
  /** Qué puede hacer la IA ya conectada. */
  can: string;
  /** Límites que conviene saber antes. */
  limits?: string;
  /** Skills o plugins oficiales que le enseñan a la IA a usarlo bien. */
  skills?: { name: string; url: string; install?: string[] };
  docs: string;
}

export const BUILDERS: readonly Builder[] = [
  {
    id: "webflow",
    name: "Webflow",
    status: "oficial",
    mcpUrl: "https://mcp.webflow.com/mcp",
    claudeCode: ["claude mcp add --transport http webflow https://mcp.webflow.com/mcp", "/mcp   (elige Webflow y autoriza en el navegador)"],
    claudeApp: "En Claude: + → Conectores → busca «Webflow» (en «All») → Conectar, y elige tus sitios.",
    otherAis: "ChatGPT tiene la app oficial de Webflow (se usa escribiendo @Webflow).",
    can: "Editar el CMS, páginas, elementos, estilos, componentes, SEO y código propio, hacer auditorías y publicar.",
    limits: "Los cambios visuales necesitan el Designer abierto con la Bridge App. Una autorización cubre un Workspace. Solo dueños, admins o site managers pueden autorizar.",
    skills: { name: "Webflow skills (oficial)", url: "https://github.com/webflow/webflow-skills", install: ["claude plugin marketplace add webflow/webflow-skills", "claude plugin install webflow-skills@webflow-skills"] },
    docs: "https://developers.webflow.com/mcp/reference/getting-started",
  },
  {
    id: "framer",
    name: "Framer",
    status: "oficial",
    mcpUrl: "https://mcp.framer.com/mcp",
    claudeCode: ["claude mcp add --transport http --scope user framer https://mcp.framer.com/mcp", "claude mcp login framer"],
    claudeApp: "En Claude: abre claude.ai/directory/framer → Conectar.",
    otherAis: "ChatGPT tiene el plugin de Framer; Cursor y Codex también están documentados.",
    can: "Crear páginas, editar diseño y contenido, manejar el CMS y publicar cuando se lo pides. No hace falta tener el editor abierto.",
    limits: "Pásale a la IA el link completo del proyecto. Un admin del workspace puede tener que aprobar la conexión. La traducción (localization) no está incluida.",
    docs: "https://www.framer.com/help/articles/getting-started-with-framer-mcp/",
  },
  {
    id: "shopify",
    name: "Shopify",
    status: "oficial",
    claudeCode: ["claude plugin install shopify-ai-toolkit@claude-plugins-official   (para el código del tema)"],
    claudeApp: "En Claude: abre claude.ai/directory/connectors/shopify → Conectar y aprueba en el admin de tu tienda (mejor desde computadora).",
    otherAis: "ChatGPT tiene la app oficial de Shopify.",
    can: "Crear y editar productos, colecciones, inventario y descuentos; editar el tema en una copia sin publicar; leer pedidos, clientes y analítica.",
    limits: "No hace reembolsos ni toca pagos, impuestos o dominios. Una tienda a la vez. Los cambios grandes van uno por uno y pueden quedarse a medias.",
    skills: { name: "Shopify AI Toolkit (oficial)", url: "https://github.com/Shopify/shopify-ai-toolkit", install: ["npx skills add Shopify/shopify-ai-toolkit"] },
    docs: "https://help.shopify.com/en/manual/ai-powered-tools/connecting-ai-tools/shopify-connector-for-claude",
  },
  {
    id: "wordpress",
    name: "WordPress",
    status: "oficial",
    mcpUrl: "https://public-api.wordpress.com/wpcom/v2/mcp/v1",
    claudeCode: ["claude mcp add --transport http wpcom-mcp https://public-api.wordpress.com/wpcom/v2/mcp/v1", "/mcp   (inicia sesión con WordPress.com)"],
    claudeApp: "En Claude: abre claude.com/connectors/wordpress-com → Conectar. Antes, activa el acceso de agentes en my.wordpress.com/me/preferences/mcp.",
    otherAis: "ChatGPT tiene el plugin de WordPress.com; Cursor, Codex y Gemini CLI también están documentados.",
    can: "Crear y editar entradas y páginas (bloque por bloque), medios, temas, estilos, menús, plugins (según tu plan) y productos de WooCommerce.",
    limits: "Sirve para WordPress.com y para WordPress propio conectado con Jetpack (gratis). En SEO solo toca la descripción de la Home. Cada cambio pide confirmación. Sin Jetpack existe el plugin oficial MCP Adapter, pero es más técnico.",
    skills: { name: "WordPress agent skills (oficial, para desarrollo)", url: "https://github.com/WordPress/agent-skills" },
    docs: "https://developer.wordpress.com/docs/mcp/",
  },
  {
    id: "wix",
    name: "Wix",
    status: "oficial",
    mcpUrl: "https://mcp.wix.com/mcp",
    claudeCode: ["claude mcp add --transport http wix-mcp-remote https://mcp.wix.com/mcp", "/mcp   (autoriza con tu cuenta de Wix)"],
    claudeApp: "En Claude: abre claude.com/connectors/wix → Conectar.",
    otherAis: "Cursor, Codex y Gemini CLI están documentados.",
    can: "Productos, reservas, entradas del blog y datos de tus apps de Wix; subir medios y publicar el sitio.",
    limits: "Trabaja por API: no mueve cosas en el editor visual.",
    skills: { name: "Wix skills (oficial, experimental)", url: "https://github.com/wix/skills", install: ["/plugin marketplace add wix/skills", "/plugin install wix@wix"] },
    docs: "https://dev.wix.com/docs/api-reference/articles/ai-tools/wix-mcp/about-the-wix-mcp",
  },
  {
    id: "squarespace",
    name: "Squarespace",
    status: "parcial",
    mcpUrl: "https://mcp.squarespace.com/mcp",
    claudeCode: ["claude mcp add --transport http squarespace https://mcp.squarespace.com/mcp", "/mcp   (inicia sesión para la tienda)"],
    claudeApp: "En Claude: Ajustes → Conectores → Agregar conector personalizado → pega la dirección.",
    otherAis: "ChatGPT: conector personalizado con la misma dirección.",
    can: "Dominios (ideas y precios), y en la tienda: productos y contactos; leer pedidos.",
    limits: "No edita las páginas del sitio. Para el contenido, usa la IA que trae el editor de Squarespace y pásale lo que te dé el panel.",
    docs: "https://developers.squarespace.com/mcp/overview",
  },
  {
    id: "duda",
    name: "Duda",
    status: "beta",
    mcpUrl: "https://mcp.duda.co/mcp",
    claudeCode: ["claude mcp add --transport http duda https://mcp.duda.co/mcp   (el patrón estándar; Duda documenta la app de Claude)"],
    claudeApp: "En Claude: Ajustes → Conectores → Agregar conector personalizado → pega la dirección.",
    otherAis: "ChatGPT y Cursor están documentados.",
    can: "Construir y administrar tus sitios y tu cuenta de Duda.",
    limits: "Está en beta y Duda avisa que algunos cambios no se pueden deshacer.",
    docs: "https://developer.duda.co/docs/duda-mcp-server",
  },
];

/** Plataformas que el chequeo del sitio sabe reconocer (ver lib/geo/html.ts). */
export function builderFor(platform: string | null | undefined): Builder | null {
  return BUILDERS.find((b) => b.id === platform) ?? null;
}

/**
 * Instrucciones en texto para pegarlas en lo que se copia a la IA: así la IA sabe cómo
 * conectarse al sitio antes de intentar cambiarlo (o lo pide).
 */
export function connectInstructions(b: Builder, target: "code" | "app" | "other"): string[] {
  const lines = [`El sitio está hecho en ${b.name}. Para hacer los cambios directo en el sitio, conéctate a su servidor MCP oficial${b.status === "parcial" ? " (ojo: no edita páginas)" : ""}:`];
  if (target === "code") b.claudeCode.forEach((c) => lines.push(`- \`${c}\``));
  else lines.push(`- ${b.claudeApp}`);
  if (target === "other" && b.otherAis) lines.push(`- ${b.otherAis}`);
  if (b.limits) lines.push(`- Límites: ${b.limits}`);
  lines.push(`- Guía oficial: ${b.docs}`);
  lines.push("Si todavía no tienes acceso, dime qué paso falta en lugar de inventar los cambios.");
  return lines;
}
