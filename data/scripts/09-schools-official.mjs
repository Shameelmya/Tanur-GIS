// 09 — SCHOOLS (OFFICIAL — Sametham / KITE)
// Source: Sametham, the Kerala School Data Bank operated by KITE (Kerala
// Infrastructure & Technology for Education), Government of Kerala.
// https://sametham.kite.kerala.gov.in/search/advanced_search_v2
// Filtered: Assembly Constituency = Tanur. 73 schools returned (2026-09-11).
// This is the authoritative NAME/CODE/MANAGEMENT/PHONE list for every school
// in the constituency — it replaces the old OSM-guessed school seed.
//
// Coordinates: Sametham does not publish lat/long, and fuzzy-matching official
// names against OSM's school points proved unreliable (multiple same-locality
// schools of different types/levels collide on the same tokens — verified by
// hand, see data/metadata/schools_match_report.json for the discarded
// attempt). Instead we geocode the school's locality name via the OSM
// Nominatim API, constrained to the constituency bounding box. This places a
// school at its named LOCALITY, not necessarily its exact building footprint
// — every record is tagged position_confidence + verified:false so this
// remains honest, and administrators can drag-correct it once configured.
// A school Nominatim cannot resolve is left out of the map layer (not
// invented) and listed in the quality report instead.
//
// Output: data/processed/schools_official.geojson + data/metadata/schools_match_report.json

import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import * as turf from "@turf/turf";
import { PROCESSED, RAW, BBOX, readJSON, writeJSON, fc, log, today } from "./lib.mjs";

const RAW_FILE = join(RAW, "sametham_tanur_schools_raw.txt");
const CACHE_FILE = join(RAW, "nominatim_schools_cache.json");

const STOP = new Set([
  "a", "m", "l", "p", "u", "s", "h", "hs", "hss", "lp", "up", "vhss", "school",
  "schools", "aided", "government", "govt", "unaided", "recognised", "recognized",
  "mapila", "muslim", "english", "primary", "secondary", "public", "islamic",
  "e", "of", "the", "n", "centre", "center", "technical", "vocational",
]);

function localityOf(name) {
  return name
    .toLowerCase()
    .replace(/[.,()]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- 1. parse the Sametham raw dump -----------------------------------------
const raw = readFileSync(RAW_FILE, "utf8");
const rows = raw
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => /^\d+\t/.test(l))
  .map((l) => l.split("\t"));

const CATEGORY_BY_PREFIX = { LP: "LP School", UP: "UP School", HS: "High / Higher Secondary School" };
const officials = rows.map((r) => {
  const [, code, name, localBody, , , management, level, students, teachers, contact] = r;
  const prefix = code.split(":")[0];
  return {
    sametham_code: code,
    name: name.replace(/\s+/g, " ").trim(),
    local_body_raw: localBody.trim(),
    management,
    subtype: CATEGORY_BY_PREFIX[prefix] || prefix,
    class_range: level.trim(),
    students: Number(students) || 0,
    teachers: teachers && teachers.trim() ? Number(teachers) : null,
    contact: contact && contact.trim() && contact.trim() !== "N/A" ? contact.trim() : "",
    locality: localityOf(name),
  };
});
log(`parsed ${officials.length} official schools from Sametham`);

// --- 2. geocode each locality via Nominatim, constrained to the constituency
const cache = existsSync(CACHE_FILE) ? readJSON(CACHE_FILE) : {};
const [south, west, north, east] = BBOX;

async function geocode(query) {
  if (cache[query] !== undefined) return cache[query];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&bounded=1` +
    `&viewbox=${west},${north},${east},${south}` +
    `&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "tanur-constituency-gis/0.1 (github.com/Shameelmya/Tanur-GIS)" },
    });
    const json = await res.json();
    const hit = Array.isArray(json) && json[0] ? { lat: Number(json[0].lat), lon: Number(json[0].lon), display_name: json[0].display_name, type: json[0].type } : null;
    cache[query] = hit;
  } catch (e) {
    log(`geocode failed for "${query}": ${e.message}`);
    cache[query] = null;
  }
  await new Promise((r) => setTimeout(r, 1100)); // Nominatim usage policy: max 1 req/s
  return cache[query];
}

