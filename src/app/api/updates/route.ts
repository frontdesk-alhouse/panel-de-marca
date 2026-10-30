import { isViewerRequest, unauthorized } from "@/lib/api-auth";
import { applyUpdate, updateStatus } from "@/lib/updates/check";

// git pull + npm install pueden tardar.
export const maxDuration = 300;

/** ¿Hay una versión nueva del panel en el repo público? */
export async function GET(req: Request) {
  if (!(await isViewerRequest(req))) return unauthorized();
  return Response.json(await updateStatus());
}

/** Actualiza este panel (solo local, clon limpio del repo público). */
export async function POST(req: Request) {
  if (!(await isViewerRequest(req))) return unauthorized();
  const result = await applyUpdate();
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
