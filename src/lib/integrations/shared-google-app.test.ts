import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSharedApp } from "./shared-google-app";

// Valores ficticios armados en partes: así los escáneres de secretos no los confunden con llaves reales.
const id = ["123456789012", "-", "fakefakefakefakefakefakefake0000", ".apps.googleusercontent.com"].join("");
const secret = ["GOCSPX", "-", "fakefakefakefakefakefake0000"].join("");

test("lee el JSON de Google Cloud (installed y web) y el de la nube", () => {
  assert.deepEqual(parseSharedApp({ installed: { client_id: id, client_secret: secret, project_id: "x" } }), { client_id: id, client_secret: secret });
  assert.deepEqual(parseSharedApp({ web: { client_id: id, client_secret: secret } }), { client_id: id, client_secret: secret });
  assert.deepEqual(parseSharedApp({ client_id: id, client_secret: secret }), { client_id: id, client_secret: secret });
});

test("rechaza lo que no parece un cliente de Google", () => {
  assert.equal(parseSharedApp({ client_id: "evil.example.com", client_secret: secret }), null);
  assert.equal(parseSharedApp({ client_id: id, client_secret: "sk-otra-cosa" }), null);
  assert.equal(parseSharedApp(null), null);
  assert.equal(parseSharedApp("texto"), null);
});
