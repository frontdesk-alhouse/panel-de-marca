import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Neutraliza inyección de fórmulas Excel/CSV: si un valor de texto libre
 * empieza con =, +, -, @ (o tab/CR), Excel/Sheets lo interpreta como
 * fórmula al abrir el archivo exportado. Anteponer un apóstrofe fuerza
 * texto literal sin cambiar el valor visible.
 */
export function sanitizeSpreadsheetCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
