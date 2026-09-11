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

## 6. Bridges — `public/data/bridges.geojson` — ⚠ MOSTLY SEED

| | |
|---|---|
| **Source** | OpenStreetMap (Overpass): road ways tagged `bridge=*` and `man_made=bridge` — `data/scripts/06-bridges-seed.mjs`. Plus two researched additions (§6a). |
| **Coverage** | 38 points; 7 carry a name |
| **Licence** | ODbL 1.0 for the OSM points |
| **Status** | **Deliberately incomplete.** No open, authoritative Kerala bridge inventory exists (Kerala PWD Bridge wing / KRFB data is not public). Administrators complete this layer with **+ Add Bridge**. |
| **Confidence** | Low for completeness; OSM positions are bridge-way midpoints |
| **To improve** | Request the constituency bridge list from the PWD (Roads) Division, Tirur / the PWD GIS cell |

### 6a. Two researched named bridges — `data/scripts/10-local-research.mjs`

| Bridge | Source | Confidence |
|---|---|---|
| **Tanur–Theyyala Road ROB** (railway over-bridge) | [Malappuram district (NIC) official ROB declaration, 03/01/2020](https://malappuram.nic.in/en/document/tanur-town-theyyala-rob-declaration/); [Tanur Municipality progress video, Oct 2023](https://www.facebook.com/TanurMalappuram/videos/tanur-theyyala-road-railway-over-bridge-rob-work-in-progress-30-10-23/7005682076163329/) | Name/existence: high. Position: **inferred** — attached to the nearest existing unnamed OSM bridge point (beside Tanur station); the declaration document itself carries no coordinates. |
| **Thooval Theeram Floating Bridge** (Ottumpuram beach) | [Onmanorama, 25 Apr 2023](https://www.onmanorama.com/travel/kerala/2023/04/25/malappuram-ottumpuram-thooval-theeram-beach-floating-bridge.html); [DT Next, 24 Apr 2023](https://www.dtnext.in/videos/2023/04/24/floating-bridge-inaugurated-at-tanur); position from [OSM node 4570963189](https://www.openstreetmap.org/node/4570963189) | High — a real, newsworthy ~100 m pedestrian floating bridge, inaugurated 23 Apr 2023. Not a road bridge. |

## 7. Important places — `public/data/places.geojson` — MIXED (OSM seed + official records)

| | |
|---|---|
| **OSM seed** | `amenity=school|college|hospital|clinic|doctors`, `healthcare=*`, `amenity=townhall|police|post_office|courthouse|fire_station`, `office=government` — `data/scripts/07-pois-seed.mjs` (→ `places_osm_seed.geojson`, 188 features) |
| **Coverage** | 196 places total inside the constituency |
| **Licence** | ODbL 1.0 for OSM-sourced records |

### 7a. Schools — official (73 of 196 places) — `data/scripts/09-schools-official.mjs`

| | |
|---|---|
| **Source** | **Sametham — Kerala School Data Bank, KITE**, Government of Kerala. Advanced Search, filtered `Assembly Constituency = Tanur`. |
| **URL** | https://sametham.kite.kerala.gov.in/search/advanced_search_v2 |
| **Acquired** | 2026-09-11. Portal's own "data updated" date: 27 Jun 2026. |
| **Coverage** | **All 73 schools** in the constituency — school code, name, local body, management (30 Government / 31 Aided / 12 Unaided-Recognised), class range, student count, phone. Raw capture: `data/raw/sametham_tanur_schools_raw.txt`. |
| **Position** | Sametham publishes no coordinates. **12 of the 73** were placed by geocoding the school's locality name via OSM Nominatim, bounded to the constituency and checked for LP/UP/HS level consistency (an earlier attempt to fuzzy-match official names directly against OSM school points produced wrong pairings — e.g. an aided LP school matched to an unrelated Government Higher Secondary School in the same locality — and was discarded; see the "level mismatch" rejections logged in `data/metadata/schools_match_report.json`). **61 remain un-mapped** rather than guessed. |
| **Licence** | Official Government of Kerala public data (identity/attributes); OSM Nominatim ODbL 1.0 (position) |
| **Confidence** | Identity/attributes: **high** (authoritative). Position: **medium** for the 12 placed (locality-level, not the surveyed building), **none** for the other 61. |

### 7b. Government offices & health facilities — researched (7 of 196 places) — `data/scripts/10-local-research.mjs`

| | |
|---|---|
| **Village offices (6, all placed)** | Kerala Revenue Department official portal, one page per office, including the site's own embedded map pin — https://landrevenue.kerala.gov.in/core/Office_websites/ (`contactus.php` + `locateus.php`, per-office `nm=` codes). Name, address, phone, email, ward, establishment date, and coordinate all from this official source. |
| **Tanur Police Station** | https://ps.keralapolice.gov.in/tanur-ps/contacts — official address, geocoded to it. |
| **Tanur CHC** | Digitalkeralam / Quickerala listings for address + phone; geocoded to its own published road, "Hospital Road, Tanur". |
| **Not placed this pass** | Krishi Bhavan Tanur/Ozhur/Ponmundam (phone + email confirmed via `keralaagriculture.gov.in`, but not geocodable); PHC Ponmundam, PHC Cheriyamundam, PHC Ozhur, PHC Niramaruthur, FHC Tanalur (names/partial addresses confirmed, not geocodable). Real, named, documented in `data/raw/offices_health_research_notes.json` — awaiting an administrator to place them via **+ Add Place**. |
| **Confidence** | Village offices: **high**. Police/CHC: **medium** (official address, geocoded). Un-placed records: identity high, position none (by design). |

**Authoritative sources still to verify the OSM-seed remainder against:** Health → **DHS / Arogya Keralam** institution lists; Offices → **LSGD directory**.

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