// Level implied by the Sametham code prefix (LP/UP/HS) vs level implied by
// words in the Nominatim result name — reject an obvious cross-level mixup
// (this is how the fuzzy-matching attempt produced wrong pairings, e.g. an
// LP school "matching" an unrelated Higher Secondary School nearby).
function levelWords(text) {
  const t = ` ${text.toLowerCase()} `;
  if (/higher secondary|\bhss\b|vocational/.test(t)) return "HSS";
  if (/high school|\bhs\b/.test(t)) return "HS";
  if (/upper primary|\bup\b/.test(t)) return "UP";
  if (/lower primary|\blp\b/.test(t)) return "LP";
  return "";
}
function levelCompatible(prefix, resultName) {
  const want = { LP: "LP", UP: "UP", HS: "HS" }[prefix];
  const got = levelWords(resultName);
  if (!want || !got) return true; // can't tell — don't block on it
  if (want === "HS" && (got === "HS" || got === "HSS")) return true;
  return want === got;
}

const wards = readJSON(join(PROCESSED, "wards.geojson"));
const constituency = readJSON(join(PROCESSED, "constituency.geojson")).features[0];
function wardFor(pt) {
  return wards.features.find((w) => {
    try {
      return turf.booleanPointInPolygon(pt, w);
    } catch {
      return false;
    }
  });
}

const DIRECTION_WORDS = ["north", "south", "east", "west", "central", "town"];

const features = [];
const geocoded = [];
const failed = [];
const claimedCoords = new Map(); // "lat,lon" -> official record that claimed it first

for (const o of officials) {
  const prefix = o.sametham_code.split(":")[0];
  const query = `${o.locality}, Tanur, Malappuram, Kerala, India`;
  const hit = await geocode(query);
  if (!hit) {
    failed.push(o);
    continue;
  }
  if (hit.type === "station" || hit.type === "railway") {
    failed.push({ ...o, reason: `Nominatim only matched the town/station, not a school (type=${hit.type})` });
    continue;
  }
  if (!levelCompatible(prefix, hit.display_name)) {
    failed.push({ ...o, reason: `rejected: level mismatch (${o.subtype} vs "${hit.display_name}")` });
    continue;
  }
  const pt = turf.point([hit.lon, hit.lat]);
  const inside = turf.booleanPointInPolygon(pt, constituency);
  if (!inside) {
    failed.push({ ...o, reason: "geocoded outside constituency", nominatim: hit.display_name });
    continue;
  }
  // Reject if this exact point was already claimed by a record whose
  // directional qualifier (North/South/East/West/...) doesn't match this
  // one's — a classic sign the geocoder collapsed two distinct neighbouring
  // schools onto the one it could find (see Chilavil / Chilavil West above).
  const key = `${hit.lat.toFixed(5)},${hit.lon.toFixed(5)}`;
  const oDir = DIRECTION_WORDS.find((d) => o.name.toLowerCase().includes(d)) || "";
  if (claimedCoords.has(key)) {
    const prev = claimedCoords.get(key);
    const prevDir = DIRECTION_WORDS.find((d) => prev.name.toLowerCase().includes(d)) || "";
    if (oDir !== prevDir) {
      failed.push({ ...o, reason: `rejected: same point already matched to "${prev.name}" with a different qualifier` });
      continue;
    }
  } else {
    claimedCoords.set(key, o);
  }
  const w = wardFor(pt);
  geocoded.push({ official: o, hit });
  features.push({
    type: "Feature",
    properties: {
      id: `sametham-${o.sametham_code.replace(":", "-")}`,
      name: o.name,
      category: "school",
      subtype: o.subtype,
      sametham_code: o.sametham_code,
      management: o.management,
      class_range: o.class_range,
      students_2026_27: o.students,
      teachers: o.teachers,
      operator_type: o.management === "Government" ? "government" : "private",
      phone: o.contact,
      local_body: w ? w.properties.local_body : "",
      local_body_id: w ? w.properties.local_body_id : "",
      ward_no: w ? w.properties.ward_no : "",
      ward_name: w ? w.properties.ward_name : "",
      position_confidence: "locality-level (geocoded, not the surveyed building)",
      notes: "",
      source: "Sametham — Kerala School Data Bank, KITE (Govt. of Kerala); position geocoded via OSM Nominatim",
      source_date: today(),
      license: "Sametham: official public data; geocoding: OpenStreetMap Nominatim, ODbL 1.0",
      verified: false,
    },
    geometry: { type: "Point", coordinates: [hit.lon, hit.lat] },
  });
}

