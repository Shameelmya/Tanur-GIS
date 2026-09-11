// 10 — LOCAL RESEARCH: government offices, health facilities, named bridges
// Sources (all cited per-record): landrevenue.kerala.gov.in (village offices,
// official coordinates), Kerala Police, KITE/Sametham cross-refs, DHS /
// Arogya Keralam / digitalkeralam listings for health facilities, and news
// coverage + OSM for two real, named bridges. Raw notes in
// data/raw/offices_health_research_notes.json.
//
// - Village offices use their OFFICIAL embedded coordinate directly.
// - Krishi Bhavans / PHCs without a published coordinate are geocoded via
//   OSM Nominatim (bounded to the constituency) — same honest-uncertainty
//   approach as 09-schools-official.mjs. A record Nominatim can't place is
//   left out of the map and reported instead of guessed.
// - Two well-documented named bridges are added: one is an existing "Unnamed
//   Bridge" OSM point near Tanur station renamed with its real name (it sits
//   beside the railway crossing the Tanur–Theyyala road, matching the PWD
//   declaration); the other (the Thooval Theeram floating bridge) uses its
//   own OSM reference node.
//
// Output: updates data/processed/places.geojson and bridges.geojson in place.

import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import * as turf from "@turf/turf";
import { PROCESSED, RAW, BBOX, readJSON, writeJSON, fc, log, today } from "./lib.mjs";

const notes = JSON.parse(readFileSync(join(RAW, "offices_health_research_notes.json"), "utf8"));
const CACHE_FILE = join(RAW, "nominatim_offices_cache.json");
const cache = existsSync(CACHE_FILE) ? readJSON(CACHE_FILE) : {};
const [south, west, north, east] = BBOX;

async function geocode(query) {
  if (cache[query] !== undefined) return cache[query];
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&bounded=1` +
    `&viewbox=${west},${north},${east},${south}&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "tanur-constituency-gis/0.1 (github.com/Shameelmya/Tanur-GIS)" },
    });
    const json = await res.json();
    cache[query] = Array.isArray(json) && json[0] ? { lat: Number(json[0].lat), lon: Number(json[0].lon), display_name: json[0].display_name } : null;
  } catch (e) {
    log(`geocode failed "${query}": ${e.message}`);
    cache[query] = null;
  }
  await new Promise((r) => setTimeout(r, 1100));
  return cache[query];
}

const wards = readJSON(join(PROCESSED, "wards.geojson"));
const localBodies = readJSON(join(PROCESSED, "local_bodies.geojson"));
const constituency = readJSON(join(PROCESSED, "constituency.geojson")).features[0];
function wardFor(pt) {
  return wards.features.find((w) => {
    try { return turf.booleanPointInPolygon(pt, w); } catch { return false; }
  });
}
function localBodyPolygonFor(name) {
  return localBodies.features.find((f) => f.properties.name.toLowerCase() === name.toLowerCase());
}

const newPlaces = [];
const skipped = [];

/* ---- 1. village offices (official coordinate, direct) ---- */
for (const o of notes.village_offices) {
  const pt = turf.point([o.lon, o.lat]);
  const claimedBody = localBodyPolygonFor(o.local_body);
  const actuallyInside = claimedBody ? turf.booleanPointInPolygon(pt, claimedBody) : false;
  if (!actuallyInside) {
    skipped.push({ name: o.name, reason: `official coordinate (${o.lat},${o.lon}) does not fall inside the ${o.local_body} local-body polygon — likely a templated/incorrect pin on the source site; excluded rather than mis-shown`, source: o.source });
    continue;
  }
  const w = wardFor(pt);
  newPlaces.push({
    type: "Feature",
    properties: {
      id: `research-vo-${o.local_body.toLowerCase().replace(/\s+/g, "-")}`,
      name: o.name,
      name_ml: o.name_ml || "",
      category: "government",
      subtype: "Village office (Revenue Dept.)",
      operator_type: "government",
      address: [o.address, o.landmark].filter(Boolean).join(", "),
      phone: o.phone,
      website: "",
      email: o.email || "",
      established: o.established || "",
      local_body: w ? w.properties.local_body : o.local_body,
      local_body_id: w ? w.properties.local_body_id : "",
      ward_no: w ? w.properties.ward_no : o.ward,
      ward_name: w ? w.properties.ward_name : "",
      notes: "",
      source: `Kerala Revenue Department — official village office portal (${o.source})`,
      source_date: today(),
      license: "Government of Kerala — official public contact data",
      verified: true,
    },
    geometry: { type: "Point", coordinates: [o.lon, o.lat] },
  });
}
log(`village offices: ${notes.village_offices.length - skipped.length}/${notes.village_offices.length} placed, ${skipped.length} skipped (see log)`);

