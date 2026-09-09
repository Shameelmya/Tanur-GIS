// 02 — LOCAL BODIES
// Derived by dissolving the official ward polygons (01-wards) per local body.
// This keeps the local-body boundary perfectly consistent with the ward layer
// and inherits the authority of the Delimitation Commission source.
// Malayalam names / LSGI codes / Wikidata IDs are attached from LOCAL_BODIES.
//
// Output: data/processed/local_bodies.geojson

import { join } from "node:path";
import mapshaper from "mapshaper";
import {
  PROCESSED, LOCAL_BODIES, readJSON, writeJSON, fc, round6, log, today,
} from "./lib.mjs";

const NAME_ML = {
  tanur: "താനൂർ", ozhur: "ഒഴൂർ", ponmundam: "പൊന്മുണ്ടം",
  tanalur: "താനാളൂർ", niramaruthoor: "നിറമരുതൂർ", cheriyamundam: "ചെറിയമുണ്ടം",
};

const wards = readJSON(join(PROCESSED, "wards.geojson"));

const cmd =
  "-i wards.geojson " +
  "-dissolve2 local_body_id copy-fields=local_body,lsgd_type " +
  "-clean " +
  "-o out.geojson format=geojson";

const result = await mapshaper.applyCommands(cmd, {
  "wards.geojson": JSON.stringify(wards),
});
const dissolved = JSON.parse(result["out.geojson"]);

const wardCounts = {};
for (const f of wards.features) {
  wardCounts[f.properties.local_body_id] = (wardCounts[f.properties.local_body_id] || 0) + 1;
}

const features = LOCAL_BODIES.map((lb) => {
  const geomFeature = dissolved.features.find((f) => f.properties.local_body_id === lb.id);
  if (!geomFeature) throw new Error(`dissolve produced no geometry for ${lb.id}`);
  return {
    type: "Feature",
    properties: {
      id: lb.id,
      local_body_id: lb.id,
      name: lb.name,
      name_ml: NAME_ML[lb.id] || "",
      type: lb.type,
      lsgd_type: lb.type === "municipality" ? "Municipality" : "Grama Panchayat",
      lsgi_code: lb.lsgi_code,
      wikidata: lb.wikidata,
      ward_count: wardCounts[lb.id] || 0,
      taluk: "Tirur",
      district: "Malappuram",
      source:
        "Derived by dissolving 2024 Delimitation Commission ward polygons (wardmap.ksmart.live). " +
        "Cross-reference: opendatakerala/lsg-kerala-data (OSM/ODbL).",
      acquired: today(),
    },
    geometry: geomFeature.geometry,
  };
});

writeJSON(join(PROCESSED, "local_bodies.geojson"), fc(features));
writeJSON(join(PROCESSED, "local_bodies.geojson.meta.json"), {
  dataset: "local_bodies",
  features: features.length,
  method: "dissolve2 of processed/wards.geojson grouped by local body",
  generated: new Date().toISOString(),
}, true);

log(`wrote data/processed/local_bodies.geojson  (${features.length} local bodies)`);
for (const f of features) log(`  ${f.properties.name.padEnd(16)} ${f.properties.ward_count} wards`);
