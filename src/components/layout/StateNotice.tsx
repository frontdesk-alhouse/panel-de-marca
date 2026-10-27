import type { DashboardState } from "@/lib/dashboard";
import { Notice } from "./Notice";

/** Explica por qué no hay panel todavía; null si hay datos. */
export function StateNotice({ state }: { state: DashboardState }) {
  if (state.kind === "no_session") {
    return <Notice><p>Inicia sesión para ver el panel.</p></Notice>;
  }
  if (state.kind === "no_db") {
    return (
      <Notice>
        <p className="font-medium">Falta conectar la base de datos.</p>
        <p className="text-muted-foreground">Agrega DATABASE_URL (Neon) en el entorno y aplica el esquema con npm run db:push.</p>
      </Notice>
    );
  }
  if (state.kind === "error") {
    return <Notice><p>{state.message}</p></Notice>;
  }
  if (!state.data.firstDate) {
    return (
      <Notice>
        <p className="font-medium">Aún no hay datos.</p>
        <p className="text-muted-foreground">
          Cada fuente se conecta en su fase. Para ver el panel con datos de prueba: npm run sync -- mock --days 90.
        </p>
      </Notice>
    );
  }
  return null;
}

export function MockNotice() {
  return (
    <Notice>
      <p className="font-medium">Estás viendo datos de prueba.</p>
      <p className="text-muted-foreground">Bórralos antes de conectar fuentes reales: npm run sync -- mock --clear.</p>
    </Notice>
  );
}
