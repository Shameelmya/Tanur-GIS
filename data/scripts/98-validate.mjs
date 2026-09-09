// 98 — VALIDATE
// Geometry + attribute sanity checks across all processed datasets.
// Writes data/metadata/quality.json (consumed by docs/DATA_QUALITY.md notes).

import { join } from "node:path";
import { readdirSync } from "node:fs";
import * as turf from "@turf/turf";
import { PROCESSED, readJSON, writeJSON, log } from "./lib.mjs";

const report = { generated: new Date().toISOString(), datasets: {}, issues: [] };

for (const file of readdirSync(PROCESSED)) {
  if (!file.endsWith(".geojson")) continue;
  const g = readJSON(join(PROCESSED, file));
  const d = {
    features: g.features.length,
    geometryTypes: {},
    nullGeometry: 0,
    emptyName: 0,
    unverified: 0,
    selfIntersections: 0,
  };
  for (const f of g.features) {
    if (!f.geometry) { d.nullGeometry++; report.issues.push(`${file}: null geometry`); continue; }
    d.geometryTypes[f.geometry.type] = (d.geometryTypes[f.geometry.type] || 0) + 1;
    const p = f.properties || {};
    if (p.verified === false) d.unverified++;
    if (p.name && /^Unnamed |Unknown/i.test(p.name)) d.emptyName++;
    if (f.geometry.type === "Polygon") {
      try {
        const k = turf.kinks(f);
        if (k.features.length) d.selfIntersections++;
      } catch { /* ignore */ }
    }
  }
  report.datasets[file.replace(".geojson", "")] = d;
  log(`${file.padEnd(24)} ${d.features} features  ${JSON.stringify(d.geometryTypes)}${d.selfIntersections ? `  ⚠ ${d.selfIntersections} self-intersecting` : ""}`);
}

// Topology check: every ward's local body must exist in local_bodies
const wards = readJSON(join(PROCESSED, "wards.geojson"));
const lbs = new Set(readJSON(join(PROCESSED, "local_bodies.geojson")).features.map((f) => f.properties.id));
for (const w of wards.features) {
  if (!lbs.has(w.properties.local_body_id)) {
    report.issues.push(`ward ${w.properties.id}: local_body_id ${w.properties.local_body_id} not in local_bodies`);
  }
}

writeJSON(join(PROCESSED, "..", "metadata", "quality.json"), report, true);
log(`validation complete — ${report.issues.length} issue(s)`);
if (report.issues.length) report.issues.forEach((i) => log("  •", i));
