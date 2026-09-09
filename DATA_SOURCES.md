# DATA SOURCES

Every dataset used in this project, with provenance. Regenerate any layer with
`npm run data:<name>` (see `package.json`); the full pipeline is `npm run data:all`.

Raw downloads land in `data/raw/` (git-ignored). Cleaned outputs are in
`data/processed/`. Web copies (simplified) are in `public/data/`.

---

## 1. Wards — `public/data/wards.geojson`

| | |
|---|---|
| **Source organisation** | Delimitation Commission for Local Self Government Institutions, Government of Kerala |
| **Portal** | https://wardmap.ksmart.live/ (per–local-body GeoJSON, linked from `files/district_localbody_mapping.json`) |
| **Also packaged as** | https://github.com/Vonter/kerala-wards · https://github.com/osmkerala/kerala-wards-2024 |
| **Acquisition date** | 2026-09-09 |
| **Data date / version** | 2024 ward delimitation (finalised 12 Aug 2024; used for the 2025 LSG general election) |
| **Format** | GeoJSON (EPSG:4326), one file per local body |
| **Coverage** | The 6 local bodies of Tanur AC: Tanur, Ozhur, Ponmundam, Tanalur, Niramaruthoor, Cheriyamundam — 147 wards |
| **Fields kept** | `ward_no`, `ward_name`, `local_body`, `local_body_id`, `lsgd_type` |
| **Processing** | `data/scripts/01-wards.mjs` — download 6 files → normalise names (Title Case) → `mapshaper snap -clean` (repairs ~9/20 self-intersecting source rings) → merge |
| **Licence / usage** | Government of Kerala data. Attribute to the Delimitation Commission, Kerala. Explicit reuse terms not published — confirm before commercial redistribution. |
| **Confidence** | **High** — current statutory ward geometry |
| **Limitations** | Ward *names* are as recorded by field surveyors (English, block capitals); a few may be spelt inconsistently. Boundaries digitised in QField at roughly 1:5,000. |

## 2. Local bodies — `public/data/local_bodies.geojson`

| | |
|---|---|
| **Method** | Derived: `mapshaper -dissolve2` of the ward layer (§1) grouped by local body (`data/scripts/02-local-bodies.mjs`) |
| **Cross-reference** | https://github.com/opendatakerala/lsg-kerala-data (OSM-derived, ODbL) supplied the Malayalam names, LSGI codes and Wikidata IDs |
| **Coverage** | 1 municipality (Tanur) + 5 grama panchayats |
| **Confidence** | **High** (inherits the ward source); perfectly consistent with the ward layer |

## 3. Constituency boundary — `public/data/constituency.geojson` (+ `constituency_mask.geojson`)

| | |
|---|---|
| **Method** | Derived: `mapshaper -dissolve2` of the 6 local bodies (`data/scripts/03-constituency-boundary.mjs`) |
| **Rationale** | The Election Commission of India defines an Assembly Constituency as a set of complete Local Self Government Institutions, so the union of those bodies *is* the boundary |
| **Composition source** | Delimitation of Parliamentary and Assembly Constituencies Order, 2008 (Kerala) — component list taken from https://en.wikipedia.org/wiki/Tanur_Assembly_constituency (ECI-sourced) |
| **Constituency** | Tanur, No. 44, Malappuram district, Tirur taluk; ~82.5 km² |
| **Confidence** | **Medium-high** — geometry is exact given the LSGI list; the LSGI list itself is pending a cross-check against the original 2008 notification (see `DATA_QUALITY.md`) |
| **`constituency_mask.geojson`** | A world polygon with the constituency punched out, used to grey-out everything outside it on the map |

## 4. Roads — `public/data/roads.geojson`

