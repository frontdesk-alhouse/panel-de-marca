/**
 * Igualdad con la instancia original: con la configuración de su dueño cargada, el
 * panel debe generar exactamente lo mismo que cuando todo estaba escrito en el código.
 * Usa private/ (no está en el repo): sin esos archivos la prueba se salta.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { buildSystem } from "@/lib/assistant/context";
import { buildStrategyPrompt } from "@/lib/assistant/strategy";
import { buildPlatformGroups, platformsForPrompt } from "@/lib/platforms/links";
import { brandTerms, competitors, keyPaths, ownTargets, siteOrigin, targetQueries } from "@/lib/scorecard/config";
import { autocompleteParams, ideaFilters } from "@/lib/ideas/collect";
import { countryName, localIntentPattern, searchRegion, servicePagePattern, serviceTitlePattern } from "./patterns";
import { WorkspaceSchema } from "./schema";
import { setWorkspace } from "./store";

const WS_FILE = "private/workspace.json";
const SNAP_FILE = "private/snapshots/owner.json";
const skip = !existsSync(WS_FILE) || !existsSync(SNAP_FILE) ? "sin private/ (solo corre en la instancia del dueño)" : false;

const load = () => {
  const { workspace, competitors: list } = JSON.parse(readFileSync(WS_FILE, "utf8"));
  const snap = JSON.parse(readFileSync(SNAP_FILE, "utf8"));
  const w = WorkspaceSchema.parse(workspace);
  setWorkspace(w, list);
  return { w, snap };
};
const json = (x: unknown) => JSON.parse(JSON.stringify(x));

test("instrucciones del analista idénticas", { skip }, () => {
  const { w, snap } = load();
  assert.equal(buildSystem(w, competitors()), snap.assistantSystem);
});

test("pedido de estrategia idéntico (con y sin presupuesto)", { skip }, () => {
  const { w, snap } = load();
  const data = [["resumen", "datos de prueba"], ["seo", "otra cosa"]] as const;
  assert.equal(buildStrategyPrompt(w, { budgetMxn: 12500, notes: "  Prioridad: médicos  " }, data, "{\"titular\":\"x\"}"), snap.strategyPrompt.full);
  assert.equal(buildStrategyPrompt(w, {}, data, null), snap.strategyPrompt.empty);
});

test("links de plataformas idénticos", { skip }, () => {
  const { w, snap } = load();
  const groups = buildPlatformGroups(w);
  // La única diferencia aceptada: la llave del editor del sitio ya no dice «framer».
  const renamed = json(groups).map((g: { items: { key: string }[] }) => ({ ...g, items: g.items.map((p) => (p.key === "site_editor" ? { ...p, key: "framer" } : p)) }));
  assert.deepEqual(renamed, snap.platformGroups);
  assert.equal(platformsForPrompt(groups), snap.platformsForPrompt);
});

test("competencia, búsquedas y objetivos idénticos", { skip }, () => {
  const { snap } = load();
  assert.deepEqual(json(competitors()), snap.competitors);
  assert.deepEqual(targetQueries(), snap.targetQueries);
  assert.deepEqual(json(ownTargets()), snap.ownTargets);
  assert.deepEqual(brandTerms(), snap.brandTerms);
  assert.equal(siteOrigin(), snap.siteOrigin);
  assert.deepEqual(keyPaths(), snap.keyPaths);
});

test("descripciones de las herramientas del chat idénticas", { skip }, async () => {
  const { snap } = load();
  const { assistantTools } = await import("@/lib/assistant/tools");
  const tools = assistantTools() as unknown as { name: string; description: string }[];
  assert.deepEqual(tools.map((t) => ({ name: t.name, description: t.description })), snap.toolDescriptions);
});

test("ideas: mismos temas, búsquedas de Reddit, filtros y país del autocompletado", { skip }, () => {
  const { w, snap } = load();
  const f = ideaFilters(w.content);
  assert.equal(f.relevant?.source, snap.ideas.relevantSource);
  assert.equal(f.exclude?.source, snap.ideas.foreignSource);
  assert.deepEqual(w.content.topics, snap.ideas.topics);
  assert.deepEqual(json(w.content.redditSearches), snap.ideas.redditSearches);
  assert.equal(autocompleteParams(w.locale.locale), snap.ideas.autocompleteParams);
});

test("intención local, señales de servicio y país de búsqueda idénticos", { skip }, () => {
  const { w, snap } = load();
  assert.equal(localIntentPattern(w).source, snap.ideas.localSource);
  assert.equal(serviceTitlePattern(w)?.source, snap.ideas.serviceTitleSource);
  assert.equal(servicePagePattern(w)?.source, snap.ideas.servicePageSource);
  const r = searchRegion(w.locale.locale);
  assert.deepEqual({ countryCode: r.country, languageCode: r.language }, snap.ideas.serp);
  assert.equal(r.language, snap.ideas.mapsLanguage);
  assert.equal(countryName(w.locale.locale), snap.ideas.countryName);
});

test("guardar la ficha desde Ajustes deja la configuración idéntica", { skip }, async () => {
  const { w } = load();
  const { formToWorkspace, workspaceToForm } = await import("@/lib/briefing/brand-form");
  const again = formToWorkspace(workspaceToForm(w), w);
  assert.deepEqual(json(again.content), json(w.content));
  assert.deepEqual(json(again.brand), json(w.brand));
  assert.deepEqual(json(again.assistant), json(w.assistant));
  assert.deepEqual(json(again.packages), json(w.packages));
});
