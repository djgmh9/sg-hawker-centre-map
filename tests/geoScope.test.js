import test from "node:test";
import assert from "node:assert/strict";

import { buildGeoScopeIndex, parseScopedSearch } from "../src/state/geoScope.js";

function createScopeIndex() {
  const regionGeoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { REGION_N: "Central Region" },
      },
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { REGION_N: "North East Region" },
      },
    ],
  };

  const planningAreaGeoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: {
          PLN_AREA_N: "Downtown Core",
          REGION_N: "Central Region",
        },
      },
    ],
  };

  return buildGeoScopeIndex({
    regionGeoJson,
    planningAreaGeoJson,
  });
}

test("parseScopedSearch resolves planning area within region and preserves trailing keyword", () => {
  const scopeIndex = createScopeIndex();

  const parsed = parseScopedSearch("central downtown core maxwell", scopeIndex);

  assert.equal(parsed.activeGeoScope?.type, "planning-area");
  assert.equal(parsed.activeGeoScope?.name, "Downtown Core");
  assert.equal(parsed.residualKeyword, "maxwell");
});

test("parseScopedSearch respects word boundaries and avoids partial term match", () => {
  const scopeIndex = createScopeIndex();

  const parsed = parseScopedSearch("centrality maxwell", scopeIndex);

  assert.equal(parsed.activeGeoScope, null);
  assert.equal(parsed.residualKeyword, "centrality maxwell");
});

test("parseScopedSearch supports northeast alias for north east region", () => {
  const scopeIndex = createScopeIndex();

  const parsed = parseScopedSearch("northeast hougang", scopeIndex);

  assert.equal(parsed.activeGeoScope?.type, "region");
  assert.equal(parsed.activeGeoScope?.name, "North East Region");
  assert.equal(parsed.residualKeyword, "hougang");
});