| | |
|---|---|
| **Source organisation** | OpenStreetMap contributors |
| **Access** | Overpass API (`data/scripts/04-roads.mjs`), bounding box around the constituency |
| **Acquisition date** | 2026-09-09 |
| **Format** | GeoJSON LineString |
| **Coverage** | 1,605 segments within the constituency; 56 distinct named roads |
| **Fields** | `name`, `name_ml`, `named`, `category` (highway/major/connector/local/service/track/path), `ref`, `surface`, `oneway`, `start_point`, `end_point`, `local_body`, `ward_no`, `ward_name`, `osm_id` |
| **Processing** | fetch highways → clip to boundary → group segments by name → derive START/END from the nearest OSM place/junction node (or ward) → tag local body & ward |
| **Licence** | **ODbL 1.0** — © OpenStreetMap contributors. Attribution + share-alike. |
| **Confidence** | **High** for the classified/named network; **Medium** for the completeness of minor lanes and for name coverage (1,549 segments are unnamed → shown as "Unnamed Road", editable by an administrator) |
| **Enrichment (not yet applied)** | PMGSY "GeoSadak" National GIS (https://geosadak-pmgsy.nic.in/opendata · https://github.com/datameet/pmgsy-geosadak) can add the official road class and owning agency (NH/SH/MDR/ODR) |

## 5. Railway — `public/data/railway.geojson`

| | |
|---|---|
| **Source** | OpenStreetMap (Overpass) — `data/scripts/05-railway.mjs` |
| **Coverage** | Shoranur–Mangaluru line through the constituency + Tanur station |
| **Licence** | ODbL 1.0 |
| **Confidence** | **High** (trunk line is well mapped) |

## 6. Bridges — `public/data/bridges.geojson` — ⚠ SEED ONLY

| | |
|---|---|
| **Source** | OpenStreetMap (Overpass): road ways tagged `bridge=*` and `man_made=bridge` — `data/scripts/06-bridges-seed.mjs` |
| **Coverage** | 37 seed points; 5 carry a name |
| **Licence** | ODbL 1.0 |
| **Status** | **Deliberately incomplete.** No open, authoritative Kerala bridge inventory exists (Kerala PWD Bridge wing / KRFB data is not public). Administrators complete this layer with **+ Add Bridge**. |
| **Confidence** | Low for completeness; positions are the OSM bridge-way midpoints |
| **To improve** | Request the constituency bridge list from the PWD (Roads) Division, Tirur / the PWD GIS cell |

## 7. Important places — `public/data/places.geojson` — SEED

| | |
|---|---|
| **Source** | OpenStreetMap (Overpass): `amenity=school|college|hospital|clinic|doctors`, `healthcare=*`, `amenity=townhall|police|post_office|courthouse|fire_station`, `office=government` — `data/scripts/07-pois-seed.mjs` |
| **Coverage** | 188 named places (95 schools, 49 health, 44 government) inside the constituency |
| **Licence** | ODbL 1.0 |
| **Authoritative sources to verify against** | Schools → **Sametham / KITE** (`sametham.kite.kerala.gov.in`, filter *Assembly Constituency = Tanur*); Health → **DHS / Arogya Keralam** institution lists; Offices → **LSGD directory** |
| **Confidence** | Names/type **Medium-High**; exact coordinates **Medium**; all records `verified: false` until an administrator checks them |

## 8. Water bodies — `public/data/water.geojson`

| | |
|---|---|
| **Source** | OpenStreetMap (Overpass): `natural=water`, `water=*`, `landuse=reservoir`, `natural=wetland`, `waterway=river|stream|canal|drain` — `data/scripts/08-water.mjs` |
| **Coverage** | 248 features (rivers, backwaters, ponds, canals) |
| **Licence** | ODbL 1.0 |
| **Confidence** | **Medium** — coastal / backwater outlines vary in OSM currency |

## 9. Basemap (optional "Streets" layer)

| | |
|---|---|
| **Source** | OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`) — OpenMapTiles schema, OpenStreetMap data |
| **Licence** | Data © OpenStreetMap contributors (ODbL); OpenFreeMap tiles free to use |
| **Default** | Off. The app boots on a dependency-free plain ground so it works offline; the basemap is opt-in and self-heals to plain if the CDN is unreachable. |
| **Swappable** | `NEXT_PUBLIC_BASEMAP_STYLE_URL` — point at MapTiler / Stadia / a self-hosted Protomaps style without code changes |

---

## Not used (investigated — see `DATA_DISCOVERY_REPORT.md`)

- **KSDI / K-GIS** (`opensdi.kerala.gov.in`) — authoritative admin/transport layers, but bulk vector download is restricted to authorised users. Worth a formal data-sharing request from the MLA office.
- **Kerala PWD RIMS** — official road + bridge inventory, not public.
- **Datameet / geohacker Kerala boundaries** — superseded by the newer OSM-community and Delimitation Commission data.
