/** Copia texto; devuelve false si el navegador no deja (sin permiso o sin https). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
