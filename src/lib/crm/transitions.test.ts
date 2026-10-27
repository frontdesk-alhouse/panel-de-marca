import "@/lib/workspace/test-setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveFromStage, isOverdue } from "./transitions";
import { leadInput, money } from "./validation";

const now = new Date("2026-10-24T12:00:00Z");

test("cerrar marca ganado, fecha de cierre y de propuesta si faltaba", () => {
  const r = deriveFromStage("cerrado", { proposalAt: null, closedAt: null }, now);
  assert.equal(r.outcome, "ganado");
  assert.equal(r.closedAt, now);
  assert.equal(r.proposalAt, now);
});

test("reabrir un prospecto borra el cierre", () => {
  const r = deriveFromStage("calificado", { proposalAt: null, closedAt: now }, now);
  assert.equal(r.closedAt, null);
  assert.equal(r.outcome, null);
});

test("siguiente paso vencido solo si sigue abierto", () => {
  assert.equal(isOverdue("2026-10-20", "propuesta", "2026-10-24"), true);
  assert.equal(isOverdue("2026-10-20", "cerrado", "2026-10-24"), false);
  assert.equal(isOverdue(null, "nuevo", "2026-10-24"), false);
});

test("el prospecto necesita empresa o contacto y valida el correo", () => {
  assert.equal(leadInput.safeParse({ channel: "otro", stage: "nuevo" }).success, false);
  assert.equal(leadInput.safeParse({ company: "Clínica X", channel: "otro", stage: "nuevo", email: "no-es-correo" }).success, false);
  const ok = leadInput.safeParse({ company: "Clínica X", channel: "ads", stage: "nuevo", email: "", value: "45000" });
  assert.equal(ok.success, true);
  assert.equal(ok.success && ok.data.value, 45000);
});

test("el valor acepta comas, signo de pesos y espacios; texto raro da error", () => {
  assert.equal(money.parse("48,000"), 48000);
  assert.equal(money.parse("$48,000.50"), 48000.5);
  assert.equal(money.parse("48 000"), 48000);
  assert.equal(money.parse(""), null);
  assert.equal(money.safeParse("cuarenta mil").success, false);
});

test("los servicios contratados llegan como lista y «No nutrir» como sí/no", () => {
  const r = leadInput.safeParse({ company: "X", channel: "otro", stage: "cerrado", services: ["Sitio web", "Branding e identidad"], doNotNurture: "on" });
  assert.equal(r.success, true);
  assert.deepEqual(r.success && r.data.services, ["Sitio web", "Branding e identidad"]);
  assert.equal(r.success && r.data.doNotNurture, true);
});

test("un servicio que no está en la configuración no se acepta", () => {
  const r = leadInput.safeParse({ company: "X", channel: "otro", stage: "nuevo", services: ["Servicio inventado"] });
  assert.equal(r.success, false);
});
