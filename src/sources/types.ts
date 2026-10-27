import type { DateRange } from "@/lib/dates";
import type { SourceId } from "./contract";

export interface MetricRow {
  source: SourceId;
  metric: string;
  dimKey: string;
  date: string;
  value: number;
  meta?: Record<string, unknown>;
}

export interface Source {
  id: SourceId | "mock";
  label: string;
  /** true cuando sus credenciales están en el entorno */
  isConfigured(): boolean;
  fetchDaily(range: DateRange): Promise<MetricRow[]>;
}