/* ---- 2. police station (already has exact address; geocode it) ---- */
for (const p of notes.police) {
  const hit = await geocode(`${p.address}, Malappuram, Kerala, India`);
  if (!hit) { skipped.push({ name: p.name, reason: "no Nominatim hit", source: p.source }); continue; }
  const pt = turf.point([hit.lon, hit.lat]);
  if (!turf.booleanPointInPolygon(pt, constituency)) { skipped.push({ name: p.name, reason: "geocoded outside constituency" }); continue; }
  const w = wardFor(pt);
  newPlaces.push({
    type: "Feature",
    properties: {
      id: "research-tanur-police-station",
      name: p.name,
      category: "government",
      subtype: "Police station",
      operator_type: "government",
      address: p.address,
      phone: p.phone,
      website: "",
      email: p.email || "",
      local_body: w ? w.properties.local_body : "",
      local_body_id: w ? w.properties.local_body_id : "",
      ward_no: w ? w.properties.ward_no : "",
      ward_name: w ? w.properties.ward_name : "",
      position_confidence: "geocoded from official address (Kerala Police directory)",
      notes: "",
      source: `Kerala Police official directory (${p.source})`,
      source_date: today(),
      license: "Government of Kerala — official public contact data",
      verified: false,
    },
    geometry: { type: "Point", coordinates: [hit.lon, hit.lat] },
  });
}

