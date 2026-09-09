// Shared helpers for the Tanur GIS data pipeline.
// All scripts are reproducible: raw downloads land in data/raw/, cleaned
// outputs in data/processed/. Raw files are never edited in place.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, "..", "..");
export const RAW = join(ROOT, "data", "raw");
export const PROCESSED = join(ROOT, "data", "processed");
export const METADATA = join(ROOT, "data", "metadata");
export const PUBLIC_DATA = join(ROOT, "public", "data");

for (const d of [RAW, PROCESSED, METADATA, PUBLIC_DATA]) mkdirSync(d, { recursive: true });

export const readJSON = (p) => JSON.parse(readFileSync(p, "utf8"));
export const writeJSON = (p, obj, pretty = false) =>
  writeFileSync(p, pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj));

export function log(...a) {
  console.log("[data]", ...a);
}

// The six Local Self Government Institutions that make up Tanur AC #44.
// `ksmart` = the LocalBody key used by wardmap.ksmart.live.
export const LOCAL_BODIES = [
  { id: "tanur",         ksmart: "Tanur",         name: "Tanur",         type: "municipality",   lsgi_code: "M10072", wikidata: "Q13112429" },
  { id: "ozhur",         ksmart: "Ozhur",         name: "Ozhur",         type: "grama_panchayat", lsgi_code: "G10067", wikidata: "Q13110838" },
  { id: "ponmundam",     ksmart: "Ponmundam",     name: "Ponmundam",     type: "grama_panchayat", lsgi_code: "G10065", wikidata: "Q13113494" },
  { id: "tanalur",       ksmart: "Tanalur",       name: "Thanaloor",     type: "grama_panchayat", lsgi_code: "G10069", wikidata: "Q13112439" },
  { id: "niramaruthoor", ksmart: "Niramaruthoor", name: "Niramaruthoor", type: "grama_panchayat", lsgi_code: "G10068", wikidata: "Q13112911" },
  { id: "cheriyamundam", ksmart: "Cheriyamundam", name: "Cheriyamundam", type: "grama_panchayat", lsgi_code: "G10066", wikidata: "Q13112039" },
];

export const CONSTITUENCY = {
  name: "Tanur",
  name_ml: "തനൂർ",
  number: 44,
  district: "Malappuram",
  taluk: "Tirur",
  parliamentary_constituency: "Malappuram",
};

// Approx bounding box of the constituency (from the ward data), used to scope
// Overpass queries. [south, west, north, east]
export const BBOX = [10.88, 75.84, 11.04, 75.99];

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// "CHEERAN KADAPPURAM" -> "Cheeran Kadappuram"
export function titleCase(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

export function round6(geo) {
  const r = (n) => Math.round(n * 1e6) / 1e6;
  const walk = (c) => (typeof c[0] === "number" ? [r(c[0]), r(c[1])] : c.map(walk));
  for (const f of geo.features) {
    if (f.geometry?.coordinates) f.geometry.coordinates = walk(f.geometry.coordinates);
  }
  return geo;
}

export function fc(features) {
  return { type: "FeatureCollection", features };
}

// Minimal Overpass client with mirror fallback + on-disk cache.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

export async function overpass(query, cacheKey) {
  const cachePath = cacheKey ? join(RAW, `overpass_${cacheKey}.json`) : null;
  if (cachePath && existsSync(cachePath)) {
    log(`overpass: using cached ${cacheKey}`);
    return readJSON(cachePath);
  }
  let lastErr;
  for (const url of OVERPASS_MIRRORS) {
    try {
      log(`overpass: querying ${url}`);
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "tanur-constituency-gis/0.1 (data pipeline; contact via project repo)",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (cachePath) writeJSON(cachePath, json);
      return json;
    } catch (e) {
      lastErr = e;
      log(`overpass mirror failed: ${e.message}`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}

export const today = () => new Date().toISOString().slice(0, 10);
