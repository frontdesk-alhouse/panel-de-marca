import "server-only";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import pkg from "../../../package.json";
import { isLocalMode } from "@/lib/mode";
import { PUBLIC_REPO_URL } from "@/lib/skills/catalog";
import { isNewer, isPublicRepoRemote } from "./version";

const run = promisify(execFile);

/** package.json del repo público (rama main): de ahí sale la última versión. */
const LATEST_URL = `${PUBLIC_REPO_URL.replace("https://github.com/", "https://raw.githubusercontent.com/")}/main/package.json`;
/** Se pregunta a GitHub como mucho cada 6 h; el panel puede abrirse muchas veces al día. */
const REVALIDATE_SECONDS = 6 * 60 * 60;

export interface UpdateStatus {
  current: string;
  latest: string | null;
  hasUpdate: boolean;
  /** Este panel puede actualizarse solo (local, clon limpio del repo público). */
  canSelfUpdate: boolean;
  /** Por qué no puede actualizarse solo, para mostrar el camino manual. */
  reason: "cloud" | "not-public-clone" | "dirty" | null;
  changesUrl: string;
}

async function git(args: string[]): Promise<string> {
  const { stdout } = await run("git", args, { cwd: process.cwd(), timeout: 15_000 });
  return stdout.trim();
}

async function latestVersion(): Promise<string | null> {
  try {
    const res = await fetch(LATEST_URL, { next: { revalidate: REVALIDATE_SECONDS }, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const v = (data as { version?: unknown }).version;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}

async function selfUpdateBlocker(): Promise<UpdateStatus["reason"]> {
  if (!isLocalMode()) return "cloud";
  try {
    if (!isPublicRepoRemote(await git(["remote", "get-url", "origin"]), PUBLIC_REPO_URL)) return "not-public-clone";
    // Cambios propios sin guardar: un pull podría chocar con ellos.
    if (await git(["status", "--porcelain", "--untracked-files=no"])) return "dirty";
    return null;
  } catch {
    return "not-public-clone";
  }
}

export async function updateStatus(): Promise<UpdateStatus> {
  const [latest, reason] = await Promise.all([latestVersion(), selfUpdateBlocker()]);
  return {
    current: pkg.version,
    latest,
    hasUpdate: isNewer(latest, pkg.version),
    canSelfUpdate: reason === null,
    reason,
    changesUrl: `${PUBLIC_REPO_URL}/commits/main`,
  };
}

/**
 * Trae la versión nueva al clon local: solo avance rápido (nunca mezcla ni pisa cambios) y
 * reinstala dependencias. Comandos fijos; nada viene del pedido.
 */
export async function applyUpdate(): Promise<{ ok: true; version: string } | { ok: false; error: string }> {
  const reason = await selfUpdateBlocker();
  if (reason) return { ok: false, error: reason };
  try {
    await run("git", ["pull", "--ff-only", "origin", "main"], { cwd: process.cwd(), timeout: 120_000 });
    await run("npm", ["install", "--no-audit", "--no-fund"], { cwd: process.cwd(), timeout: 300_000 });
    const { stdout } = await run("node", ["-p", "require('./package.json').version"], { cwd: process.cwd(), timeout: 10_000 });
    return { ok: true, version: stdout.trim() };
  } catch (err) {
    console.error("[updates:apply]", err);
    return { ok: false, error: "failed" };
  }
}
