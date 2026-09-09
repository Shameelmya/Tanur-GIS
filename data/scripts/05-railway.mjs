// 05 — RAILWAY
// Source: OpenStreetMap (Overpass). The Shoranur–Mangaluru line runs along the
// coast through the constituency; Tanur station lies within it.
// Output: data/processed/railway.geojson  (lines + station points)

import { join } from "node:path";
import mapshaper from "mapshaper";
import {
  PROCESSED, BBOX, overpass, readJSON, writeJSON, fc, round6, titleCase, log, today,
} from "./lib.mjs";

const QUERY = `[out:json][timeout:120];
(
  way["railway"="rail"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  node["railway"~"^(station|halt)$"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
);
out geom tags;`;

const osm = await overpass(QUERY, "railway_bbox");

const lines = [];
const stations = [];
for (const el of osm.elements) {
  const t = el.tags || {};
  if (el.type === "way" && el.geometry?.length > 1) {
    lines.push({
      type: "Feature",
      properties: {
        id: `osm-w${el.id}`,
        osm_id: el.id,
        name: t.name ? titleCase(t.name) : "Railway line",
        usage: t.usage || "",
        electrified: t.electrified || "",
        gauge: t.gauge || "",
        source: "OpenStreetMap (Overpass API)",
        license: "ODbL 1.0",
        source_date: today(),
        kind: "line",
      },
      geometry: { type: "LineString", coordinates: el.geometry.map((p) => [p.lon, p.lat]) },
    });
  }
  if (el.type === "node" && (t.railway === "station" || t.railway === "halt")) {
    stations.push({
      type: "Feature",
      properties: {
        id: `osm-n${el.id}`,
        osm_id: el.id,
        name: t.name ? titleCase(t.name) : "Railway station",
        name_ml: t["name:ml"] || "",
        railway: t.railway,
        station_code: t["ref"] || t["railway:ref"] || "",
        network: t.network || "",
        operator: t.operator || "Indian Railways",
        source: "OpenStreetMap (Overpass API)",
        license: "ODbL 1.0",
        source_date: today(),
        verified: false,
        kind: "station",
      },
      geometry: { type: "Point", coordinates: [el.lon, el.lat] },
    });
  }
}

const constituency = readJSON(join(PROCESSED, "constituency.geojson"));
const clip = await mapshaper.applyCommands(
  "-i lines.geojson -clip bounds.geojson -o out.geojson format=geojson",
  { "lines.geojson": JSON.stringify(fc(lines)), "bounds.geojson": JSON.stringify(constituency) }
);
const clippedLines = (JSON.parse(clip["out.geojson"]).features || []).filter((f) => f.geometry);

const turf = await import("@turf/turf");
const bounds = constituency.features[0];
const keptStations = stations.filter((s) => turf.booleanPointInPolygon(s, bounds));

const features = [...clippedLines, ...keptStations];
writeJSON(join(PROCESSED, "railway.geojson"), round6(fc(features)));
writeJSON(join(PROCESSED, "railway.geojson.meta.json"), {
  dataset: "railway",
  lines: clippedLines.length,
  stations: keptStations.length,
  source: "OpenStreetMap via Overpass API",
  license: "ODbL 1.0",
  generated: new Date().toISOString(),
}, true);
log(`wrote data/processed/railway.geojson  (${clippedLines.length} line segments, ${keptStations.length} stations: ${keptStations.map((s) => s.properties.name).join(", ")})`);
