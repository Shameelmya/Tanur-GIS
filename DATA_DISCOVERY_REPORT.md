# TANUR CONSTITUENCY GIS — DATA DISCOVERY REPORT (PHASE 0)

**Prepared:** 2026-09-09
**Scope:** Tanur Assembly Constituency, Malappuram District, Kerala
**Status:** Research complete. No application code written yet. Awaiting your decisions before Phase 1.

---

## 0. EXECUTIVE SUMMARY

| Layer | Authoritative data exists? | Can we get GIS geometry now? | Recommended V1 approach |
|---|---|---|---|
| Constituency boundary | Yes (defined by ECI as a set of LSGIs) | Yes — derive by dissolving the 6 local-body polygons | **Auto-import** |
| Local bodies (6) | Yes | Yes — OSM-derived, community-packaged, ODbL | **Auto-import** |
| Wards | **Yes — official 2024 Delimitation Commission data** | Yes — packaged as GeoJSON from `wardmap.ksmart.live` | **Auto-import** (clip to 6 bodies) |
| Roads | Partial official (PWD/PMGSY) + strong OSM | Yes — OSM (named) + PMGSY (categorised, official) | **Auto-import**, admin edit names |
| Bridges | **No complete open dataset** | Partial — PMGSY cross-drainage works + sparse OSM | **Seed + manual "Add Bridge"** |
| Schools | Yes — Sametham / KITE (official) | Attributes yes; bulk export not open | **Filtered list + geolocate + manual** |
| Health facilities | Yes — DHS / Arogya Keralam (official, PDF) | Not as GIS | **Manual compile (major only)** |
| Govt / public offices | Directories only | No | **Manual curation (important only)** |
| Railway | Yes | Yes — OSM | **Auto-import** |
| Major junctions | No canonical list | Partial — OSM | **Seed + manual** |

**Bottom line:** We can build a genuinely data-driven map for V1. Boundary, local bodies, wards, roads and railway can be imported from real sources. Bridges, schools, health facilities and offices need a mix of partial import + the admin manual-add workflow you specified. **No layer needs to be faked.**

---

## 1. CONSTITUENCY DEFINITION & BOUNDARY

