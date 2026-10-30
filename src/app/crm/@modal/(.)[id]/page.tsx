import { LeadDetail } from "@/components/crm/LeadDetail";
import { LeadModal } from "@/components/crm/LeadModal";

/** Prospecto abierto desde la lista: el mismo detalle, en un pop-up sobre el CRM. */
export default async function LeadModalPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const detail = await LeadDetail({ id, inModal: true }).catch((e) => { console.error("[crm] pop-up", e); return null; });
  if (!detail) return null;
  return <LeadModal title="Prospecto">{detail}</LeadModal>;
}
