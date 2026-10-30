/** El CRM y, encima, el pop-up de un prospecto cuando se abre desde la lista (slot @modal). */
export default function CrmLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  return <>{children}{modal}</>;
}
