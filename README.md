# Singapore Hawker Centre Interactive Map

Responsive client-side web app that visualizes Singapore hawker centres using GeoJSON from data.gov.sg.

Detailed architecture documentation: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Features

- Leaflet map centered on Singapore (`[1.3521, 103.8198]`, zoom `12`)
- OpenStreetMap tiles (no API key required)
- Data.gov.sg two-step Poll-Download handshake
- Fetch-once, filter-local state model
- Case-insensitive search by hawker centre `NAME` or `ADDRESSPOSTALCODE`
- Search by official region/area boundaries from local Master Plan 2019 GeoJSON files
- Combined scope + keyword queries (for example: central + maxwell, bedok market)
- Dynamic marker updates while typing
- Marker clustering with `leaflet.markercluster`
- Boundary highlight overlay for matched region/area searches
- Active scope chip shown on map when a region/planning area query is detected
- Loading, error, and empty-search-result states

## Project Structure

```
.
├── index.html
├── styles.css
└── src
	├── main.js
	├── services
	│   └── apiService.js
	├── state
	│   └── store.js
	└── ui
		├── mapView.js
		└── searchView.js
```

## Data Flow (2-Step Handshake)

1. Request Poll-Download endpoint:
   - `https://api-open.data.gov.sg/v1/public/api/datasets/d_4a086da0a5553be1d89383cd90d07ecd/poll-download`
2. Read temporary `data.url` from the response.
3. Fetch GeoJSON from that temporary URL.
4. Normalize features and flip coordinates from `[lng, lat]` to `[lat, lng]` before rendering markers.

## Run Locally

Because ES modules are used, run with a local HTTP server instead of opening the file directly.

Recommended (includes local API proxy for CORS-safe data loading):

```bash
# 1) Put your key in .env.local
# 2) Start server
python server.py
```

Then open `http://127.0.0.1:5173`.

Example with Node:

```bash
npx serve .
```

Then open the served URL shown in your terminal.

Example with Python:

```bash
python -m http.server 5173
```

Then open `http://localhost:5173`.

Note: if you use a plain static server (`python -m http.server` or `npx serve`),
the second-step temporary S3 download URL from data.gov.sg may be blocked by
browser CORS policy. `server.py` avoids that by performing the handshake
server-side and serving data from `/api/hawker-centres`.

API key notes:

- Use `.env.local` (or shell environment variable) for local development.
- Do not hardcode your key in frontend JavaScript or commit it to git.
- `.env.local` is git-ignored by default.
- A template is provided in `.env.example`.

