const REGION_BOUNDARY_PATH =
  "./src/data/Master Plan 2019 Region Boundary (No Sea) (GEOJSON).geojson";
const PLANNING_AREA_BOUNDARY_PATH =
  "./src/data/Master Plan 2019 Planning Area Boundary (No Sea).geojson";

async function fetchJson(url) {
  const response = await fetch(encodeURI(url));

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

export async function fetchBoundaryGeoJson() {
  const [regionGeoJson, planningAreaGeoJson] = await Promise.all([
    fetchJson(REGION_BOUNDARY_PATH),
    fetchJson(PLANNING_AREA_BOUNDARY_PATH),
  ]);

  return {
    regionGeoJson,
    planningAreaGeoJson,
  };
}
