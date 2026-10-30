import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_CHARS, toApiHistory } from "./chat-history";

test("quita las fallas de la pantalla y las respuestas vacías", () => {
  const out = toApiHistory([
    { role: "user", content: "hola" },
    { role: "assistant", content: "No se pudo conectar con el asistente.", error: true },
    { role: "user", content: "otra vez" },
    { role: "assistant", content: "" },
    { role: "user", content: "¿y ahora?" },
  ]);
  assert.deepEqual(out, [{ role: "user", content: "hola\n\notra vez\n\n¿y ahora?" }]);
});

test("una respuesta que solo trajo propuestas se conserva como texto", () => {
  const out = toApiHistory([
    { role: "user", content: "agrega a X" },
    { role: "assistant", content: "", proposals: [{ summary: "Agregar a la competencia: X" }] },
    { role: "user", content: "listo" },
  ]);
  assert.equal(out[1].content, "(Propuse: Agregar a la competencia: X)");
  assert.equal(out.length, 3);
});

test("recorta los mensajes larguísimos y empieza siempre por la persona", () => {
  const out = toApiHistory([
    { role: "assistant", content: "bienvenida" },
    { role: "user", content: "x".repeat(MAX_CHARS + 500) },
  ]);
  assert.equal(out[0].role, "user");
  assert.equal(out[0].content.length, MAX_CHARS);
});

test("se queda con los últimos 40 turnos sin empezar en una respuesta", () => {
  const msgs = Array.from({ length: 90 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", content: `m${i}` }));
  const out = toApiHistory(msgs);
  assert.ok(out.length <= 40);
  assert.equal(out[0].role, "user");
  assert.equal(out.at(-1)!.content, "m89");
});