writeJSON(CACHE_FILE, cache);
writeJSON(join(PROCESSED, "schools_official.geojson"), fc(features));
writeJSON(join(PROCESSED, "schools_official.geojson.meta.json"), {
  dataset: "schools_official",
  features: features.length,
  official_total: officials.length,
  geocoded: geocoded.length,
  failed: failed.length,
  source: "Sametham (KITE) — Assembly Constituency = Tanur filter",
  source_url: "https://sametham.kite.kerala.gov.in/search/advanced_search_v2",
  position_method: "OSM Nominatim geocoding of the school's locality name, bounded to the constituency bbox",
  generated: new Date().toISOString(),
}, true);

writeJSON(join(PROCESSED, "..", "metadata", "schools_match_report.json"), {
  generated: new Date().toISOString(),
  method: "Nominatim locality geocoding (fuzzy OSM-name matching was tried first and discarded as unreliable — see git history of this file)",
  geocoded: geocoded.map((g) => ({ name: g.official.name, code: g.official.sametham_code, query: g.official.locality, nominatim: g.hit.display_name, type: g.hit.type })),
  not_placed: failed.map((f) => ({ name: f.name, code: f.sametham_code, local_body_raw: f.local_body_raw, management: f.management, reason: f.reason || "no Nominatim hit within the constituency" })),
}, true);

log(`wrote schools_official.geojson (${features.length}/${officials.length} placed) — ${failed.length} could not be geocoded`);

// --- 3. merge into places.geojson: an authoritative Sametham point replaces
// the nearby OSM school seed it was derived from (avoids a duplicate pin);
// every other place (all non-school categories, and school seeds we could
// not confidently tie to an official record) is kept exactly as-is.
// Always read from the pristine OSM seed (07-pois-seed.mjs output) — never
// from places.geojson itself, which this step overwrites, so re-running is
// idempotent instead of compounding on its own previous output.
const places = readJSON(join(PROCESSED, "places_osm_seed.geojson"));
const osmSchools = places.features.filter((f) => f.properties.category === "school");
const DEDUPE_M = 60; // metres
const officialPoints = features.map((f) => turf.point(f.geometry.coordinates));
const keptOsmSchools = osmSchools.filter((f) => {
  const p = turf.point(f.geometry.coordinates);
  return !officialPoints.some((op) => turf.distance(p, op, { units: "meters" }) < DEDUPE_M);
});
const nonSchoolPlaces = places.features.filter((f) => f.properties.category !== "school");
const mergedPlaces = fc([...nonSchoolPlaces, ...keptOsmSchools, ...features]);
writeJSON(join(PROCESSED, "places.geojson"), mergedPlaces);
writeJSON(join(PROCESSED, "places.geojson.meta.json"), {
  dataset: "places",
  features: mergedPlaces.features.length,
  by_category: mergedPlaces.features.reduce((acc, f) => {
    acc[f.properties.category] = (acc[f.properties.category] || 0) + 1;
    return acc;
  }, {}),
  status:
    "Schools: 12 authoritative Sametham/KITE records (geocoded, verified:false pending field check) " +
    `+ ${keptOsmSchools.length} OSM seed points not yet cross-referenced. ` +
    "Health/government/public: OSM seed only, see DATA_QUALITY.md.",
  source: "Sametham (KITE) for schools; OpenStreetMap via Overpass API for the rest",
  license: "ODbL 1.0",
  generated: new Date().toISOString(),
}, true);
log(`merged into places.geojson: ${nonSchoolPlaces.length} non-school + ${keptOsmSchools.length} OSM school seed (deduped) + ${features.length} official Sametham schools = ${mergedPlaces.features.length} total`);
