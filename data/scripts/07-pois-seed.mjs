// 07 — IMPORTANT PLACES (SEED)
// Limited to constituency-relevant infrastructure: schools, health facilities,
// government / public offices, and major junctions. Seeded from OpenStreetMap.
//
// Schools: this is an OSM seed. The authoritative source is Sametham / KITE
//   (sametham.kite.kerala.gov.in, filter Assembly Constituency = "Tanur"),
//   which has no open bulk export — those records are added/verified by an
//   administrator. See DATA_DISCOVERY_REPORT §6.
// Health: authoritative source is the DHS / Arogya Keralam institution list
//   (PDF only) — major facilities to be verified/added by an administrator.
//
// Every record is verified=false. Output: data/processed/places_osm_seed.geojson

import { join } from "node:path";
import {
  PROCESSED, BBOX, overpass, readJSON, writeJSON, fc, round6, titleCase, log, today,
} from "./lib.mjs";

const turf = await import("@turf/turf");

const QUERY = `[out:json][timeout:180];
(
  nwr["amenity"="school"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  nwr["amenity"="college"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  nwr["amenity"~"^(hospital|clinic|doctors)$"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  nwr["healthcare"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  nwr["amenity"~"^(townhall|police|post_office|courthouse|fire_station)$"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  nwr["office"="government"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
  nwr["government"](${BBOX[0]},${BBOX[1]},${BBOX[2]},${BBOX[3]});
);
out center tags;`;

const osm = await overpass(QUERY, "places_bbox");
const constituency = readJSON(join(PROCESSED, "constituency.geojson"));
const wards = readJSON(join(PROCESSED, "wards.geojson"));
const bounds = constituency.features[0];

function classify(t) {
  if (t.amenity === "school") return ["school", "School"];
  if (t.amenity === "college") return ["school", "College"];
  if (t.amenity === "hospital" || t.healthcare === "hospital") return ["health", "Hospital"];
  if (t.amenity === "clinic" || t.healthcare === "clinic") return ["health", "Clinic / PHC"];
  if (t.amenity === "doctors" || t.healthcare) return ["health", "Health facility"];
  if (t.amenity === "police") return ["government", "Police station"];
  if (t.amenity === "townhall") return ["government", "Local body office"];
  if (t.amenity === "post_office") return ["government", "Post office"];
  if (t.amenity === "courthouse") return ["government", "Court"];
  if (t.amenity === "fire_station") return ["government", "Fire station"];
  if (t.office === "government" || t.government) return ["government", titleCase(t.government || "Government office")];
  return ["public", "Public institution"];
}

const seen = new Set();
const features = [];
for (const el of osm.elements) {
  const t = el.tags || {};
  if (!t.name) continue; // only named, important places
  const lon = el.type === "node" ? el.lon : el.center?.lon;
  const lat = el.type === "node" ? el.lat : el.center?.lat;
  if (lon == null || lat == null) continue;
  const pt = turf.point([lon, lat]);
  if (!turf.booleanPointInPolygon(pt, bounds)) continue;

  const key = `${titleCase(t.name)}|${lat.toFixed(4)},${lon.toFixed(4)}`;
  if (seen.has(key)) continue;
  seen.add(key);

  const [category, subtype] = classify(t);
  const ward = wards.features.find((w) => turf.booleanPointInPolygon(pt, w));
  features.push({
    type: "Feature",
    properties: {
      id: `osm-${el.type[0]}${el.id}`,
      osm_id: el.id,
      name: titleCase(t.name),
      name_ml: t["name:ml"] || "",
      category,
      subtype,
      operator_type:
        /government|govt|public|state|kerala/i.test(t.operator || t["operator:type"] || "")
          ? "government"
          : t.operator
          ? "private"
          : "",
      address: [t["addr:street"], t["addr:city"], t["addr:postcode"]].filter(Boolean).join(", "),
      phone: t.phone || t["contact:phone"] || "",
      website: t.website || t["contact:website"] || "",
      local_body: ward ? ward.properties.local_body : "",
      local_body_id: ward ? ward.properties.local_body_id : "",
      ward_no: ward ? ward.properties.ward_no : "",
      ward_name: ward ? ward.properties.ward_name : "",
      notes: "",
      source: "OpenStreetMap (Overpass API) — seed; verify against KITE/DHS/LSGD",
      license: "ODbL 1.0",
      source_date: today(),
      verified: false,
    },
    geometry: { type: "Point", coordinates: [lon, lat] },
  });
}

const counts = {};
for (const f of features) counts[f.properties.category] = (counts[f.properties.category] || 0) + 1;

features.sort((a, b) => a.properties.category.localeCompare(b.properties.category) || a.properties.name.localeCompare(b.properties.name));
writeJSON(join(PROCESSED, "places_osm_seed.geojson"), round6(fc(features)));
writeJSON(join(PROCESSED, "places_osm_seed.geojson.meta.json"), {
  dataset: "places",
  features: features.length,
  by_category: counts,
  status: "SEED — OSM only. Authoritative: KITE/Sametham (schools), DHS (health), LSGD (offices).",
  source: "OpenStreetMap via Overpass API",
  license: "ODbL 1.0",
  generated: new Date().toISOString(),
}, true);
log(`wrote data/processed/places_osm_seed.geojson  (${features.length} places: ${JSON.stringify(counts)})`);
