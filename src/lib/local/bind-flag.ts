/**
 * Marcas compartidas en el proceso (el proxy las lee sin cargar módulos de red):
 * - si ya se comprobó que el panel solo escucha en esta computadora;
 * - un identificador al azar que el proxy pone en cada respuesta, para que la
 *   comprobación distinga a este panel de otro programa en el mismo puerto.
 */
const READY = Symbol.for("panel-de-marca.bind-ok");
const ID = Symbol.for("panel-de-marca.instance-id");
type GlobalWithFlags = typeof globalThis & { [READY]?: boolean; [ID]?: string };
const g = globalThis as GlobalWithFlags;

export const INSTANCE_HEADER = "x-panel-instance";

export const isBindVerified = (): boolean => g[READY] === true;

export function markBindVerified(): void {
  g[READY] = true;
}

export function instanceId(): string {
  g[ID] ??= crypto.randomUUID();
  return g[ID];
}
