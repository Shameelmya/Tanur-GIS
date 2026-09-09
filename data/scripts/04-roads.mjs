// 04 — ROADS
// Source: OpenStreetMap (via Overpass API). OSM has the best *named* road
// coverage for this area. Licensed ODbL 1.0 — attribution + share-alike.
// Roads are clipped to the constituency boundary.
//
// A follow-up enrichment against PMGSY GeoSadak (official road class / owning
// agency) is possible later; see DATA_DISCOVERY_REPORT.md §4.2.
//
// Output: data/processed/roads.geojson

import { join } from "node:path";
import mapshaper from "mapshaper";
import {
  PROCESSED, BBOX, overpass, readJSON, writeJSON, fc, round6, titleCase, log, today,
} from "./lib.mjs";

// OSM highway= value -> our simplified category + display rank (1 = biggest)
const CATEGORY = {
  motorway: ["highway", 1], motorway_link: ["highway", 1],
  trunk: ["highway", 1], trunk_link: ["highway", 1],
  primary: ["major", 2], primary_link: ["major", 2],
  secondary: ["major", 3], secondary_link: ["major", 3],
  tertiary: ["connector", 4], tertiary_link: ["connector", 4],
  unclassified: ["local", 5],
  residential: ["local", 5],
  living_street: ["local", 5],
  road: ["local", 5],
  service: ["service", 6],
  track: ["track", 6],
  pedestrian: ["path", 7], footway: ["path", 7], path: ["path", 7],
  cycleway: ["path", 7], steps: ["path", 7], bridleway: ["path", 7],
};

const QUERY = `[out:json][timeout:180];
way["highway"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
out geom tags;`;

const osm = await overpass(QUERY, "roads_bbox");
log(`overpass returned ${osm.elements.length} highway ways in bbox`);

const raw = [];
for (const el of osm.elements) {
  if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
  const t = el.tags || {};
  const hw = t.highway;
  const cat = CATEGORY[hw] || ["local", 5];
  // Skip pure pathways unless named (keeps the map about vehicle infrastructure)
  if (cat[0] === "path" && !t.name) continue;
  const name = t.name ? titleCase(t.name) : "";
  raw.push({
    type: "Feature",
    properties: {
      id: `osm-w${el.id}`,
      osm_id: el.id,
      name: name || "Unnamed Road",
      named: Boolean(t.name),
      name_ml: t["name:ml"] || "",
      name_en: t["name:en"] || "",
      category: cat[0],
      rank: cat[1],
      highway: hw,
      ref: t.ref || "",
      surface: t.surface || "",
      oneway: t.oneway === "yes",
      bridge: t.bridge && t.bridge !== "no" ? "yes" : "",
      tunnel: t.tunnel && t.tunnel !== "no" ? "yes" : "",
      start_point: "",
      end_point: "",
      source: "OpenStreetMap (Overpass API)",
      source_date: today(),
      license: "ODbL 1.0",
      verified: false,
    },
    geometry: {
      type: "LineString",
      coordinates: el.geometry.map((p) => [p.lon, p.lat]),
    },
  });
}
log(`kept ${raw.length} road features before clip`);

// Clip to the constituency boundary.
const constituency = readJSON(join(PROCESSED, "constituency.geojson"));
const clipped = await mapshaper.applyCommands(
  "-i roads.geojson -clip bounds.geojson -o out.geojson format=geojson",
  { "roads.geojson": JSON.stringify(fc(raw)), "bounds.geojson": JSON.stringify(constituency) }
);
const out = JSON.parse(clipped["out.geojson"]);
const features = (out.features || []).filter((f) => f.geometry);

// Tag each road with the local body / ward it mostly sits in — best effort,
// using a representative point. Done with turf in a lightweight way.
const { default: turf } = await import("@turf/turf").then((m) => ({ default: m }));
const wards = readJSON(join(PROCESSED, "wards.geojson"));
for (const f of features) {
  try {
    const mid = turf.along(f, turf.length(f) / 2);
    const w = wards.features.find((wd) => turf.booleanPointInPolygon(mid, wd));
    f.properties.local_body = w ? w.properties.local_body : "";
    f.properties.local_body_id = w ? w.properties.local_body_id : "";
    f.properties.ward_no = w ? w.properties.ward_no : "";
    f.properties.ward_name = w ? w.properties.ward_name : "";
  } catch {
    /* leave blank */
  }
}

features.sort((a, b) => a.properties.rank - b.properties.rank || a.properties.name.localeCompare(b.properties.name));

const named = features.filter((f) => f.properties.named).length;
writeJSON(join(PROCESSED, "roads.geojson"), round6(fc(features)));
writeJSON(join(PROCESSED, "roads.geojson.meta.json"), {
  dataset: "roads",
  features: features.length,
  named,
  unnamed: features.length - named,
  source: "OpenStreetMap via Overpass API",
  license: "ODbL 1.0",
  generated: new Date().toISOString(),
}, true);

log(`wrote data/processed/roads.geojson  (${features.length} roads, ${named} named, ${features.length - named} unnamed)`);
