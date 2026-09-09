# DATA QUALITY REPORT

Generated against the pipeline output of 2026-09-09. Machine checks:
`npm run data:validate` → `data/metadata/quality.json` (0 topology errors).

Uncertainty is never hidden. Anything below marked ⚠ should be treated as
provisional until verified in the field or against an authoritative source.

---

## Missing datasets

| Layer | Status | Mitigation |
|---|---|---|
| **Bridge inventory** | ⚠ No authoritative open source exists for Kerala. Only 37 OSM seed points (5 named). | `+ Add Bridge` admin tool; request PWD (Roads) Division, Tirur bridge list |
| **Official road class / owning agency** | Not applied. OSM `highway` tag used as a proxy category. | Enrich from PMGSY GeoSadak (`datameet/pmgsy-geosadak`) |
| **Authoritative school list** | Using OSM seed (95). Sametham/KITE has the definitive list but no bulk export. | Administrator adds/verifies from `sametham.kite.kerala.gov.in` (filter AC = Tanur) |
| **Authoritative health-facility list** | Using OSM seed (49). | Administrator adds from DHS / Arogya Keralam institution lists |
| **KSDI / K-GIS survey-grade boundaries** | Not obtained (download restricted). | Formal data-sharing request from the MLA office |
| **Map label fonts offline** | Glyphs are fetched from OpenFreeMap; with no internet, text labels don't render (shapes still do). | Self-host a glyph set if fully-offline use is required |

## Uncertain boundaries

- ⚠ **Constituency composition** — the 6 component local bodies are taken from
  Wikipedia (ECI-sourced) and have **not** yet been cross-checked against the
  original *Delimitation of Constituencies Order, 2008* notification for Kerala.
- ⚠ Need to confirm no component local body is **split** between Tanur AC and a
  neighbouring AC (Tirur / Tanalur / Vengara / Thavanur). If one is, its
  ward-level split list is required.
- Local-body and ward geometry is OSM/QField-grade (hand-digitised, roughly
  1:5,000), not survey-grade cadastral data. Shared edges were snapped during
  `mapshaper -clean`, which can move a boundary by <1 m.
- `local_bodies.geojson` / `wards.geojson` contain a few MultiPolygon features
  (3 each) — wards genuinely divided by a river/backwater, or clean-up artefacts.

## Roads

- **1,534 of 1,605 segments are unnamed** ("Unnamed Road"). This reflects OSM
  coverage of rural lanes, not an error. Administrators can name them.
- **56 distinct named roads** are present, including: Tirur–Malappuram–Manjeri
  Road (SH 71), Tippu Sulthan Road (MDR), Chamravattam–Tirur–Kadalundi–Kozhikode
  Road, Athanikkal–Theyyala Road, Vailathur–Kozhichena Road, Tanur–Theyyala
  Road, Ponmundam Bypass, Chemmad Road, Kanoli Canal Road, Vellachal–Ozhur–
  Puthentheru Road, and others (full list in `data/processed/roads.geojson.meta.json`).
- ⚠ Roads named locally but **not yet in OpenStreetMap** — e.g. *Theyyala–Devadar
  Bypass*, *Olappeedika–Kunnumparam–Tanur Road*, *Moolakkal–Unniyalungal Road*,
  *Ozhur–Pandimuttam Road*, *Banglamkunnu–Ovungal Mini Bypass* — should be added
  by an administrator with **+ Add Road** (draw the line, enter the name). We do
  **not** fabricate their geometry.
- Some OSM names are transliteration variants of the same road
  (e.g. "Athrseeri Road" / "Athrsseri Road", "Bangalavukunbu-Ovungal Road" /
  "Banglavukkunnu-Ovungal Road") — candidates for a manual merge.
- START / END points are **derived** (nearest OSM place or junction, else the
  ward). They are a starting guess for the administrator to correct, not survey
  data. Where a road's two ends are near the same reference point, START and END
  may read the same until edited.
- 24 features are MultiLineString (segments merged during clipping).

## Places

- All 188 places are `verified: false`. Category split: 95 school, 49 health,
  44 government. Coordinates are OSM points and may be approximate (some sit on
  the building, some on the entrance, some offset).
- The layer is intentionally limited to constituency-relevant infrastructure —
  it is **not** a complete directory of every shop or institution.

## Bridges

- All 37 are `verified: false`; 32 have no name from source.
- Positions are OSM bridge-way midpoints — accurate to the road but not surveyed.

## Water

- 1 polygon has a minor self-intersection flagged by `turf.kinks` after
  simplification; it still renders correctly. Coastal/backwater outlines in OSM
  vary in currency.

## Duplicate / conflicting features

- No exact duplicates detected by the validator.
- OSM road-name transliteration variants (above) are the main soft duplicates.

## Features requiring field verification

Everything with `verified: false` in the details panel: all roads, all bridges,
all places. Boundary and ward layers are treated as authoritative (statutory
source) but their precision is digitisation-grade.
