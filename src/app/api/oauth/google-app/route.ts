/**
 * La app de Google «Alto Dashboard» para las copias del repo público: les da el ID y el
 * secreto del cliente OAuth de escritorio, que Google no trata como confidencial en apps
 * de escritorio. Solo lo sirve la instancia que tiene las variables configuradas.
 */
export async function GET() {
  const clientId = process.env.PANEL_DESKTOP_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.PANEL_DESKTOP_GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return Response.json({ error: "No disponible" }, { status: 404 });
  return Response.json(
    { client_id: clientId, client_secret: clientSecret },
    { headers: { "cache-control": "public, max-age=3600" } },
  );
}
