import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";

/**
 * Tipografías abiertas (SIL Open Font License) del panel público: Bricolage Grotesque
 * para titulares y cifras (tiene carácter en tamaños grandes), Instrument Sans para texto.
 * Para usar las de tu marca, pon sus archivos en src/app/fonts/brand/ con un index.ts
 * que exporte displayFont y bodyFont con estas mismas variables.
 */
export const displayFont = Bricolage_Grotesque({ variable: "--font-display-face", weight: ["700"], subsets: ["latin"], display: "swap" });
export const bodyFont = Instrument_Sans({ variable: "--font-body-face", weight: ["400", "700"], subsets: ["latin"], display: "swap" });
