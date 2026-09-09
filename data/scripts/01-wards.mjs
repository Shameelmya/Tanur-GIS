// 01 — WARDS
// Source: Delimitation Commission, Kerala (2024 ward delimitation), served per
// local body at https://wardmap.ksmart.live/. Used for the 2025 LSG elections.
// We download only the six local bodies of Tanur AC (not the 242 MB all-Kerala file).
//
// Output: data/processed/wards.geojson

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import mapshaper from "mapshaper";
import {
  RAW, PROCESSED, LOCAL_BODIES, readJSON, writeJSON, fc, round6,
  slugify, titleCase, log, today,
} from "./lib.mjs";

const MAPPING_URL = "https://wardmap.ksmart.live/files/district_localbody_mapping.json";
const WARD_DIR = join(RAW, "ksmart_wards");
mkdirSync(WARD_DIR, { recursive: true });

async function download() {
  const mappingPath = join(RAW, "ksmart_district_localbody_mapping.json");
  if (!existsSync(mappingPath)) {
    log("fetching ksmart district/localbody mapping");
    const r = await fetch(MAPPING_URL);
    writeFileSync(mappingPath, await r.text());
  }
  const mapping = readJSON(mappingPath);
  const mala = mapping["Malappuram"] || [];

  for (const lb of LOCAL_BODIES) {
    const out = join(WARD_DIR, `${lb.ksmart}.json`);
    if (existsSync(out)) { log(`ward file cached: ${lb.ksmart}`); continue; }
    const entry = mala.find((e) => e.LocalBody === lb.ksmart);
    if (!entry) throw new Error(`ksmart mapping has no entry for ${lb.ksmart}`);
    const geojsonUrl = entry.HTMLPage.replace(/\.html$/, ".json");
    log(`downloading wards: ${lb.ksmart}  <-  ${geojsonUrl}`);
    const r = await fetch(geojsonUrl);
    if (!r.ok) throw new Error(`${lb.ksmart}: HTTP ${r.status}`);
    writeFileSync(out, await r.text());
    await new Promise((s) => setTimeout(s, 1500));
  }
}

async function build() {
  const features = [];
  for (const lb of LOCAL_BODIES) {
    const g = readJSON(join(WARD_DIR, `${lb.ksmart}.json`));
    const seen = new Set();
    for (const f of g.features) {
      if (!f.geometry) { log(`WARN ${lb.name}: ward with null geometry skipped`); continue; }
      const wardNo = Number(f.properties.Ward_No);
      const wardName = titleCase(f.properties.Ward_Name);
      if (seen.has(wardNo)) { log(`WARN ${lb.name}: duplicate ward no ${wardNo}`); }
      seen.add(wardNo);
      features.push({
        type: "Feature",
        properties: {
          id: `${lb.id}-w${wardNo}`,
          ward_no: wardNo,
          ward_name: wardName || "Unnamed Ward",
          ward_label: `Ward ${wardNo}${wardName ? ` – ${wardName}` : ""}`,
          local_body: lb.name,
          local_body_id: lb.id,
          lsgd_type: f.properties.Lsgd_Type || (lb.type === "municipality" ? "Municipality" : "Grama Panchayat"),
          source: "Delimitation Commission, Kerala — 2024 ward delimitation (wardmap.ksmart.live)",
          source_date: (f.properties.Created_Date || "2024").slice(0, 10),
          delimitation: "2024",
          acquired: today(),
        },
        geometry: f.geometry,
      });
    }
    log(`${lb.name}: ${seen.size} wards`);
  }
  features.sort((a, b) =>
    a.properties.local_body_id.localeCompare(b.properties.local_body_id) ||
    a.properties.ward_no - b.properties.ward_no
  );

  // Clean topology: the QGIS-digitised source rings contain self-intersections
  // (~9/20 wards fail an OGC validity check). snap + clean repairs them and
  // removes slivers/overlaps between adjacent wards. Boundaries may shift by
  // <1 m at shared edges; attributes are preserved. NOTE: we do NOT round
  // coordinates here — the dense rings would re-introduce self-intersections.
  const cleaned = await mapshaper.applyCommands(
    "-i in.geojson snap -clean -o out.geojson format=geojson",
    { "in.geojson": JSON.stringify(fc(features)) }
  );
  const cleanFc = JSON.parse(cleaned["out.geojson"]);
  const out = cleanFc.type === "FeatureCollection" ? cleanFc : fc(features);
  writeJSON(join(PROCESSED, "wards.geojson"), out);
  writeJSON(join(PROCESSED, "wards.geojson.meta.json"), {
    dataset: "wards",
    features: features.length,
    local_bodies: LOCAL_BODIES.length,
    source: "Delimitation Commission, Kerala (2024) via wardmap.ksmart.live",
    license: "Government of Kerala data — attribute to the Delimitation Commission; reuse terms to be confirmed",
    generated: new Date().toISOString(),
  }, true);
  log(`wrote data/processed/wards.geojson  (${features.length} wards)`);
}

await download();
await build();
