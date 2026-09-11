# DATA QUALITY REPORT

Generated against the pipeline output of 2026-09-11. Machine checks:
`npm run data:validate` → `data/metadata/quality.json` (0 topology errors).

Uncertainty is never hidden. Anything below marked ⚠ should be treated as
provisional until verified in the field or against an authoritative source.

---

## What's authoritative now (2026-09-11 research pass)

| Layer | Source | Confidence |
|---|---|---|
| **73 schools** (all of them) | **Sametham / KITE**, official Assembly-Constituency filter — name, code, management, class range, phone for every one | **High** (identity/attributes) |
| 12 of those 73, mapped | Position = OSM Nominatim geocode of the school locality, constrained to the constituency and cross-checked for level (LP/UP/HS) consistency | Medium (locality-level, not surveyed) |
| 6 village offices | **Kerala Revenue Department** official portal (`landrevenue.kerala.gov.in`), including the site's own embedded coordinate | High |
| Tanur Police Station | Kerala Police official directory address, geocoded | Medium |
| Tanur CHC | Digitalkeralam/Quickerala listings, geocoded to its own published road ("Hospital Road, Tanur") | Medium |
| Tanur–Theyyala Road ROB | Malappuram district (NIC) official ROB declaration (03/01/2020) — name attached to the existing OSM bridge point beside Tanur station | Medium (position inferred by proximity, not from the declaration document itself, which carries no coordinates) |
| Thooval Theeram Floating Bridge | News coverage (Onmanorama, DT Next, Apr 2023) + OSM reference node | High (existence/name), OSM-sourced position |

See `data/raw/sametham_tanur_schools_raw.txt`, `data/raw/offices_health_research_notes.json`,
and `data/metadata/local_research_report.json` / `schools_match_report.json` for full detail
and every source URL.

## Missing datasets

| Layer | Status | Mitigation |
|---|---|---|
| **Bridge inventory** | ⚠ Still no authoritative open source for the full list. 38 seed points (7 named): 5 from OSM, 1 renamed from research (ROB), 1 newly added (floating bridge). | `+ Add Bridge` admin tool; request PWD (Roads) Division, Tirur bridge list |
| **Official road class / owning agency** | Not applied. OSM `highway` tag used as a proxy category. | Enrich from PMGSY GeoSadak (`datameet/pmgsy-geosadak`) |
| **61 of 73 official schools** | Named/attributed by Sametham but **not placed on the map** — Nominatim could not resolve a confident, level-consistent position. Full list of names/codes in `data/metadata/schools_match_report.json` → `not_placed`. | Administrator places them with the existing point on the map (drag-to-correct once configured) or **+ Add Place** |
| **Krishi Bhavan Tanur / Ozhur / Ponmundam** | Real offices (phone + email confirmed from `keralaagriculture.gov.in`), **not geocodable** — not indexed in OSM/Nominatim under that name. | Administrator adds via **+ Add Place** once the building location is known |
| **5 of 6 researched health facilities** (Ponmundam PHC, Cheriyamundam PHC, Ozhur PHC, Niramaruthur PHC, Tanalur FHC) | Real, named, with partial addresses — **not geocodable** with confidence. | Administrator adds via **+ Add Place** |
| **KSDI / K-GIS survey-grade boundaries** | Not obtained (download restricted). | Formal data-sharing request from the MLA office |
| **Map label fonts offline** | Glyphs are fetched from OpenFreeMap; with no internet, text labels don't render (shapes still do). | Self-host a glyph set if fully-offline use is required |

## Roads confirmed real by official sources but **not yet drawn on the map**

These are **not fabricated** — each is documented by a Kerala PWD notification,
a district (NIC) land-acquisition order, or a government tender record — but we
have no coordinate geometry for them, and the rule for this project is to never
invent a road's path. An administrator with local knowledge should trace each
with **+ Add Road**; the citation below is the starting reference.

| Road | Evidence | Source |
|---|---|---|
| **Olappeedika – Kunnumpuram – Tanur Road** | Kerala PWD road-length notification (6.000 km) | keralapwd.gov.in notification PDF |
| **Thanalur–Pandimuttam Road** (also referenced as "Pandimuttam–Ozhur Road") | Government tender: BC surfacing, km 0.000–4.200, Tanur LAC | tender247.com government tender result |
| ~~Banglamkunnu–Ovungal Mini Bypass Road~~ | **Found — already on the map.** It was present all along under an OSM transliteration variant ("Bangalavukunbu-Ovungal Road" / "banglavukkunnu-ovungal road", 2 segments); this pass standardised the display name to the official one and cited both government documents on the record. | malappuram.nic.in (R&R package order + 11(1) erratum notification) |
| **Theyyala–Devadar Bypass** | Referenced by name in earlier local searches; **not independently re-confirmed** this pass — treat as unverified until a document is found | — |
| **Moolakkal–Unniyalungal Road** | Moolakkal is a confirmed real locality (Tanur block) adjoining Ponmundam; the specific road name itself was **not found in an official document** this pass | — |

