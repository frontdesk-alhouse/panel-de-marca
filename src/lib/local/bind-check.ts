import os from "node:os";
import { INSTANCE_HEADER, instanceId, markBindVerified } from "./bind-flag";

/**
 * El modo local no tiene login: solo es seguro si el servidor escucha en 127.0.0.1.
 * `next start` sin `-H 127.0.0.1` escucha en toda la red (cualquiera en el mismo
 * Wi-Fi entraría). Revisar el Host no basta contra una conexión directa, así que
 * se comprueba de verdad: si el panel se alcanza por una IP de red de esta
 * computadora, se apaga. Mientras no termina la comprobación, el proxy no atiende.
 */

function networkAddresses(): string[] {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i): i is os.NetworkInterfaceInfo => Boolean(i) && !(i as os.NetworkInterfaceInfo).internal)
    // fe80:: no se alcanza sin indicar la interfaz; si el panel escuchara en toda la red,
    // las demás direcciones lo delatan igual.
    .filter((i) => !i.address.toLowerCase().startsWith("fe80:"))
    .map((i) => i.address);
}

/**
 * ¿Este mismo panel responde en esa dirección? Se pregunta por HTTP y se compara el
 * identificador de la instancia: otro programa en el mismo puerto no cuenta.
 */
async function servesThisPanel(host: string, port: number): Promise<boolean> {
  const url = `http://${host.includes(":") ? `[${host}]` : host}:${port}/`;
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(1500) });
    await res.body?.cancel().catch(() => {});
    return res.headers.get(INSTANCE_HEADER) === instanceId();
  } catch {
    return false;
  }
}

async function waitForPort(): Promise<number | null> {
  for (let i = 0; i < 300; i++) {
    const port = Number(process.env.PORT);
    if (Number.isInteger(port) && port > 0) return port;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

export async function verifyLoopbackOnly(): Promise<void> {
  const port = await waitForPort();
  if (!port) {
    console.error("[local] no se pudo saber en qué puerto escucha el panel; por seguridad se apaga.");
    process.exit(1);
  }
  const addresses = networkAddresses();
  const results = await Promise.all(addresses.map((addr) => servesThisPanel(addr, port)));
  const exposed = addresses.filter((_, i) => results[i]).map((a) => (a.includes(":") ? `[${a}]:${port}` : `${a}:${port}`));
  if (exposed.length > 0) {
    console.error(
      `[local] El panel se puede abrir desde la red (${exposed.join(", ")}) y en modo local no tiene login.\n` +
        "        Ábrelo con `npm run start:local` (o `next start -H 127.0.0.1`). Se apaga por seguridad.",
    );
    process.exit(1);
  }
  markBindVerified();
}
