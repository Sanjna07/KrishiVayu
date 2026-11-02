# KrishiVayu (कृषिवायु) — Burn Alert to Buyer Match & Residue Market

> **One-liner:** Detect crop-residue fires in Punjab/Haryana, rank districts by risk to Delhi air quality, match hotspots to clean alternatives, and connect farmers with industrial residue off-takers through a privacy-first, trilingual paddy straw marketplace.
>
> **Design Theme:** Official Government-Portal Light Style (`#F5F7FA` page, `#FFFFFF` cards, `#D9DEE5` borders, `#1F3A5F` Navy header, and authentic CPCB/ISRO risk palettes).
>
> **Track:** Green Tech / Sustainable Development · Civic Tech MVP
>
> **Live Deployment:** [https://krishivayu-dw9o.vercel.app/](https://krishivayu-dw9o.vercel.app/)

---

## The Problem

Every October and November, smoke from agricultural stubble burning (*parali*) in Punjab and Haryana blankets northern India and the Delhi National Capital Region (NCR), pushing the Air Quality Index (AQI) past severe thresholds (>450).

Existing interventions fail because:
1. **Satellite Gaps**: Polar-orbiting satellites (VIIRS and MODIS) pass at fixed times (10:30 AM & 1:30 PM). Many fires are lit in the late afternoon after satellites have passed.
2. **Alerts Without Actions**: Telling authorities or farmers that a fire is burning does not solve the root cause. Farmers face a tight 15–20 day window to prepare fields for the wheat crop and lack immediate, verified economic off-takers for their straw.
3. **Missing Downwind Risk Priority**: An active burn 100 km upwind of Delhi with winds blowing toward the capital poses far greater immediate danger than an isolated burn with crosswinds blowing away.
4. **Market Friction & Privacy Fears**: Farmers fear harassment or cold calls if they publish contact numbers publicly, while biomass pellet plants and CBG plants struggle with fragmented supply chains and unpredictable availability.

**KrishiVayu bridges detection directly to economic action:**
`Active Fire Detection → Downwind Delhi Risk Ranking → WhatsApp Advisory with Deep Link → Farmer Residue Listing → Buyer Offer Matching → Private Unguessable Off-Take Lifecycle`

---

## What KrishiVayu Does

### 1. 🔥 Detection & Risk Modeling
- **Real-Time Hotspot Detection**: Pulls dual-satellite NASA FIRMS thermal hotspots (VIIRS SNPP + NOAA-20 at 375m NRT resolution), filtering out low-confidence anomalies.
- **Aerodynamic Wind Alignment**: Integrates real-time 10m wind direction and speed from Open-Meteo. Uses a spherical cosine transfer function to compute the exact smoke transport vector heading into Delhi NCR.
- **Transparent Air-Quality Risk Heuristic (0–100)**: Ranks districts based on:
  - **Fire Volume (40%)**: Normalized active fire count and fire radiative power (FRP).
  - **Proximity to Delhi (30%)**: Geodesic Haversine distance scaled between 50 km and 450 km.
  - **Wind Trajectory (30%)**: Normalized alignment of prevailing plume toward Central Delhi (`28.6129° N, 77.2295° E`).
- **Administrative District Polygons**: Bundled open-licensed GeoJSON (`public/data/districts.geojson`, 273 KB) rendered on CARTO Positron vector tiles with live risk fills (Critical `#C62828`, High `#E65100`, Moderate `#F9A825`, Low `#2E7D32`) and rich metric hover tooltips.
- **Residue Demand Signals**: Aggregates active, uncollected paddy straw supply per district directly into district cards, giving officials and off-takers real-time visibility into harvest readiness.

### 2. 🌾 Farmer-Facing Residue Marketplace (`/market`)
- **Trilingual Sell Wizard (`/market/sell`)**: Mobile-first 3-step listing flow in **English**, **हिन्दी (Hindi)**, and **ਪੰਜਾਬੀ (Punjabi)**. Automatically pre-fills district and village from WhatsApp advisory deep links (`?district=...&village=...&ref=wa`).
- **Official Price Benchmarking**: Displays the CPCB/PEDA benchmark guide for ex-situ stubble (₹180–₹220/quintal farmgate) while granting farmers complete flexibility to specify custom asking prices.
- **Browse Feed & Synced Map (`/market`)**: Split-screen feed and map synchronization with MapLibre GL on light Positron basemap. Off-takers can filter by district, straw form (loose, baled, chopped), and status, and view clean off-taker facilities.
- **Accessible Listing Modal**: Replaces heavy inline detail panels with an accessible dialog (`src/components/ListingModal.tsx`) featuring focus trapping, scroll locking, and role-aware tabs (*Listing Details*, *Offers*, *Clean Off-Takers*, *Make an Offer*).

### 3. 🔐 Privacy-Preserving Farmer Dashboard (`/market/manage/[token]`)
- **Zero Public PII**: Farmer phone numbers are strictly stripped from all public browse APIs and detail views.
- **Unguessable Management Token**: On listing creation, the farmer receives an unguessable 32-character random access token (`token=...`). The backend stores only a one-way SHA-256 hash (`editTokenHash`).
- **Gated Contact Reveal**: Farmer and buyer phone numbers are revealed to each other **only** after the farmer reviews and accepts the buyer's offer.
- **End-to-End Lifecycle State Machine**: Enforces valid lifecycle transitions: `listed` → `offered` → `accepted` → `pickup_scheduled` → `collected` (or `withdrawn`).

### 4. 📊 Historical Trends & Safe Exports (`/trends`)
- **Multi-Year CREAMS Satellite Analysis**: 2020–2025 historical stubble fire archives from ICAR-IARI paired with live NASA FIRMS telemetry.
- **Resilient Multi-Year & Single-Year Charts**: Automatically renders `BarChart` for single-year views to prevent zero-width empty area charts, and `AreaChart` for multi-year trends.
- **Formula-Injection Safe CSV Export**: Client-side CSV generation with strict Excel/Sheets formula guard (RFC 4180 + prepending `'` on `=`, `+`, `-`, `@`).
- **Print / PDF Action Plan**: One-click `@media print` formatted district action plan in the Alert & Match drawer.

---

## Design System & Government-Portal Light Theme Tokens

All color, spacing, radius, and typography tokens are centralized in [`src/lib/theme.ts`](file:///c:/Users/amitg/Desktop/green%20tech/src/lib/theme.ts) and [`src/app/globals.css`](file:///c:/Users/amitg/Desktop/green%20tech/src/app/globals.css):
- **Page Background:** `#F5F7FA` (Calm government portal light gray)
- **Cards & Panels:** `#FFFFFF` with `1px solid #D9DEE5` borders and `8px` (`rounded-lg`) radius
- **Primary Header & Actions:** `#1F3A5F` (Portal Navy), Hover `#162C49`
- **Clean Positive States:** `#2E7D32` (Forest Green)
- **Risk Colors:**
  - **Critical ($\ge 75$):** `#C62828` (Fill: `rgba(198, 40, 40, 0.35)`)
  - **High ($51–74$):** `#E65100` (Fill: `rgba(230, 81, 0, 0.30)`)
  - **Moderate ($26–50$):** `#F9A825` (Fill: `rgba(249, 168, 37, 0.25)`)
  - **Low ($0–25$):** `#2E7D32` (Fill: `rgba(46, 125, 50, 0.20)`)
- **Tricolor Header Accent:** Saffron (`#FF9933`), White (`#FFFFFF`), Green (`#138808`)

---

## Quickstart

### Prerequisites
- Node.js 20+ (tested on Node v24 LTS)
- npm 10+

### 1. Clone & Install

```bash
git clone https://github.com/Sanjna07/KrishiVayu.git
cd krishivayu
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```
Edit `.env.local`:
```env
# NASA FIRMS MAP API Key (Optional: defaults to authentic bundled snapshot if unset)
FIRMS_MAP_KEY=your_key_here

# Public site URL used to construct WhatsApp deep links
NEXT_PUBLIC_SITE_URL=https://krishivayu-dw9o.vercel.app
```

### 3. Run Development Server

```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Run Test Suite

```bash
npm test
```
Executes all **11 automated unit, integration, and security test suites**:
1. `domain.test.ts`: Geodesic distance, bearing benchmarks, and aerodynamic wind alignment.
2. `weather.test.ts`: Live Open-Meteo API ingestion and error fallback paths.
3. `alternatives.test.ts`: Clean alternatives dataset validation and nearest-neighbor matching.
4. `resilience.test.ts`: Offline NASA snapshot resilience and risk score stability.
5. `market.test.ts`: Marketplace contracts, quantity/phone validations, and state machine transition rules.
6. `repo.test.ts`: In-memory and file persistence round-trips, seed idempotency, and demo flag integrity.
7. `api-matrix.test.ts`: API security matrix, PII redaction, token-hash authorization, and rate limiting.
8. `lifecycle.test.ts`: 10-step farmer lifecycle (listing creation, offer receipt, acceptance, contact unlock, pickup, collection).
9. `whatsapp-integration.test.ts`: Multilingual WhatsApp message templates and deep-link generation.
10. `demand-signal.test.ts`: District-level demand signal aggregation without PII leaks.
11. `csv.test.ts`: Formula-injection protection for spreadsheet exports.

---

## Data Sources & Attributions

- **NASA FIRMS**: Satellite active fire detections courtesy of NASA EOSDIS FIRMS (VIIRS 375m NRT).
- **Weather Data**: Open-Meteo keyless weather API under CC-BY 4.0.
- **Historical Trends**: ICAR-IARI Consortium for Research on Agroecosystem Monitoring and Modeling from Space (CREAMS).
- **Administrative Boundaries**: Simplified district polygons derived from open spatial administrative datasets (GADM / Datameet under open spatial database licenses).
- **Map Tiles**: CARTO Positron light vector/raster basemaps © OpenStreetMap contributors, © CARTO.

---

## Disclaimers & Independent Project Notice

KrishiVayu is an independent civic-tech open-data platform for public health and clean crop-residue valorization. It is **not an official government service** and does not represent the Government of India or state agricultural departments. It does not handle banking transactions, currency exchange, or escrow payments.