### 1.1 Identity (verified)
- **Name:** Tanur (തനൂർ) Assembly Constituency
- **Number:** 44
- **District:** Malappuram
- **Parliamentary constituency:** Malappuram
- **Taluk:** Tirur (all component LSGIs)
- **Registered electors (2026):** 172,324
- **Delimitation basis:** Delimitation of Parliamentary and Assembly Constituencies Order, 2008 (in force for 2011–2026 elections)
- **Source:** [Tanur Assembly constituency — Wikipedia](https://en.wikipedia.org/wiki/Tanur_Assembly_constituency) (citing Election Commission of India). Confidence: **High** for identity/number; **needs cross-check** against the ECI 2008 Delimitation notification PDF for the exact LSGI + ward composition.

### 1.2 How the boundary is legally defined
The ECI does **not** publish assembly-constituency polygons for Kerala directly. An AC is legally defined as **a named set of complete Local Self Government Institutions** (and, where an LSGI is split between two ACs, a named list of its wards). Therefore:

> **The authoritative Tanur AC boundary = the geometric union (dissolve) of its 6 component LSGI boundaries.**

This is more authoritative than any scraped AC polygon (e.g. Datameet), which are known to contain topology errors.

### 1.3 Component Local Self Government Institutions (to be verified against ECI 2008 notification)
| # | Name | Type | Taluk | Notes |
|---|---|---|---|---|
| 1 | **Tanur** | Municipality | Tirur | Coastal; constituency HQ |
| 2 | **Ozhur** | Grama Panchayat | Tirur | |
| 3 | **Ponmundam** | Grama Panchayat | Tirur | |
| 4 | **Thanaloor** (Thanalur / Tanalur) | Grama Panchayat | Tirur | Name spelling varies across sources |
| 5 | **Niramaruthur** | Grama Panchayat | Tirur | |
| 6 | **Cheriyamundam** | Grama Panchayat | Tirur | |

**Source:** [Tanur Assembly constituency — Wikipedia](https://en.wikipedia.org/wiki/Tanur_Assembly_constituency). Confidence: **Medium-High**. **Action:** confirm from the ECI 2008 Delimitation Order (Kerala) and the Kerala Legislative Assembly / CEO Kerala constituency profile before we freeze the boundary. Need to check whether any of these 6 LSGIs is *partially* in a neighbouring AC (Tirur / Tanalur / Vengara / Thavanur) — if so we need the ward-level split list.

---

## 2. LOCAL BODY BOUNDARIES

### 2.1 Recommended source — `opendatakerala/lsg-kerala-data`
- **What:** Boundary polygons for all 1,200 Kerala LSGIs (941 Grama Panchayats, 152 Block Panchayats, 14 District Panchayats, 87 Municipalities, 6 Corporations).
- **Release:** v1.1.0 (2024-11-08) — adds Wikidata IDs + corrections. v1.0.0 was 2024-11-01.
- **Formats:** GeoJSON, KML, Shapefile.
- **Derived from:** OpenStreetMap (`admin_level=8` relations), maintained by the OSM Kerala / Open Data Kerala community.
- **License:** **ODbL 1.0** (Open Database License) — attribution + share-alike. Fine for this project.
- **URL:** https://github.com/opendatakerala/lsg-kerala-data · [releases](https://github.com/opendatakerala/lsg-kerala-data/releases)
- **Confidence:** **High** for shape/topology (community-verified against official maps), **Medium** for exact edge precision (OSM boundaries are hand-digitised, ±10–30 m in places).

### 2.2 Authoritative alternative (gated) — KSDI / K-GIS
- **Kerala State Spatial Data Infrastructure (KSDI)** — `opensdi.kerala.gov.in` / `www.ksdi.kerala.gov.in`. 23 base layers incl. administrative boundaries.
- **Kerala GeoPortal (K-GIS)** — departmental portal.
- **Blocker:** *"Data downloads are only available for authorized users; contact KSDI admin for data download privileges."* WMS view may be public; bulk vector download is not.
- **Action for you:** an official request on MLA-office letterhead to **KSDI / Kerala State IT Mission / KSREC** for a data-sharing agreement would unlock the *authoritative* LSGI + ward + cadastral layers. This is the single highest-value credential/permission ask. See §12.

### 2.3 Not recommended as primary
- `geohacker/kerala`, Datameet maps — older (2011–2016 vintage), known errors. Keep only as a cross-check.

---

## 3. WARDS  — **GOOD NEWS: OFFICIAL GIS DATA EXISTS**

### 3.1 Official source — Delimitation Commission, Kerala
- **Portal:** `wardmap.ksmart.live` (Ward Delimitation, run by the LSGD Delimitation Commission with Information Kerala Mission / K-SMART).
- **Context:** Kerala carried out a full electoral-ward re-delimitation in **2024** (finalised 12 Aug 2024 after objections; total wards 21,900 → 23,612). This is the ward set used for the **2025 Local Body elections** and is the current legal ward geometry. It was digitised natively in GIS for the first time (QField + IKM).
- **Confidence:** **High** — this is the official, current ward boundary set.

### 3.2 Packaged, downloadable form — `Vonter/kerala-wards`
- **What:** A script (`fetch.sh`) that pulls every ward polygon from `wardmap.ksmart.live` and merges them into one file. Released as a static download.
- **Release:** `19-nov-2024`
  - `KL_Wards.geojson` — 242.5 MB (all Kerala)
  - `KL_Wards.fgb` — 135.9 MB (FlatGeobuf, faster in QGIS/ArcGIS)
- **URL:** https://github.com/Vonter/kerala-wards
- **Mirror / community:** `osmkerala/kerala-wards-2024` (same lineage).
- **License:** Source data is Government of Kerala (Delimitation Commission). Repo does not state an explicit license — **treat as government data, attribute to the Delimitation Commission; confirm reuse terms.** (Action item §12.)
- **Plan:** download once, **clip to our 6 LSGIs** → expect a few hundred KB. Verify attribute fields (ward number, ward name, LSGI name/code). Ward **names** may be blank/generic in the 2024 set (wards are legally identified by number) — the admin UI must allow entering local ward names.

### 3.3 Ward counts (approximate, to confirm from the clip)
Tanur Municipality: ~40+ wards. Each Grama Panchayat: ~16–23 wards. Total for the constituency likely ~140–160 wards.

---

## 4. ROADS

### 4.1 Primary — OpenStreetMap
- **Why:** Best *named* road coverage for this area; actively edited; the only source that reliably has local road **names** in English + Malayalam.
- **Access options:**
  - **Geofabrik Kerala extract** (`download.geofabrik.de/asia/india.html` → Kerala) — daily `.osm.pbf` + themed shapefiles. ~ODbL.
  - **Overpass API** — targeted query by bounding box / `admin` area for just the 6 LSGIs (preferred; small payload, always current).
- **Fields available:** geometry, `name`, `name:ml`, `highway` (category), `ref` (for NH/SH), `surface`, `oneway`, sometimes `maxspeed`.
- **License:** ODbL 1.0.
- **Confidence:** **High** for major roads & most village roads; **Medium** for the smallest lanes and for name completeness (many minor roads unnamed → shown as "Unnamed Road", admin can name).

### 4.2 Official categorised roads — PMGSY National GIS ("GeoSadak")
- **What:** Ministry of Rural Development national GIS. Despite the "rural" name it includes **NH, SH, MDR, Other District Roads, rural roads, railway tracks** and **cross-drainage works** (see Bridges).
- **Open data portal:** `https://geosadak-pmgsy.nic.in/opendata`
- **GitHub mirror (easier):** `datameet/pmgsy-geosadak` — "PMGSY National GIS - Open Data", per-state GIS files.
- **Value:** authoritative **road category + owning agency + official link/road IDs**, which OSM lacks. Use to enrich/classify OSM roads.
- **License:** Government of India open data (Government Open Data License – India). Confidence: **High** for classification; geometry sometimes coarser than OSM.

### 4.3 Kerala PWD (gated)
- Kerala PWD runs an internal **Road Information & Management System / GIS-based Road Information System** (NH, SH, MDR with condition data). Not openly downloadable.
- **Action for you:** request the Tanur-constituency road inventory from the **PWD (Roads) Division, Tirur / Malappuram** and/or **PWD GIS cell**. Would give official PWD road names, chainage, and maintenance responsibility. See §12.

### 4.4 KSDI transport layer — gated (see §2.2).

---

## 5. BRIDGES — **NO COMPLETE OPEN DATASET. MANUAL-ADD REQUIRED (as you anticipated).**

### 5.1 What exists
| Source | Coverage | Geometry | Names | Notes |
|---|---|---|---|---|
| **PMGSY GeoSadak "Cross Drainage Works"** (`datameet/pmgsy-geosadak`, geosadak opendata) | Bridges & culverts **on PMGSY road network only** | Point (lat/long) | Structure type + road, usually no proper name | Official GoI. Best available seed. Partial. |
| **OpenStreetMap** | `bridge=yes` on road ways; `man_made=bridge` areas; some `name` | Line/polygon | Mostly **unnamed** | Sparse. Supplementary. |
| Kerala PWD Bridge wing / KRFB / RBDCK | All major bridges | — | Yes | **Not open.** Request via PWD (§12). |
| Named notable bridges (Wikipedia / local knowledge) | A handful | — | Yes | e.g. **Chamravattom Regulator-cum-Bridge** on the Bharathappuzha (near Thanaloor/Ponmundam boundary — verify which side falls inside the AC). Padinjattumuri / Poorapuzha crossings, Tanur backwater bridges — confirm on the ground. |

### 5.2 Recommendation
1. **Seed** the bridge layer from PMGSY cross-drainage points clipped to the 6 LSGIs + any OSM `bridge` ways with a `name`.
2. Mark every seeded record `source = "PMGSY GeoSadak" / "OSM"` and `verified = false`.
3. Ship the **`+ Add Bridge`** admin tool (click map → point marker → name, road, LSGI, ward, notes, optional photo) as a first-class V1 feature. This is where the MLA's office fills the real gaps.
4. Do **not** invent any bridge.

---

## 6. SCHOOLS  (keep limited — HS / HSS / VHSS + notable others only)

### 6.1 Official source — Sametham / KITE
- **Portal:** `sametham.kite.kerala.gov.in` — Kerala School Data Bank, run by KITE (Kerala Infrastructure & Technology for Education), Government of Kerala.
- **Coverage:** 15,436 schools statewide; 23 basic + 51 infrastructure fields each; includes **location**, management type, LSGI, and — critically — an **"Assembly Constituency" filter** in Advanced Search.
- **How we'll use it:** filter by Assembly Constituency = **Tanur** → get the authoritative list of schools with their sub-district / LSGI / category. This gives us the *names and classification*; precise coordinates may need to be taken from the portal's map view or cross-referenced with OSM.
- **Blocker:** no documented bulk download or public API; automated scraping terms unclear. Plan: pull the **filtered list only** (small, ~a few hundred schools; then narrow to HS/HSS/VHSS + a few landmark LP/UP schools ≈ 40–70 records) and record `source = "Sametham/KITE"`.
- **License / permission:** data is public-facing government data; **confirm acceptable-use** for republishing on our map. See §12.
- **Confidence:** **High** for names/type/LSGI; **Medium** for exact point location.

### 6.2 Supplementary
- OSM `amenity=school` (has some coordinates + names, incomplete).
- DISE / UDISE+ (`udiseplus.gov.in`) — has school directory with codes; export gated.

---

## 7. HEALTH FACILITIES (major only)

### 7.1 Sources
- **Directorate of Health Services / Arogya Keralam** (`arogyakeralam.gov.in`, `dhs.kerala.gov.in`) — official district-wise lists of **Sub-Centres, PHCs, CHCs, Taluk / District Hospitals**. Published as **PDF**, not GIS.
- **Ecostat Kerala** publication #106 — "DHS list of institutions" (PDF).
- **State Health Agency** public-institution list (PDF).
- **OSM** `amenity=hospital|clinic|doctors` — partial, some names.
- `data.gov.in` / NHM facility datasets — variable quality.

### 7.2 Recommendation
Manually compile the **major** facilities physically inside the 6 LSGIs (likely: 1 Govt hospital / CHC per panchayat cluster, Tanur area FHC/CHC, plus any Taluk-level facility, and 2–4 significant private hospitals if the MLA wants them). Geolocate each from the facility address + OSM/field check. `source = "DHS Kerala list, <date>"`, `verified = false` until field-checked. Do not import a giant list of sub-centres — keep it to constituency-significant infrastructure.

---

## 8. GOVERNMENT / PUBLIC OFFICES (important only)

No GIS dataset. Curate manually (~15–30 points):
- Municipal office (Tanur) + 5 Grama Panchayat offices
- Village offices (Revenue) + Tirur Taluk office
- Police stations (Tanur, Parappanangadi area)
- KSEB section offices, Kerala Water Authority sub-division
- Major post offices, Krishi Bhavan, PHC/CHC (cross-listed with §7)
- Fisheries office (coastal), Harbour (Tanur / Kadalundi)
Sources: LSGD directory (`lsgkerala.gov.in`), department websites, OSM `office=government`, field verification.

---

## 9. RAILWAY

- **Line:** Shoranur–Mangaluru section (Southern Railway).
- **Stations in/near constituency:** **Tanur** (inside), **Parappanangadi** (just north), **Trikkandiyur / Tirur** (just south). Confirm which lie inside the 6 LSGIs.
- **Source:** OpenStreetMap `railway=rail` + `railway=station` (well-mapped for this trunk line); Indian Railways public data. License ODbL. Confidence: **High**.

---

## 10. MAJOR JUNCTIONS

No canonical dataset. Seed from OSM (named junction nodes, `highway` + `name`, e.g. "Tanur Junction", "Devadar", "Ottumpuram") and let admin add/curate. Keep to genuinely notable junctions.

---

## 11. BASEMAP

| Option | Cost | Type | Notes |
|---|---|---|---|
| **OpenFreeMap** (`openfreemap.org`) | Free, no key, self-hostable | Vector (MapLibre) | Recommended for prototype — OSM data, liberal use |
| **Protomaps** (PMTiles) | Free (self-host a single file) | Vector | Good offline / Vercel-friendly option |
| OSM raster tiles (`tile.openstreetmap.org`) | Free | Raster | Heavy-use policy forbids production app use — dev only |
| MapTiler / Stadia / Mapbox | Free tier + paid | Vector | Add later behind an env var for a licensed look |

**Do NOT** use Google Maps/Earth tiles or imagery as assets (licensing). Architecture will keep the basemap provider swappable via `NEXT_PUBLIC_BASEMAP_STYLE_URL`.

---

## 12. WHAT I NEED FROM YOU (permissions / credentials / decisions)

### Decisions
1. **Ward name policy** — 2024 delimitation wards are legally numbered; official English names may be missing. OK to ship with "Ward 1, Ward 2…" and let admins add local names?
2. **Schools scope** — confine V1 to HS / HSS / VHSS + a handful of landmark schools (~40–70 points)? Or include all LP/UP too (~300+)?
3. **Private hospitals** — include significant private hospitals, or government facilities only?
4. **Large ward file** — OK for me to download the 242 MB Kerala ward GeoJSON once (into `data/raw/`, git-ignored) to clip our subset? It won't be committed.
5. **Basemap** — go with OpenFreeMap for the prototype? (default: yes)

### Credentials / accounts (needed later, not now)
6. **Firebase** — a Firebase project (Auth + Firestore). I'll need the web config + a service-account key for admin scripts. I'll provide `.env.example`; you create the project.
7. **Vercel** — account for deployment (Phase 6).

### Optional but high-value (official data access — you or the MLA office)
8. **KSDI / Kerala State IT Mission / KSREC** data-sharing request — unlocks authoritative LSGI, ward, land-use, cadastral layers.
9. **Kerala PWD (Roads Division, Tirur + PWD GIS cell)** — official road inventory + **bridge list** for the constituency. This is the only realistic way to get a real bridge dataset.
10. **KITE / Sametham** — confirmation that the school data may be reproduced on this map.

If (8)–(10) are slow or unavailable, **V1 still proceeds** on the open sources above + manual-add tooling.

---

## 13. RECOMMENDED V1 DATA PLAN

| Layer | V1 source | Import method | Editable in app |
|---|---|---|---|
| Constituency boundary | Dissolve of 6 LSGI polygons | Script (Phase 1) | No (admin re-runs script) |
| Local bodies | `opendatakerala/lsg-kerala-data` v1.1.0 | Script: fetch → filter 6 → simplify | Metadata only |
| Wards | `Vonter/kerala-wards` (Delimitation Commission 2024) | Script: download → clip to 6 → verify attrs | Name + notes |
| Roads | OSM (Overpass, 6-LSGI area) + PMGSY class enrichment | Script: fetch → clip → normalise names → tag `unnamed` | Full (name, start, end, LSGI, ward, notes) + audit trail |
| Railway | OSM | Script | Metadata only |
| Bridges | PMGSY cross-drainage + named OSM bridges (seed) | Script (seed) + **admin Add Bridge** | Full + add/archive |
| Schools | Sametham (Tanur AC filter, HS/HSS/VHSS) + OSM coords | Semi-manual → JSON seed + **admin Add** | Full + add/archive |
| Health facilities | DHS list (major) + geolocate | Manual JSON seed + **admin Add** | Full + add/archive |
| Govt offices | Manual curation | Manual JSON seed + **admin Add** | Full + add/archive |
| Major junctions | OSM (named) seed | Script seed + **admin Add** | Full + add/archive |

**Geometry** → static GeoJSON / vector assets in the repo (`data/processed/`), served to MapLibre.
**Editable metadata + audit log** → Firebase Firestore, keyed by feature ID, merged onto the geometry at load.

---

## 14. DATA QUALITY / RISK FLAGS (carried into `DATA_QUALITY.md` in Phase 1)

- [ ] LSGI composition of Tanur AC not yet confirmed against the ECI 2008 Delimitation Order (using Wikipedia currently).
- [ ] Need to confirm no component LSGI is split with a neighbouring AC (would require ward-level split list).
- [ ] LSGI boundary precision is OSM-grade (hand-digitised), not survey-grade.
- [ ] Ward polygons: names likely missing; share/reuse license not explicitly stated.
- [ ] Many minor roads will have no name → "Unnamed Road".
- [ ] No authoritative bridge inventory — bridge layer will be incomplete until field survey / PWD data.
- [ ] School coordinates approximate until verified.
- [ ] Health facility list limited to "major" by design — not a complete health directory.
- [ ] Chamravattom bridge and other river crossings: need to confirm which fall inside the AC.

---

## 15. SOURCES

- [Tanur Assembly constituency — Wikipedia](https://en.wikipedia.org/wiki/Tanur_Assembly_constituency)
- [Tanur Municipality (LSGD)](https://tanurmunicipality.lsgkerala.gov.in/)
- [Kerala State Spatial Data Infrastructure (KSDI)](https://opensdi.kerala.gov.in/) · [Kerala GeoPortal](http://www.ksdi.kerala.gov.in/ksdi/) · [Kerala State IT Mission — KSDI](https://itmission.kerala.gov.in/projects/kerala-state-spatial-data-infrastructure)
- [KSREC — Kerala Spatial Database](http://www.ksrec.kerala.gov.in/frmPrjKSDB.aspx)
- [opendatakerala/lsg-kerala-data (GitHub)](https://github.com/opendatakerala/lsg-kerala-data) · [releases](https://github.com/opendatakerala/lsg-kerala-data/releases)
- [OpenDataKerala](https://opendatakerala.org/) · [OpenStreetMap Kerala](https://kerala.openstreetmap.in/)
- [Delimitation Commission, LSGD Kerala](https://delimitation.lsgkerala.gov.in/) · [Ward Mapping — wardmap.ksmart.live](https://wardmap.ksmart.live/files/finalblock.html)
- [Vonter/kerala-wards (GitHub)](https://github.com/Vonter/kerala-wards) · [osmkerala](https://github.com/osmkerala)
- [Geofabrik — India / Kerala OSM extracts](https://download.geofabrik.de/asia/india.html)
- [PMGSY GeoSadak Open Data](https://geosadak-pmgsy.nic.in/opendata) · [datameet/pmgsy-geosadak (GitHub)](https://github.com/datameet/pmgsy-geosadak)
- [Ministry of Rural Development — GIS Data for PMGSY (press release)](https://rural.nic.in/en/press-release/rural-connectivity-gis-data-pradhan-mantri-gram-sadak-yojana-pmgsy)
- [Sametham — Kerala School Data Bank (KITE)](https://sametham.kite.kerala.gov.in/) · [KITE](https://kite.kerala.gov.in/)
- [Arogya Keralam — Malappuram sub-centre list (PDF)](https://arogyakeralam.gov.in/wp-content/uploads/2020/04/MLSP-sub-centre-list-malappuram.pdf) · [Ecostat Kerala — DHS institutions list (PDF)](https://www.ecostat.kerala.gov.in/storage/publications/106.pdf)
- [List of government hospitals in Kerala — Wikipedia](https://en.wikipedia.org/wiki/List_of_government_hospitals_in_Kerala)
- [Datameet — Community Created Maps of India](https://projects.datameet.org/maps/) · [geohacker/kerala (GitHub)](https://github.com/geohacker/kerala)
- [OSM Wiki — Kerala government GIS initiatives](https://wiki.openstreetmap.org/wiki/Kerala/Kerala_government_GIS_initiatives) · [Local Bodies in Kerala](https://wiki.openstreetmap.org/wiki/Local_Bodies_in_Kerala)
- [OpenFreeMap](https://openfreemap.org/) · [Protomaps](https://protomaps.com/)
- [2025 Kerala local elections — Wikipedia](https://en.wikipedia.org/wiki/2025_Kerala_local_elections)
