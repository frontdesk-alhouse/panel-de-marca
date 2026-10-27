/**
 * Lectura y escritura de archivos .env sin perder comentarios ni el orden.
 * Funciones puras: el archivo se lee y se escribe en secrets/index.ts.
 */
const KEY = /^[A-Z][A-Z0-9_]*$/;
const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

export function isValidKey(key: string): boolean {
  return KEY.test(key);
}

function unquote(raw: string): string {
  const v = raw.trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v.at(-1) === v[0]) {
    const inner = v.slice(1, -1);
    return v[0] === '"' ? inner.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\") : inner;
  }
  const hash = v.indexOf(" #");
  return hash === -1 ? v : v.slice(0, hash).trim();
}

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const m = LINE.exec(line);
    if (m && !line.trimStart().startsWith("#")) out[m[1]] = unquote(m[2]);
  }
  return out;
}

/**
 * Next lee .env.local con dotenv + dotenv-expand: un `$` se expandiría y las comillas
 * o barras invertidas se interpretan distinto. Las llaves reales (Google, Meta, Apify,
 * Anthropic, Clarity) solo usan estos caracteres; lo demás se rechaza con un error claro
 * en lugar de guardarse alterado en silencio.
 */
const SAFE_VALUE = /^[A-Za-z0-9_\-.:/+=@,~%|*!?#&]*$/;

export function isSafeValue(value: string): boolean {
  return SAFE_VALUE.test(value);
}

/** Entre comillas dobles para que `#` o `=` no se lean como comentario o separador. */
export function quote(value: string): string {
  if (!isSafeValue(value)) throw new Error("El valor tiene caracteres no permitidos (espacios, comillas, $ o \\). Revisa que se haya copiado completo.");
  return `"${value}"`;
}

/**
 * Devuelve el archivo con los cambios: reemplaza en su lugar las llaves que ya
 * existen, agrega las nuevas al final y borra las que llegan como null.
 */
export function mergeEnv(text: string, changes: Readonly<Record<string, string | null>>): string {
  for (const key of Object.keys(changes)) if (!isValidKey(key)) throw new Error(`Nombre de variable inválido: ${key}`);
  const pending = new Map(Object.entries(changes));
  const written = new Set<string>();
  const lines: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const m = LINE.exec(line);
    const key = m && !line.trimStart().startsWith("#") ? m[1] : null;
    if (key && Object.hasOwn(changes, key)) {
      // dotenv se queda con la última: se reescribe la primera y se quitan las repetidas.
      const value = changes[key];
      if (!written.has(key) && value !== null) lines.push(`${key}=${quote(value)}`);
      written.add(key);
      pending.delete(key);
      continue;
    }
    lines.push(line);
  }
  while (lines.length > 0 && lines.at(-1) === "") lines.pop();
  for (const [key, value] of pending) if (value !== null) lines.push(`${key}=${quote(value)}`);
  return `${lines.join("\n")}\n`;
}
