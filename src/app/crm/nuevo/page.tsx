import Link from "next/link";
import { getViewer } from "@/auth";
import { pageGate } from "@/lib/page-gate";
import { listLeads } from "@/lib/crm/store";
import { LeadForm } from "@/components/crm/LeadForm";
import { Card } from "@/components/dash/Funnel";

export const dynamic = "force-dynamic";

export default async function NuevoProspectoPage() {
  const gate = await pageGate("Nuevo prospecto");
  if (gate) return gate;
  const viewer = (await getViewer())!;
  const owners = [...new Set((await listLeads()).map((r) => r.lead.owner).filter((o): o is string => Boolean(o)))];
  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/crm" className="font-mono text-[11px] uppercase text-muted-foreground hover:text-foreground">← CRM</Link>
      <h1 className="font-display text-4xl">Nuevo prospecto</h1>
      <Card id="form" title="Datos del prospecto"><LeadForm owners={owners} me={viewer.name} /></Card>
    </div>
  );
}
