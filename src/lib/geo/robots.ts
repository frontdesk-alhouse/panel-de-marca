/**
 * robots.txt como lo leen los rastreadores (port de check_html_crudo.py del skill seo-geo):
 * se unen los User-agent consecutivos, gana el patrón más largo y en empate gana Allow.
 */
export interface RobotsGroup { agents: string[]; rules: { allow: boolean; pattern: string }[] }

export function parseRobots(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let expectingAgents = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.split("#", 1)[0].trim();
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    if (key === "user-agent") {
      if (!expectingAgents || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      expectingAgents = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      expectingAgents = false;
      if (value) current.rules.push({ allow: key === "allow", pattern: value }); // «Disallow:» vacío no bloquea
    }
  }
  return groups;
}

/** Reglas del grupo del bot (se unen grupos repetidos); si no tiene grupo propio, las de «*». */
export function rulesFor(groups: readonly RobotsGroup[], token: string): { rules: RobotsGroup["rules"]; group: string } {
  const t = token.toLowerCase();
  if (groups.some((g) => g.agents.includes(t))) return { rules: groups.filter((g) => g.agents.includes(t)).flatMap((g) => g.rules), group: t };
  return { rules: groups.filter((g) => g.agents.includes("*")).flatMap((g) => g.rules), group: "*" };
}

function patternRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = pattern.replace(/\$$/, "").replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

export function isAllowed(rules: RobotsGroup["rules"], path: string): { allowed: boolean; rule: string } {
  const matches = rules.filter((r) => patternRegex(r.pattern).test(path));
  if (!matches.length) return { allowed: true, rule: "(sin regla)" };
  const best = matches.reduce((a, b) => (b.pattern.length > a.pattern.length || (b.pattern.length === a.pattern.length && b.allow && !a.allow) ? b : a));
  return { allowed: best.allow, rule: `${best.allow ? "Allow" : "Disallow"}: ${best.pattern}` };
}
