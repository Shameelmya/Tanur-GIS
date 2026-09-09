# Tanur Constituency GIS

An interactive GIS web application for the **Tanur Assembly Constituency
(No. 44), Malappuram, Kerala** — built for the MLA and authorised office staff.

> Open the app → see the whole constituency → see the local bodies → zoom in →
> see wards, roads and water → click a road, bridge or place → view / edit its
> details → save (with an audit trail).

It is **data-driven**: every layer comes from a real government or OpenStreetMap
source (see [`DATA_SOURCES.md`](DATA_SOURCES.md)). Where authoritative data does
not exist (bridges, some roads and places), the app provides an admin
**"+ Add …"** workflow instead of inventing features
([`DATA_QUALITY.md`](DATA_QUALITY.md)).

---

## Architecture

```
GIS GEOMETRY                         EDITABLE METADATA + AUDIT
  data/scripts/*  (reproducible)       Firebase Firestore
        │                                     │
   data/processed/*.geojson            roads / bridges / places
        │                              audit_logs / users
   public/data/*.geojson  ──────►  Next.js + React + MapLibre GL JS  ◄──┘
                                   (merged at load time)
```

- **Frontend** — Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS,
  MapLibre GL JS.
- **Geometry** — static GeoJSON in `public/data/` (simplified for the web).
- **Editable metadata & audit log** — Firebase Firestore. Geometry is *not*
  stored in Firestore except for admin-added / geometry-edited features.
- **Auth** — Firebase Authentication (Google sign-in). Roles: `viewer`
  (read + search) and `admin` (edit, add, archive).
- **Basemap** — boots on a dependency-free plain ground (works offline); an
  optional OpenFreeMap "Streets" layer can be toggled on. Provider is swappable
  via `NEXT_PUBLIC_BASEMAP_STYLE_URL`.
- **Deploy** — Vercel.

When Firebase is not configured the app runs in **demo mode**: fully usable,
edits are saved to the browser's `localStorage` and clearly labelled.

---

## Local development

```bash
npm install
cp .env.example .env.local     # fill in Firebase config (optional for demo mode)
npm run dev                    # http://localhost:3000
```

Type-check: `npm run typecheck`

---

## Data preparation

The whole pipeline is reproducible with Node only (no Python / GDAL needed):

```bash
npm run data:all
```

or individually:

| Command | Output |
|---|---|
| `npm run data:wards` | `wards.geojson` (Delimitation Commission, 2024) |
| `npm run data:local-bodies` | `local_bodies.geojson` (dissolve of wards) |
| `npm run data:boundary` | `constituency.geojson` + `constituency_mask.geojson` |
| `npm run data:roads` | `roads.geojson` (OSM, with derived start/end) |
| `npm run data:railway` | `railway.geojson` (OSM) |
| `npm run data:bridges` | `bridges.geojson` (OSM seed — incomplete by design) |
| `npm run data:pois` | `places.geojson` (OSM seed) |
| `npm run data:water` | `water.geojson` (OSM) |
| `npm run data:validate` | `data/metadata/quality.json` |
| `npm run data:manifest` | simplified web copies + `src/lib/data/manifest.json` |

Raw downloads go to `data/raw/` (git-ignored); scripts cache Overpass responses
there so re-runs are fast.

---

## Firebase setup

1. Create a Firebase project → add a **Web app** → copy the config into
   `.env.local` (`NEXT_PUBLIC_FIREBASE_*`).
2. **Authentication** → enable **Google** as a sign-in provider. Add your
   Vercel domain(s) to the authorised domains.
3. **Firestore** → create a database (production mode).
4. Deploy the security rules in [`firestore.rules`](firestore.rules)
   (Firebase console → Firestore → Rules, or `firebase deploy --only firestore:rules`).
5. (Optional) Seed the editable layers into Firestore from the processed data:
   put a service-account key at `./serviceAccountKey.json` and run
   `npm run seed:firestore`.

### Admin setup

Roles live in the `users` collection. On first sign-in a user is created as a
`viewer`. To make someone an administrator:

- Firebase console → Firestore → `users` → their document → set
  `role: "admin"`.

They get the **Administrator tools** panel (Add road / Add bridge / Add place)
and Edit / Archive buttons in the details panel on their next sign-in.

---

## Deployment (Vercel)

1. Import the GitHub repo into Vercel (framework preset: **Next.js**).
2. Add the environment variables from `.env.example` in the Vercel project
   settings (Production + Preview).
3. Deploy. No build configuration is required.

Do **not** commit `.env.local`, `serviceAccountKey.json`, or any API keys —
they are in `.gitignore`.

---

## Using the map

| Action | Result |
|---|---|
| Open | Whole constituency, greyed outside, local bodies coloured, roads + water + bridges |
| Toggle a layer | Show/hide (some layers appear only when you zoom in) |
| "Show borders only" (Local bodies) | Hides the colour fills, keeps the coloured borders |
| Click a road | Road turns **green**, details panel opens (name, start, end, local body, ward, source) |
| Click a bridge / place / ward | Details panel with its information and data source |
| Search | Roads, wards, bridges, schools, health facilities, local bodies — zooms and selects |
| Admin: **+ Add Road** | Draw a line on the map, enter the name and details, save |
| Admin: **+ Add Bridge / + Add Place** | Click the map to drop a marker, fill the form, save |
| Admin: **Edit** | Change any editable field; every change is written to `audit_logs` |
| Admin: **Archive** | Hides a feature from the map (reversible) |

---

## Project layout

```
data/
  raw/         downloaded sources (git-ignored)
  processed/   cleaned GeoJSON + per-layer .meta.json
  scripts/     the reproducible pipeline (01–08, 98 validate, 99 manifest)
  metadata/    quality.json
public/data/   simplified GeoJSON served to the map
src/
  app/         Next.js App Router (layout, page)
  components/   MapView, panels, toolbar, dialogs
  lib/         types, layers config, firebase, auth, store, useGisData
DATA_DISCOVERY_REPORT.md   Phase 0 research
DATA_SOURCES.md            provenance of every dataset
DATA_QUALITY.md            known gaps and uncertainties
firestore.rules            Firestore security rules
```

## Licence / attribution

- Ward & boundary geometry: **Delimitation Commission, Kerala** (2024 delimitation).
- Roads, railway, water, seed bridges & places: **© OpenStreetMap contributors**, ODbL 1.0.
- Local-body reference IDs: `opendatakerala/lsg-kerala-data`, ODbL 1.0.

Application code: see repository licence.
