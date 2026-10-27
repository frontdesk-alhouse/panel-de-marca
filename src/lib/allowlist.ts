/** Lista blanca de correos desde ALLOWED_EMAILS (separados por coma). */
export function parseAllowlist(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | null | undefined, allowlist: string[]): boolean {
  if (!email) return false;
  return allowlist.includes(email.trim().toLowerCase());
}
