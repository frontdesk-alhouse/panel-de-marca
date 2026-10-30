import { competitorsSource } from "./competitors";
import { claritySource } from "./clarity";
import { ga4Source } from "./ga4";
import { gadsSource } from "./gads";
import { ideasSource } from "./ideas";
import { gscSource } from "./gsc";
import { mockSource } from "./mock";
import { psiSource } from "./psi";
import { serpSource } from "./serp";
import { linksSource } from "./links";
import { mapsSource } from "./maps";
import { igCompSource } from "./igcomp";
import { metaSource } from "./meta";
import { instagramSource } from "./instagram";
import { geoSource } from "./geo";
import type { Source } from "./types";

/** Fuentes registradas; cada fase agrega las suyas. */
export const SOURCES: Record<string, Source> = {
  ga4: ga4Source,
  gsc: gscSource,
  gads: gadsSource,
  psi: psiSource,
  clarity: claritySource,
  comp: competitorsSource,
  serp: serpSource,
  links: linksSource,
  maps: mapsSource,
  igcomp: igCompSource,
  meta: metaSource,
  instagram: instagramSource,
  ideas: ideasSource,
  geo: geoSource,
  mock: mockSource,
};

export function getSource(id: string): Source | undefined {
  return Object.hasOwn(SOURCES, id) ? SOURCES[id] : undefined;
}
