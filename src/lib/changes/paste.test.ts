import { test } from "node:test";
import assert from "node:assert/strict";
import { parseChangeBlock } from "./paste";

test("lee el bloque que devuelve la IA, con texto alrededor", () => {
  const reply = `Listo, terminé.

\`\`\`panel-cambios
- 2026-10-28 | propio | Conversión | Formulario de 3 campos publicado | https://sitio.example/contacto
- 2026-10-29 | externo | seo | Google anunció un core update
* sin fecha | propio | ads | Negativas agregadas a la campaña de marca
\`\`\`
Cualquier duda me dices.`;
  const r = parseChangeBlock(reply, "2026-10-29");
  assert.equal(r.changes.length, 3);
  assert.deepEqual(r.changes[0], { date: "2026-10-28", kind: "propio", area: "conversion", title: "Formulario de 3 campos publicado", detail: null, url: "https://sitio.example/contacto" });
  assert.equal(r.changes[1].kind, "externo");
  assert.equal(r.changes[1].area, "visibilidad");
  assert.equal(r.changes[2].date, "2026-10-29");
  assert.equal(r.changes[2].area, "inversion");
});

test("fechas futuras se ajustan, enlaces no http se ignoran y lo ilegible se reporta", () => {
  const r = parseChangeBlock("- 2027-01-01 | propio | general | Algo | javascript:alert(1)\n- x | y | z | ab", "2026-10-29");
  assert.equal(r.changes[0].date, "2026-10-29");
  assert.equal(r.changes[0].url, null);
  assert.equal(r.changes.length, 1);
  assert.equal(r.problems.length, 2);
});
