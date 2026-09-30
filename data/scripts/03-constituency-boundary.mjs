// 03 — CONSTITUENCY BOUNDARY
// The Election Commission of India defines an Assembly Constituency as a set of
// complete Local Self Government Institutions. Tanur AC #44 = Tanur Municipality
// + Ozhur, Ponmundam, Thanaloor, Niramaruthoor, Cheriyamundam grama panchayats.
// So the authoritative boundary = the union (dissolve) of those six local bodies.
//
// Output: data/processed/constituency.geojson

import { join } from "node:path";
import mapshaper from "mapshaper";
import * as turf from "@turf/turf";
import {
  PROCESSED, CONSTITUENCY, LOCAL_BODIES, readJSON, writeJSON, fc, round6, fixWinding, log, today,
} from "./lib.mjs";

const localBodies = readJSON(join(PROCESSED, "local_bodies.geojson"));
const wards = readJSON(join(PROCESSED, "wards.geojson"));

const cmd = "-i lb.geojson snap -dissolve2 -clean -o out.geojson format=geojson";
const result = await mapshaper.applyCommands(cmd, { "lb.geojson": JSON.stringify(localBodies) });
const dissolved = JSON.parse(result["out.geojson"]);
const geometry =
  dissolved.type === "GeometryCollection"
    ? dissolved.geometries[0]
    : dissolved.type === "FeatureCollection"
      ? dissolved.features[0].geometry
      : dissolved;

const areaKm2 = Math.round((turf.area(geometry) / 1e6) * 10) / 10;

const feature = {
  type: "Feature",
  properties: {
    id: "tanur-ac-44",
    name: CONSTITUENCY.name,
    name_ml: CONSTITUENCY.name_ml,
    number: CONSTITUENCY.number,
    type: "assembly_constituency",
    district: CONSTITUENCY.district,
    taluk: CONSTITUENCY.taluk,
    parliamentary_constituency: CONSTITUENCY.parliamentary_constituency,
    local_body_count: LOCAL_BODIES.length,
    ward_count: wards.features.length,
    area_km2: areaKm2,
    local_bodies: LOCAL_BODIES.map((l) => l.name),
    source:
      "Derived: union of the six component Local Self Government Institutions " +
      "(themselves dissolved from 2024 Delimitation Commission ward polygons). " +
      "Composition per ECI Delimitation of Constituencies Order 2008 (via Wikipedia; " +
      "pending cross-check against the original notification).",
    confidence: "medium-high",
    acquired: today(),
  },
  geometry,
};

// Inverted mask: a world-covering polygon with the constituency punched out,
// used to grey-out everything outside the constituency on the map. Built
// from the original (pre-rewind) `geometry` — this ring math is independent
// of fixWinding, so it must run before fixWinding touches `feature.geometry`
// (the same object, mutated in place).
const outerRing = [
  [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85],
];
// Hole rings must wind opposite to the outer ring (GeoJSON RFC7946) or
// renderers treat them as solid fill instead of a punched-out hole. The
// constituency exterior ring comes out CCW like the mask's outer ring, so
// reverse it here.
const holes =
  geometry.type === "MultiPolygon"
    ? geometry.coordinates.map((poly) => [...poly[0]].reverse())
    : [[...geometry.coordinates[0]].reverse()];
writeJSON(
  join(PROCESSED, "constituency_mask.geojson"),
  fc([
    {
      type: "Feature",
      properties: { id: "tanur-ac-44-mask" },
      geometry: { type: "Polygon", coordinates: [outerRing, ...holes] },
    },
  ])
);

// constituency.geojson itself is only ever line-rendered today, but fix its
// winding too so it's safe if a fill layer ever uses it. Written last since
// fixWinding mutates feature.geometry in place (same object as `geometry`
// above, already consumed by the mask code).
writeJSON(join(PROCESSED, "constituency.geojson"), fixWinding(fc([feature])));

writeJSON(join(PROCESSED, "constituency.geojson.meta.json"), {
  dataset: "constituency",
  method: "dissolve2 of processed/local_bodies.geojson",
  area_km2: areaKm2,
  generated: new Date().toISOString(),
}, true);

log(`wrote data/processed/constituency.geojson  (~${areaKm2} km²)`);
