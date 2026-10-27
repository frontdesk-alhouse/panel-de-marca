/** Nombres de canal de GA4 en español. */
export const CHANNEL_LABELS: Record<string, string> = {
  "Paid Search": "Google Ads (búsqueda)",
  "Direct": "Directo",
  "Organic Search": "Google orgánico",
  "Organic Social": "Redes (orgánico)",
  "Referral": "Otros sitios",
  "Paid Social": "Redes (pagado)",
  "Cross-network": "Google Ads (otras redes)",
  "Unassigned": "Sin asignar",
  "Display": "Display",
  "Organic Video": "Video orgánico",
  "Email": "Correo",
};

export const label = (key: string) => CHANNEL_LABELS[key] ?? key;
