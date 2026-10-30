import { notFound } from "next/navigation";
import { pageGate, LoadError } from "@/lib/page-gate";
import { LeadDetail } from "@/components/crm/LeadDetail";

export const dynamic = "force-dynamic";

/** Página directa de un prospecto (desde la lista se abre en un pop-up; ver @modal). */
export default async function ProspectoPage({ params }: { params: Promise<{ id: string }> }) {
  const gate = await pageGate("Prospecto");
  if (gate) return gate;
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  let detail;
  try { detail = await LeadDetail({ id }); } catch (e) { console.error("[crm]", e); return <LoadError title="Prospecto" />; }
  if (!detail) notFound();
  return detail;
}
