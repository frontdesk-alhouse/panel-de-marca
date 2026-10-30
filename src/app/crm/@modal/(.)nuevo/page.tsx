import { getViewer } from "@/auth";
import { listLeads } from "@/lib/crm/store";
import { LeadForm } from "@/components/crm/LeadForm";
import { LeadModal } from "@/components/crm/LeadModal";

/** «Nuevo prospecto» desde la lista: el formulario en un pop-up. */
export default async function NewLeadModalPage() {
  const viewer = await getViewer();
  if (!viewer) return null;
  const owners = [...new Set((await listLeads()).map((r) => r.lead.owner).filter((o): o is string => Boolean(o)))];
  return (
    <LeadModal title="Nuevo prospecto">
      <div className="space-y-6">
        <h2 className="pr-8 font-display text-3xl">Nuevo prospecto</h2>
        <LeadForm owners={owners} me={viewer.name} />
      </div>
    </LeadModal>
  );
}
