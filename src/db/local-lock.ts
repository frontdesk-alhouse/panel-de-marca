import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

/**
 * PGlite solo admite un proceso a la vez sobre la misma carpeta: si el panel está
 * abierto y alguien corre `npm run sync`, los dos escribirían encima y la base se daña.
 * Un archivo con el pid del dueño lo evita; un pid muerto (cierre abrupto) se ignora.
 * Dentro de un mismo proceso no protege: para eso la conexión vive en globalThis.
 */
export class DatabaseBusyError extends Error {
  constructor(public readonly pid: number) {
    super(`La base local está abierta por otro proceso (pid ${pid}). Cierra el panel o usa el botón «Actualizar ahora» dentro de la app.`);
    this.name = "DatabaseBusyError";
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: existe pero es de otro usuario; cuenta como vivo.
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readOwner(lockPath: string): number {
  try {
    return Number(readFileSync(lockPath, "utf8").trim());
  } catch {
    return NaN;
  }
}

/** Crea el candado de forma atómica (flag wx): dos procesos que arrancan juntos no pueden ganar los dos. */
function tryCreate(lockPath: string): boolean {
  try {
    writeFileSync(lockPath, String(process.pid), { mode: 0o600, flag: "wx" });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
    throw err;
  }
}

export function acquireDbLock(dataDir: string): void {
  mkdirSync(dataDir, { recursive: true });
  const lockPath = `${dataDir}.lock`;
  if (!tryCreate(lockPath)) {
    const owner = readOwner(lockPath);
    if (owner === process.pid) return;
    if (Number.isInteger(owner) && isAlive(owner)) throw new DatabaseBusyError(owner);
    // Candado de un proceso que ya murió: se quita y se vuelve a pelear de forma atómica.
    rmSync(lockPath, { force: true });
    if (!tryCreate(lockPath)) throw new DatabaseBusyError(readOwner(lockPath));
  }
  process.once("exit", () => {
    if (readOwner(lockPath) === process.pid) rmSync(lockPath, { force: true });
  });
}
