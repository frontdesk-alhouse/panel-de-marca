/** Comparación de versiones semver simples (x.y.z), sin prerelease: es lo que usa el panel. */
export function parseVersion(v: unknown): [number, number, number] | null {
  if (typeof v !== "string") return null;
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v.trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** true si `latest` es mayor que `current`. Versiones ilegibles nunca cuentan como nuevas. */
export function isNewer(latest: unknown, current: unknown): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

/** El clon local es del repo público si su remoto apunta a él (https o ssh). */
export function isPublicRepoRemote(remote: string, repoUrl: string): boolean {
  const slug = repoUrl.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "").toLowerCase();
  const r = remote.trim().toLowerCase().replace(/\.git$/, "");
  return r === `https://github.com/${slug}` || r === `git@github.com:${slug}` || r === `ssh://git@github.com/${slug}`;
}
