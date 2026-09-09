// 99 — MANIFEST + PUBLISH
// - Simplifies large polygon layers for the web (keeps originals in data/processed)
// - Copies all layers to public/data/
// - Writes src/lib/data/manifest.json describing every layer + attribution

import { join } from "node:path";
import { copyFileSync } from "node:fs";
import mapshaper from "mapshaper";
import { PROCESSED, PUBLIC_DATA, readJSON, writeJSON, log } from "./lib.mjs";

async function simplify(name, pct) {
  const src = readJSON(join(PROCESSED, `${name}.geojson`));
  const res = await mapshaper.applyCommands(
    `-i in.geojson -simplify ${pct}% keep-shapes -clean -o out.geojson format=geojson`,
    { "in.geojson": JSON.stringify(src) }
  );
  const out = JSON.parse(res["out.geojson"]);
  // mapshaper drops to GeometryCollection when features have no props; guard
  if (out.type === "FeatureCollection") {
    writeJSON(join(PUBLIC_DATA, `${name}.geojson`), out);
    return out.features.length;
  }
  copyFileSync(join(PROCESSED, `${name}.geojson`), join(PUBLIC_DATA, `${name}.geojson`));
  return src.features.length;
}

const LAYERS = [
  { name: "constituency", simplify: 20 },
  { name: "local_bodies", simplify: 18 },
  { name: "wards", simplify: 15 },
  { name: "roads", simplify: null },
  { name: "railway", simplify: null },
  { name: "bridges", simplify: null },
  { name: "places", simplify: null },
];

const manifest = {
  generated: new Date().toISOString(),
  constituency: readJSON(join(PROCESSED, "constituency.geojson")).features[0].properties,
  layers: [],
  attribution: [
    "Ward & boundary geometry: Delimitation Commission, Kerala — 2024 ward delimitation (wardmap.ksmart.live)",
    "Roads, railway, seed POIs & bridges: © OpenStreetMap contributors (ODbL)",
    "Local-body reference IDs: opendatakerala/lsg-kerala-data (ODbL)",
  ],
};

for (const layer of LAYERS) {
  let count;
  if (layer.simplify) {
    count = await simplify(layer.name, layer.simplify);
    log(`${layer.name}: simplified ${layer.simplify}% -> public/data/${layer.name}.geojson (${count} features)`);
  } else {
    copyFileSync(join(PROCESSED, `${layer.name}.geojson`), join(PUBLIC_DATA, `${layer.name}.geojson`));
    count = readJSON(join(PROCESSED, `${layer.name}.geojson`)).features.length;
    log(`${layer.name}: copied -> public/data/${layer.name}.geojson (${count} features)`);
  }
  let meta = {};
  try { meta = readJSON(join(PROCESSED, `${layer.name}.geojson.meta.json`)); } catch { /* none */ }
  manifest.layers.push({ name: layer.name, features: count, ...meta });
}

writeJSON(join(PROCESSED, "..", "..", "src", "lib", "data", "manifest.json"), manifest, true);
log("wrote src/lib/data/manifest.json");
