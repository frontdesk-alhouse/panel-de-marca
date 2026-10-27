import { test } from "node:test";
import assert from "node:assert/strict";
import { appendDated, ProposalSchema } from "./meeting-schema";

const base = {
  externalId: "abc", happenedAt: "2026-10-03T15:00:00Z", leadId: 3, confidence: "alta", matchReason: "Asistente coincide",
  summary: "Revisamos el sitio y la estrategia.",
};

test("acepta una propuesta mínima y llena listas vacías", () => {
  const p = ProposalSchema.parse(base);
  assert.deepEqual(p.objections, []);
});

test("solo acepta links de notas de Wispr", () => {
  assert.equal(ProposalSchema.safeParse({ ...base, shareLink: "https://notes.wisprflow.ai/shared/x" }).success, true);
  assert.equal(ProposalSchema.safeParse({ ...base, shareLink: "https://evil.example.com/x" }).success, false);
  assert.equal(ProposalSchema.safeParse({ ...base, shareLink: "javascript:alert(1)" }).success, false);
});

test("las notas se suman con fecha y no se repiten", () => {
  assert.equal(appendDated(null, "Juega pádel", "2026-10-03"), "2026-10-03: Juega pádel");
  assert.equal(appendDated("2026-10-03: Juega pádel", "Juega pádel", "2026-10-10"), "2026-10-03: Juega pádel");
  assert.equal(appendDated("Previo", "", "2026-10-10"), "Previo");
  assert.equal(appendDated("Previo", "Tiene dos hijos", "2026-10-10"), "Previo\n2026-10-10: Tiene dos hijos");
});
