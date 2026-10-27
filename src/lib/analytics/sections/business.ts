import { addDays, todayIso } from "@/lib/dates";
import { listLeads } from "@/lib/crm/store";
import { computeBusiness, WINDOW_DAYS, type Business } from "@/lib/crm/business";
import { totals } from "../query";

/** Negocio: CRM + inversión en anuncios (Google Ads y Meta) de los mismos 90 días. */
export async function loadBusiness(): Promise<Business & { paidMxn: number; totalLeads: number }> {
  const to = addDays(todayIso(), -1);
  const range = { from: addDays(to, -(WINDOW_DAYS - 1)), to };
  const [rows, gads, meta] = await Promise.all([
    listLeads(), totals("gads", ["cost_mxn"], range), totals("meta", ["spend_mxn"], range),
  ]);
  const paidMxn = (gads.cost_mxn ?? 0) + (meta.spend_mxn ?? 0);
  return { ...computeBusiness(rows.map((r) => r.lead), { paidMxn }), paidMxn, totalLeads: rows.length };
}