## Uncertain boundaries

- ⚠ **Constituency composition** — the 6 component local bodies are taken from
  Wikipedia (ECI-sourced) and have **not** yet been cross-checked against the
  original *Delimitation of Constituencies Order, 2008* notification for Kerala.
- ⚠ Need to confirm no component local body is **split** between Tanur AC and a
  neighbouring AC (Tirur / Tanalur / Vengara / Thavanur). If one is, its
  ward-level split list is required.
- ⚠ One Sametham school record (`P. M. S. A. M. U. P. S. Cherumukku`, code
  UP:19682) lists its local body as **Tirurangadi**, not one of our 6 — flagged,
  not corrected. Either Sametham's own data has an error, or Tirurangadi grama
  panchayat has a small area inside Tanur AC that our LSGI list is missing.
  Needs checking against the 2008 delimitation order.
- Local-body and ward geometry is OSM/QField-grade (hand-digitised, roughly
  1:5,000), not survey-grade cadastral data. Shared edges were snapped during
  `mapshaper -clean`, which can move a boundary by <1 m.
- `local_bodies.geojson` / `wards.geojson` contain a few MultiPolygon features
  (3 each) — wards genuinely divided by a river/backwater, or clean-up artefacts.

## Roads (OpenStreetMap layer)

- **1,534 of 1,605 segments are unnamed** ("Unnamed Road"). This reflects OSM
  coverage of rural lanes, not an error. Administrators can name them.
- **56 distinct named roads** are present, including: Tirur–Malappuram–Manjeri
  Road (SH 71), Tippu Sulthan Road (MDR), Chamravattam–Tirur–Kadalundi–Kozhikode
  Road, Athanikkal–Theyyala Road, Vailathur–Kozhichena Road, Tanur–Theyyala
  Road, Ponmundam Bypass, Chemmad Road, Kanoli Canal Road, Vellachal–Ozhur–
  Puthentheru Road, and others (full list in `data/processed/roads.geojson.meta.json`).
- Some OSM names are transliteration variants of the same road
  (e.g. "Athrseeri Road" / "Athrsseri Road", "Bangalavukunbu-Ovungal Road" /
  "Banglavukkunnu-Ovungal Road") — candidates for a manual merge.
- START / END points are **derived** (nearest OSM place or junction, else the
  ward). They are a starting guess for the administrator to correct, not survey
  data. Where a road's two ends are near the same reference point, START and END
  may read the same until edited.
- 24 features are MultiLineString (segments merged during clipping).

## Places (schools, health, government, public)

- 196 places total. Schools: 12 authoritative Sametham records (geocoded,
  `verified:false` pending a field/drag check) + 83 OSM seed points not yet
  cross-referenced to a Sametham code. Government: 44 OSM + 6 official village
  offices + 1 police station + up to 3 Krishi Bhavans pending placement. Health:
  49 OSM + 1 official CHC placement, several more researched but not placed
  (see table above).
- Every place remains `verified:false` until an administrator confirms it —
  including the "official" ones, since geocoding ≠ a field survey.
- The layer is intentionally limited to constituency-relevant infrastructure —
  it is **not** a complete directory of every shop or institution.

## Bridges

- 38 total. 7 named: 5 from OSM tags, 1 identified by this research pass
  (Tanur–Theyyala Road ROB — position inferred from proximity to the railway
  station, not from the declaration document, which has no coordinates), and 1
  newly added (Thooval Theeram Floating Bridge, a real pedestrian structure,
  not a road bridge).
- The remaining 31 are `Unnamed Bridge` — OSM bridge-way midpoints with no
  source name. An administrator names them via the details panel.

## Water

- 1 polygon has a minor self-intersection flagged by `turf.kinks` after
  simplification; it still renders correctly. Coastal/backwater outlines in OSM
  vary in currency.

## Duplicate / conflicting features

- No exact duplicates detected by the validator.
- OSM road-name transliteration variants (above) are the main soft duplicates.
- The Ponmundam and Cheriyamundam village-office "Locate Us" map pins on
  `landrevenue.kerala.gov.in` were within a few hundred metres of each other —
  checked against each local body's polygon and both fall inside their own
  claimed panchayat, so both were kept, but this is flagged as worth a second
  look (the source site may reuse a templated pin for nearby offices).

## Features requiring field verification

Everything with `verified: false` in the details panel — which, honestly, is
everything except the boundary/ward layers (statutory source, digitisation-
grade precision) and the road/place/bridge network in general. Government-
sourced additions (village offices, CHC, ROB, floating bridge) are more
trustworthy than the OSM seed but are still not first-hand surveys.
