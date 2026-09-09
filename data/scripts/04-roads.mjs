// 04 — ROADS
// Source: OpenStreetMap (Overpass API). ODbL 1.0.
// - Clipped to the constituency boundary.
// - Segments sharing a name are grouped; each road gets a derived START and END
//   point (nearest named place / junction), which an administrator can refine.
// - Malayalam names are preserved as-is.
//
// Output: data/processed/roads.geojson

import { join } from "node:path";
import mapshaper from "mapshaper";
import * as turf from "@turf/turf";
import {
  PROCESSED, BBOX, overpass, readJSON, writeJSON, fc, round6, titleCase, log, today,
} from "./lib.mjs";

const CATEGORY = {
  motorway: ["highway", 1], motorway_link: ["highway", 1],
  trunk: ["highway", 1], trunk_link: ["highway", 1],
  primary: ["major", 2], primary_link: ["major", 2],
  secondary: ["major", 3], secondary_link: ["major", 3],
  tertiary: ["connector", 4], tertiary_link: ["connector", 4],
  unclassified: ["local", 5], residential: ["local", 5],
  living_street: ["local", 5], road: ["local", 5],
  service: ["service", 6], track: ["track", 6],
  pedestrian: ["path", 7], footway: ["path", 7], path: ["path", 7],
  cycleway: ["path", 7], steps: ["path", 7], bridleway: ["path", 7],
};

const hasLatin = (s) => /[a-z]/i.test(s);
const cleanName = (s) => (s && hasLatin(s) ? titleCase(s) : (s || "").trim());

/* ---- 1. fetch highways + place/junction reference points ---- */
const ROADS_Q = `[out:json][timeout:200];
way["highway"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
out geom tags;`;
const PLACES_Q = `[out:json][timeout:120];
(
  node["place"~"^(town|village|hamlet|suburb|neighbourhood|locality|quarter)$"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  node["highway"="mini_roundabout"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  node["junction"="yes"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  node["railway"="station"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
);
out tags center;`;

const osm = await overpass(ROADS_Q, "roads_bbox");
const placesOsm = await overpass(PLACES_Q, "road_refs_bbox");
log(`overpass: ${osm.elements.length} highway ways, ${placesOsm.elements.length} reference points`);

const refPoints = placesOsm.elements
  .filter((e) => e.tags?.name && (e.lat ?? e.center?.lat) != null)
  .map((e) => ({
    name: cleanName(e.tags.name),
    pt: turf.point([e.lon ?? e.center.lon, e.lat ?? e.center.lat]),
  }));

/* ---- 2. build raw features ---- */
const raw = [];
for (const el of osm.elements) {
  if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
  const t = el.tags || {};
  const cat = CATEGORY[t.highway] || ["local", 5];
  if (cat[0] === "path" && !t.name) continue;
  const nameRaw = t.name || t["name:en"] || "";
  const name = cleanName(nameRaw);
  raw.push({
    type: "Feature",
    properties: {
      id: `osm-w${el.id}`,
      osm_id: el.id,
      name: name || "Unnamed Road",
      named: Boolean(nameRaw),
      name_ml: t["name:ml"] || (nameRaw && !hasLatin(nameRaw) ? nameRaw : ""),
      category: cat[0],
      rank: cat[1],
      highway: t.highway,
      ref: t.ref || "",
      surface: t.surface || "",
      oneway: t.oneway === "yes",
      bridge: t.bridge && t.bridge !== "no" ? "yes" : "",
      start_point: "",
      end_point: "",
      source: "OpenStreetMap (Overpass API)",
      source_date: today(),
      license: "ODbL 1.0",
      verified: false,
    },
    geometry: { type: "LineString", coordinates: el.geometry.map((p) => [p.lon, p.lat]) },
  });
}

/* ---- 3. clip to constituency ---- */
const constituency = readJSON(join(PROCESSED, "constituency.geojson"));
const wards = readJSON(join(PROCESSED, "wards.geojson"));
const clip = await mapshaper.applyCommands(
  "-i roads.geojson -clip bounds.geojson -o out.geojson format=geojson",
  { "roads.geojson": JSON.stringify(fc(raw)), "bounds.geojson": JSON.stringify(constituency) }
);
let features = (JSON.parse(clip["out.geojson"]).features || []).filter(
  (f) => f.geometry && (f.geometry.type === "LineString" || f.geometry.type === "MultiLineString")
);

/* ---- 4. name a point by nearest reference / ward ---- */
function nameEndpoint(coord, excludeName) {
  const p = turf.point(coord);
  let best = null;
  let bestKm = Infinity;
  for (const r of refPoints) {
    if (r.name === excludeName) continue;
    const d = turf.distance(p, r.pt);
    if (d < bestKm) { bestKm = d; best = r.name; }
  }
  if (best && bestKm < 0.9) return best;
  const w = wards.features.find((wd) => {
    try { return turf.booleanPointInPolygon(p, wd); } catch { return false; }
  });
  return w ? `${w.properties.ward_name} area` : "";
}

function ends(geom) {
  const line =
    geom.type === "MultiLineString"
      ? geom.coordinates.flat()
      : geom.coordinates;
  return [line[0], line[line.length - 1]];
}

/* ---- 5. group named roads → shared start/end from overall extremities ---- */
const groups = new Map();
for (const f of features) {
  if (!f.properties.named) continue;
  const k = f.properties.name;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(f);
}
for (const [name, segs] of groups) {
  const pts = [];
  for (const s of segs) { const [a, b] = ends(s.geometry); pts.push(a, b); }
  // pick the two furthest-apart endpoints as the road's extremities
  let maxD = -1, ext = [pts[0], pts[1]];
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++) {
      const d = turf.distance(turf.point(pts[i]), turf.point(pts[j]));
      if (d > maxD) { maxD = d; ext = [pts[i], pts[j]]; }
    }
  const start = nameEndpoint(ext[0], name);
  const end = nameEndpoint(ext[1], name);
  for (const s of segs) {
    s.properties.start_point = start;
    s.properties.end_point = end;
  }
}
// unnamed: per-segment
for (const f of features) {
  if (f.properties.named) continue;
  const [a, b] = ends(f.geometry);
  f.properties.start_point = nameEndpoint(a);
  f.properties.end_point = nameEndpoint(b);
}

/* ---- 6. attach local body / ward ---- */
for (const f of features) {
  try {
    const mid = turf.along(f, turf.length(f) / 2);
    const w = wards.features.find((wd) => turf.booleanPointInPolygon(mid, wd));
    f.properties.local_body = w ? w.properties.local_body : "";
    f.properties.local_body_id = w ? w.properties.local_body_id : "";
    f.properties.ward_no = w ? w.properties.ward_no : "";
    f.properties.ward_name = w ? w.properties.ward_name : "";
  } catch { /* leave blank */ }
}

features.sort((a, b) => a.properties.rank - b.properties.rank || a.properties.name.localeCompare(b.properties.name));

const namedRoads = [...groups.keys()].filter((n) => n !== "Unnamed Road").sort();
writeJSON(join(PROCESSED, "roads.geojson"), round6(fc(features)));
writeJSON(join(PROCESSED, "roads.geojson.meta.json"), {
  dataset: "roads",
  features: features.length,
  named_segments: features.filter((f) => f.properties.named).length,
  distinct_named_roads: namedRoads.length,
  named_roads: namedRoads,
  source: "OpenStreetMap via Overpass API",
  license: "ODbL 1.0",
  generated: new Date().toISOString(),
}, true);
log(`wrote roads.geojson — ${features.length} segments, ${namedRoads.length} distinct named roads`);
