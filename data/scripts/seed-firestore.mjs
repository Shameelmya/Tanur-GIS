// Optional: seed the editable layers (roads / bridges / places) into Firestore
// so their metadata is queryable server-side. Geometry stays in the static
// GeoJSON; only lightweight metadata + IDs are written here.
//
// Usage:
//   1. Put a Firebase service-account key at ./serviceAccountKey.json
//      (or set FIREBASE_SERVICE_ACCOUNT_KEY_PATH)
//   2. npm run seed:firestore
//
// Safe to re-run: it uses set() with merge and never deletes.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ROOT, PROCESSED, log } from "./lib.mjs";

const keyPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH || join(ROOT, "serviceAccountKey.json");

if (!existsSync(keyPath)) {
  console.error(`Service-account key not found at ${keyPath}. See README "Firebase setup".`);
  process.exit(1);
}

const { initializeApp, cert } = await import("firebase-admin/app");
const { getFirestore } = await import("firebase-admin/firestore");

initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) });
const db = getFirestore();

const LAYERS = ["roads", "bridges", "places"];
const META_FIELDS = [
  "name", "name_ml", "named", "category", "subtype", "ref",
  "start_point", "end_point", "road", "structure",
  "local_body", "local_body_id", "ward_no", "ward_name",
  "operator_type", "address", "phone", "website",
  "source", "license", "osm_id", "verified",
];

for (const layer of LAYERS) {
  const gj = JSON.parse(readFileSync(join(PROCESSED, `${layer}.geojson`), "utf8"));
  let batch = db.batch();
  let n = 0;
  let total = 0;
  for (const f of gj.features) {
    const id = String(f.properties.id);
    if (!id) continue;
    const doc = { featureId: id, layer, manualEntry: false, seededAt: Date.now() };
    for (const k of META_FIELDS) {
      if (f.properties[k] !== undefined && f.properties[k] !== "") doc[k] = f.properties[k];
    }
    batch.set(db.collection(layer).doc(id), doc, { merge: true });
    if (++n === 400) {
      await batch.commit();
      total += n;
      n = 0;
      batch = db.batch();
    }
  }
  if (n) {
    await batch.commit();
    total += n;
  }
  log(`seeded ${total} docs into "${layer}"`);
}

log("done");
process.exit(0);