/* ---- 3. Krishi Bhavans + health facilities (geocode by address/locality) */
async function addGeocoded(item, category, subtype, idPrefix, extra = {}) {
  const query = item.geocode_query || `${item.name}, ${item.address || ""}, Tanur, Malappuram, Kerala, India`;
  const hit = await geocode(query);
  if (!hit) { skipped.push({ name: item.name, reason: "no Nominatim hit", source: item.source }); return; }
  const pt = turf.point([hit.lon, hit.lat]);
  if (!turf.booleanPointInPolygon(pt, constituency)) { skipped.push({ name: item.name, reason: "geocoded outside constituency", nominatim: hit.display_name }); return; }
  const w = wardFor(pt);
  newPlaces.push({
    type: "Feature",
    properties: {
      id: `research-${idPrefix}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: item.name,
      category,
      subtype,
      operator_type: "government",
      address: item.address || "",
      phone: item.phone || "",
      local_body: w ? w.properties.local_body : "",
      local_body_id: w ? w.properties.local_body_id : "",
      ward_no: w ? w.properties.ward_no : "",
      ward_name: w ? w.properties.ward_name : "",
      position_confidence: "geocoded (locality-level), not a surveyed coordinate",
      notes: item.note || "",
      source: `Government of Kerala — ${item.source || "public directory"}`,
      source_date: today(),
      license: "official public data + OSM Nominatim geocoding",
      verified: false,
      ...extra,
    },
    geometry: { type: "Point", coordinates: [hit.lon, hit.lat] },
  });
}

for (const kb of notes.krishi_bhavans) await addGeocoded(kb, "government", "Krishi Bhavan (Agriculture Dept.)", "kb", { email: kb.email });
for (const h of notes.health_facilities) await addGeocoded(h, "health", h.type === "CHC" ? "Community Health Centre" : h.type === "FHC" ? "Family Health Centre" : "Primary Health Centre", "health");

writeJSON(CACHE_FILE, cache);

/* ---- 4. merge into places.geojson (skip if an identical id already exists) */
const places = readJSON(join(PROCESSED, "places.geojson"));
const existingIds = new Set(places.features.map((f) => f.properties.id));
const toAdd = newPlaces.filter((f) => !existingIds.has(f.properties.id));
const merged = fc([...places.features, ...toAdd]);
writeJSON(join(PROCESSED, "places.geojson"), merged);
log(`places.geojson: +${toAdd.length} researched records (village offices, police, Krishi Bhavans, health facilities) → ${merged.features.length} total`);

/* ---- 5. bridges: rename the ROB candidate + add the floating bridge ---- */
const bridges = readJSON(join(PROCESSED, "bridges.geojson"));
const alreadyRenamed = bridges.features.some((f) => f.properties.name === "Tanur–Theyyala Road ROB");
const robCandidate = alreadyRenamed
  ? null
  : bridges.features.find(
      (f) => !f.properties.named && Math.abs(f.geometry.coordinates[0] - 75.880102) < 0.001 && Math.abs(f.geometry.coordinates[1] - 10.980944) < 0.001
    );
if (alreadyRenamed) {
  log("Tanur–Theyyala Road ROB already present — skipping rename");
} else if (robCandidate) {
  robCandidate.properties.name = "Tanur–Theyyala Road ROB";
  robCandidate.properties.named = true;
  robCandidate.properties.road = "Tanur–Theyyala Road";
  robCandidate.properties.structure = "Road over rail bridge (ROB), Shoranur–Mangaluru line";
  robCandidate.properties.notes =
    "Identified by position (adjacent to Tanur railway station, on the Tanur–Theyyala road corridor) — cross-check against the official declaration before treating the name as final.";
  robCandidate.properties.source =
    "Position: OpenStreetMap. Name/existence: Malappuram district (NIC) ROB declaration, 03/01/2020, and Tanur Municipality progress update (Oct 2023).";
  robCandidate.properties.source_url = "https://malappuram.nic.in/en/document/tanur-town-theyyala-rob-declaration/";
  robCandidate.properties.verified = false;
  log("renamed the OSM bridge point nearest Tanur station to 'Tanur–Theyyala Road ROB' (position inferred, flagged unverified)");
} else {
  log("WARN: could not find the expected unnamed-bridge point near Tanur station to rename");
}

const floatingBridgeId = "research-thooval-theeram-floating-bridge";
if (!bridges.features.some((f) => f.properties.id === floatingBridgeId)) {
  const coord = [75.856389, 11.020556]; // 11°01'14"N 75°51'23"E — OSM node 4570963189
  const pt = turf.point(coord);
  const w = wardFor(pt);
  bridges.features.push({
    type: "Feature",
    properties: {
      id: floatingBridgeId,
      name: "Thooval Theeram Floating Bridge",
      named: true,
      road: "",
      structure: "Pedestrian floating bridge (~100 m), Ottumpuram / Thooval Theeram beach",
      local_body: w ? w.properties.local_body : "Tanur",
      local_body_id: w ? w.properties.local_body_id : "tanur",
      ward_no: w ? w.properties.ward_no : "",
      ward_name: w ? w.properties.ward_name : "",
      notes: "Kerala's first sea floating bridge. Inaugurated 23 April 2023 by Tourism Minister P. A. Mohammed Riyas.",
      source: "Onmanorama (25 Apr 2023); DT Next (24 Apr 2023); OSM node 4570963189",
      source_url: "https://www.onmanorama.com/travel/kerala/2023/04/25/malappuram-ottumpuram-thooval-theeram-beach-floating-bridge.html",
      source_date: today(),
      license: "News coverage + OpenStreetMap ODbL 1.0",
      verified: false,
    },
    geometry: { type: "Point", coordinates: coord },
  });
  log("added Thooval Theeram Floating Bridge (Ottumpuram beach)");
}
writeJSON(join(PROCESSED, "bridges.geojson"), bridges);

/* ---- 6. roads: attach the official name to a road we already have under an
   OSM transliteration variant. "Banglamkunnu–Ovungal Mini Bypass Road" is
   named in two official Malappuram district (NIC) documents (an R&R package
   order and an 11(1) erratum notification, both naming Cheriyamundam and
   Ponmundam villages) — it turns out to already be mapped, just under two
   spelling variants of its OSM name. We standardise the display name and
   keep the original OSM spelling for reference; geometry is untouched. ---- */
const roads = readJSON(join(PROCESSED, "roads.geojson"));
const OVUNGAL_IDS = [540617237, 945964833];
let renamedRoads = 0;
for (const f of roads.features) {
  if (OVUNGAL_IDS.includes(f.properties.osm_id)) {
    f.properties.name_osm_variant = f.properties.name;
    f.properties.name = "Banglamkunnu–Ovungal Mini Bypass Road";
    f.properties.source =
      "OpenStreetMap (geometry, way " + f.properties.osm_id + "); official name confirmed by two Malappuram district (NIC) documents naming this road";
    f.properties.source_url = "https://malappuram.nic.in/en/document/la-malappuram-tirur-taluk-cheriyamundam-ponmundam-villages-benglamkunnu-ovungal-mini-bypass-road-rr-package-order/";
    renamedRoads++;
  }
}
if (renamedRoads) {
  writeJSON(join(PROCESSED, "roads.geojson"), roads);
  log(`standardised the official name on ${renamedRoads} road segment(s): Banglamkunnu–Ovungal Mini Bypass Road`);
}

/* ---- 7. quality log ---- */
writeJSON(join(PROCESSED, "..", "metadata", "local_research_report.json"), {
  generated: new Date().toISOString(),
  added_places: toAdd.map((f) => f.properties.name),
  skipped: skipped,
}, true);
log(`skipped ${skipped.length} researched records that could not be placed with confidence (see data/metadata/local_research_report.json)`);
