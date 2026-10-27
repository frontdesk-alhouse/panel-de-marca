import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isDue, JOBS, RETRY_AFTER_MS, STALE_RUNNING_MS, weekStart, type Job, type JobState } from "./schedule";
import { SOURCES } from "@/sources/registry";

const TZ = "America/Mexico_City";
const daily = JOBS.find((j) => j.id === "ga4") as Job;
const weekly = JOBS.find((j) => j.id === "analysis") as Job;
const never: JobState = { lastOkAt: null, lastAttemptAt: null, lastAttemptStatus: null };
const okAt = (iso: string): JobState => ({ lastOkAt: new Date(iso), lastAttemptAt: new Date(iso), lastAttemptStatus: "ok" });

test("el calendario local es el mismo que el de Vercel", () => {
  const crons: { path: string; schedule: string }[] = JSON.parse(readFileSync("vercel.json", "utf8")).crons;
  assert.deepEqual(JOBS.map((j) => j.cronPath).sort(), crons.map((c) => c.path).sort());
  for (const c of crons) {
    const job = JOBS.find((j) => j.cronPath === c.path) as Job;
    const weekday = c.schedule.split(" ")[4];
    assert.equal(job.cadence, weekday === "*" ? "daily" : "weekly", c.path);
  }
});

test("cada fuente del calendario existe y ninguna fuente real se queda fuera", () => {
  const synced = JOBS.filter((j) => j.kind === "sync").map((j) => j.id).sort();
  assert.deepEqual(synced, Object.keys(SOURCES).filter((id) => id !== "mock").sort());
});

test("primero las fuentes, luego la calificación y al final el análisis", () => {
  const kinds = JOBS.map((j) => j.kind);
  assert.equal(kinds.lastIndexOf("sync") < kinds.indexOf("scores"), true);
  assert.equal(kinds.at(-1), "analysis");
});

test("nunca corrida: le toca", () => {
  assert.equal(isDue(daily, never, new Date("2026-10-27T15:00:00Z"), TZ), true);
});

test("diaria: corrió hoy no le toca; corrió ayer sí (también tras días con la compu apagada)", () => {
  const now = new Date("2026-10-27T15:00:00Z"); // 9:00 en CDMX
  assert.equal(isDue(daily, okAt("2026-10-27T14:00:00Z"), now, TZ), false);
  assert.equal(isDue(daily, okAt("2026-10-26T20:00:00Z"), now, TZ), true);
  assert.equal(isDue(daily, okAt("2026-10-20T20:00:00Z"), now, TZ), true);
});

test("el día se cuenta en la zona de la marca, no en UTC", () => {
  // 23:30 del 26 en CDMX = 05:30 UTC del 27: sigue siendo el mismo día local
  assert.equal(isDue(daily, okAt("2026-10-26T16:00:00Z"), new Date("2026-10-27T05:30:00Z"), TZ), false);
});

test("semanal: una vez por semana desde el lunes", () => {
  assert.equal(weekStart("2026-10-27"), "2026-10-26"); // martes → lunes
  assert.equal(weekStart("2026-10-26"), "2026-10-26");
  assert.equal(weekStart("2026-11-01"), "2026-10-26"); // domingo → lunes anterior
  const now = new Date("2026-10-28T18:00:00Z");
  assert.equal(isDue(weekly, okAt("2026-10-26T20:00:00Z"), now, TZ), false);
  assert.equal(isDue(weekly, okAt("2026-10-23T20:00:00Z"), now, TZ), true);
});

test("tras un error espera antes de reintentar; si sigue corriendo no la duplica", () => {
  const now = new Date("2026-10-27T15:00:00Z");
  const failed = (msAgo: number): JobState => ({ lastOkAt: new Date("2026-10-26T15:00:00Z"), lastAttemptAt: new Date(now.getTime() - msAgo), lastAttemptStatus: "error" });
  assert.equal(isDue(daily, failed(10 * 60_000), now, TZ), false);
  assert.equal(isDue(daily, failed(RETRY_AFTER_MS + 1), now, TZ), true);
  assert.equal(isDue(daily, { ...never, lastAttemptAt: now, lastAttemptStatus: "running" }, now, TZ), false);
});

test("una corrida que quedó «en curso» porque la compu se apagó no bloquea para siempre", () => {
  const now = new Date("2026-10-27T15:00:00Z");
  const stuck: JobState = { lastOkAt: new Date("2026-10-25T15:00:00Z"), lastAttemptAt: new Date(now.getTime() - STALE_RUNNING_MS - 1), lastAttemptStatus: "running" };
  assert.equal(isDue(daily, stuck, now, TZ), true);
});
