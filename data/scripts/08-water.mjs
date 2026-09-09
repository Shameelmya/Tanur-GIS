// 08 — WATER BODIES
// Source: OpenStreetMap (Overpass). ODbL 1.0.
// Rivers, backwaters, ponds, canals and wetlands, clipped to the constituency.
// Output: data/processed/water.geojson

import { join } from "node:path";
import mapshaper from "mapshaper";
import {
  PROCESSED, BBOX, overpass, readJSON, writeJSON, fc, round6, titleCase, log, today,
} from "./lib.mjs";

const Q = `[out:json][timeout:180];
(
  way["natural"="water"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  relation["natural"="water"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  way["water"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  way["landuse"="reservoir"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  way["natural"="wetland"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  way["waterway"~"^(river|stream|canal|drain)$"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
);
out geom tags;`;

const osm = await overpass(Q, "water_bbox");

const polys = [];
const lines = [];
for (const el of osm.elements) {
  if (!el.geometry || el.geometry.length < 2) continue;
  const t = el.tags || {};
  const coords = el.geometry.map((p) => [p.lon, p.lat]);
  const name = t.name ? titleCase(t.name) : "";
  const base = {
    id: `osm-${el.type[0]}${el.id}`,
    osm_id: el.id,
    name: name || "",
    name_ml: t["name:ml"] || "",
    waterway: t.waterway || "",
    kind:
      t.waterway ? "waterway" :
      t.natural === "wetland" ? "wetland" :
      "waterbody",
    source: "OpenStreetMap (Overpass API)",
    license: "ODbL 1.0",
    source_date: today(),
  };
  if (t.waterway && !t.water && t.natural !== "water") {
    lines.push({ type: "Feature", properties: base, geometry: { type: "LineString", coordinates: coords } });
  } else {
    const ring = coords[0].join() === coords[coords.length - 1].join() ? coords : [...coords, coords[0]];
    polys.push({ type: "Feature", properties: base, geometry: { type: "Polygon", coordinates: [ring] } });
  }
}

const constituency = readJSON(join(PROCESSED, "constituency.geojson"));
async function clip(features) {
  if (!features.length) return [];
  const r = await mapshaper.applyCommands(
    "-i in.geojson snap -clean -clip bounds.geojson -o out.geojson format=geojson",
    { "in.geojson": JSON.stringify(fc(features)), "bounds.geojson": JSON.stringify(constituency) }
  );
  return (JSON.parse(r["out.geojson"]).features || []).filter((f) => f.geometry);
}

const outFeatures = [...(await clip(polys)), ...(await clip(lines))];
writeJSON(join(PROCESSED, "water.geojson"), round6(fc(outFeatures)));
writeJSON(join(PROCESSED, "water.geojson.meta.json"), {
  dataset: "water",
  features: outFeatures.length,
  source: "OpenStreetMap via Overpass API",
  license: "ODbL 1.0",
  generated: new Date().toISOString(),
}, true);
log(`wrote water.geojson — ${outFeatures.length} features`);
