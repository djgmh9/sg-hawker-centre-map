# Architecture and Integration Overview

## 1. Purpose

This project is a client-side interactive map that visualizes Singapore hawker centres from the data.gov.sg Hawker Centres GeoJSON dataset.

The design goal is:

- simple UI with fast filtering
- one-time data fetch (no refetch on every search)
- modular code separation (service, state, UI)
- reliable local development despite browser CORS restrictions

## 2. High-Level Architecture

The app has two runtime layers:

- Known behavior: selecting a result from the list auto-focuses and pans the map; clicking markers does not auto-zoom out to avoid disorienting users near dense cluster points.

1. Frontend layer (browser):
   - index.html
   - styles.css
   - src/main.js
   - src/services/apiService.js
   - src/services/boundaryService.js
   - src/state/featureNormalizer.js
   - src/state/geoScope.js
   - src/state/store.js
   - src/ui/mapView.js
   - src/ui/scopeOverlayView.js
   - src/ui/searchView.js
   - src/ui/statusView.js

2. Local development proxy layer:
   - server.py
   - provides /api/hawker-centres
   - reads optional DATA_GOV_SG_API_KEY from .env.local or process environment
   - works without an API key, but with lower upstream rate limits

## 3. Why the Local Proxy Exists

The data.gov.sg API is a two-step handshake:

1. Call poll-download endpoint.
2. Read data.url from that response.
3. Fetch the GeoJSON from the temporary signed S3 URL.

In browser-only mode, step 3 can fail due to CORS because the signed S3 response may not include Access-Control-Allow-Origin for your local origin.

The local proxy avoids this by doing steps 1 to 3 on the server side and returning JSON from the same origin as the app:

- Browser requests: /api/hawker-centres
- server.py performs upstream handshake
- Browser receives normal same-origin JSON

## 4. Component Responsibilities

### src/main.js

- bootstraps app
- loads hawker centres and boundary data
- builds geo scope index
- wires store updates to map rendering and status text

### src/services/apiService.js

- service layer for hawker centre data loading
- fetches from local proxy endpoint `/api/hawker-centres`

### src/services/boundaryService.js

- loads local official Master Plan 2019 boundary GeoJSON files
- returns region and planning-area feature collections for scope indexing

### src/state/featureNormalizer.js

- normalizes hawker features into app-ready shape
- flips coordinates from [lng, lat] to [lat, lng]

### src/state/geoScope.js

- builds scope index from official boundary properties
- parses query to resolve region/planning area scope and trailing keyword
- provides geometry containment checks for scope filtering

### src/state/store.js

- app state container
- stores:
  - masterList (full dataset)
  - filteredList (derived search results)
   - searchText
   - activeGeoScope
   - residualKeyword
- applies scope-first filtering (geometry containment), then trailing text match
- notifies subscribers on state updates

### src/ui/mapView.js

- creates and owns Leaflet map instance
- configures OSM tile layer and marker cluster layer
- renders marker set from filtered features
- delegates scope chip and scope boundary rendering to scopeOverlayView
- binds tooltip and selection details behavior
- escapes HTML content for safer rendering

### src/ui/scopeOverlayView.js

- owns active scope chip rendering
- owns active scope boundary style and overlay layer rendering

### src/ui/searchView.js

- controlled input event wiring
- status message composition for:
  - loading
  - API error
  - empty search results
  - filtered and full result counts

### src/ui/statusView.js

- applies composed status message text to the DOM

### server.py

- static file host for local dev
- API endpoint: /api/hawker-centres
- reads optional API key from .env.local (or environment)
- calls poll-download with x-api-key only when key is present
- fetches temporary signed URL and returns GeoJSON
- returns 502 with error payload on upstream failure
- if key is absent, proxy still works but upstream rate limits are lower

## 5. Request and State Flow

1. Browser loads main.js.
2. main.js initializes store and map.
3. main.js loads hawker GeoJSON and local boundary GeoJSON in parallel.
4. main.js builds geo scope index and sets store state.
5. Features are normalized and stored in masterList.
6. filteredList is derived from scope + keyword parsing in store.
7. Store subscriber re-renders markers, scope overlay, and status message.
8. User typing triggers applyFilter; no refetch occurs.

## 6. Why It Failed Earlier (Postmortem)

There were multiple independent issues during setup:

1. file:// origin issue:
   - Opening index.html directly blocks ES module loading and fetch behavior.
   - Solution: run via http://127.0.0.1:5173.

2. CORS on signed S3 URL:
   - Browser could call poll-download but failed on temporary S3 URL due to missing CORS header.
   - Solution: use server.py proxy endpoint.

3. Mixed server processes on same port:
   - Sometimes python -m http.server was still running on 5173, so /api/hawker-centres returned 404.
   - Solution: run only server.py on that port.

4. Early proxy header handling:
   - Header behavior was adjusted to match reliable poll-download requests.
   - Current implementation uses x-api-key for the poll endpoint and returns stable results.

## 7. Development Runbook

1. Put your API key in .env.local:
   DATA_GOV_SG_API_KEY=...

   This step is optional. Without a key, the proxy still functions but has lower data.gov.sg rate limits.

2. Start the app:
   python server.py

3. Open:
   http://127.0.0.1:5173

4. If map is empty, check:
   - no other process using port 5173
   - /api/hawker-centres returns FeatureCollection JSON
   - browser console for runtime errors

## 8. Security Notes

- .env.local is git-ignored and must stay local.
- Never embed API keys in frontend JavaScript.
- Rotate keys that were shared in logs, screenshots, or chat transcripts.
