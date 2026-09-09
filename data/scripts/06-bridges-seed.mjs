// 06 — BRIDGES (SEED ONLY)
// There is NO complete open bridge dataset for Kerala (see DATA_DISCOVERY_REPORT
// §5 and DATA_QUALITY.md). We therefore only SEED the layer from OpenStreetMap
// bridge geometry (road ways tagged bridge=* and man_made=bridge). Every record
// is marked verified=false. Administrators complete the layer via "+ Add Bridge".
//
// We do NOT invent bridges. If OSM has no bridges in an area, the layer is empty
// there until an administrator adds them.
//
// Output: data/processed/bridges.geojson  (points)

import { join } from "node:path";
import {
  PROCESSED, BBOX, overpass, readJSON, writeJSON, fc, round6, titleCase, log, today,
} from "./lib.mjs";

const turf = await import("@turf/turf");

const QUERY = `[out:json][timeout:120];
(
  way["bridge"]["highway"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  way["man_made"="bridge"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
);
out geom tags;`;

const osm = await overpass(QUERY, "bridges_bbox");
const constituency = readJSON(join(PROCESSED, "constituency.geojson"));
const wards = readJSON(join(PROCESSED, "wards.geojson"));
const bounds = constituency.features[0];

const features = [];
for (const el of osm.elements) {
  if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
  const t = el.tags || {};
  const line = turf.lineString(el.geometry.map((p) => [p.lon, p.lat]));
  const mid = turf.along(line, turf.length(line) / 2);
  if (!turf.booleanPointInPolygon(mid, bounds)) continue;

  const ward = wards.features.find((w) => turf.booleanPointInPolygon(mid, w));
  const carriesName = t.name ? titleCase(t.name) : "";
  features.push({
    type: "Feature",
    properties: {
      id: `osm-w${el.id}`,
      osm_id: el.id,
      name: carriesName || "Unnamed Bridge",
      named: Boolean(t.name),
      road: t["addr:street"] || "",
      structure: t.man_made === "bridge" ? "bridge" : t.bridge_type || t.bridge || "yes",
      layer: t.layer || "",
      local_body: ward ? ward.properties.local_body : "",
      local_body_id: ward ? ward.properties.local_body_id : "",
      ward_no: ward ? ward.properties.ward_no : "",
      ward_name: ward ? ward.properties.ward_name : "",
      notes: "",
      source: "OpenStreetMap (Overpass API) — seed only, incomplete",
      license: "ODbL 1.0",
      source_date: today(),
      verified: false,
    },
    geometry: mid.geometry,
  });
}

features.sort((a, b) => Number(b.properties.named) - Number(a.properties.named));
writeJSON(join(PROCESSED, "bridges.geojson"), round6(fc(features)));
writeJSON(join(PROCESSED, "bridges.geojson.meta.json"), {
  dataset: "bridges",
  features: features.length,
  named: features.filter((f) => f.properties.named).length,
  status: "SEED ONLY — incomplete. Complete via admin '+ Add Bridge'.",
  source: "OpenStreetMap via Overpass API",
  license: "ODbL 1.0",
  generated: new Date().toISOString(),
}, true);
log(`wrote data/processed/bridges.geojson  (${features.length} seed bridges, ${features.filter((f) => f.properties.named).length} named) — INCOMPLETE by design`);
