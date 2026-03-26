import test from "node:test";
import assert from "node:assert/strict";

import { buildGeoScopeIndex, parseScopedSearch } from "../src/state/geoScope.js";

test("parseScopedSearch resolves planning area within region and preserves trailing keyword", () => {
  const regionGeoJson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [] },
        properties: { REGION_N: "Central Region" },
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

  const scopeIndex = buildGeoScopeIndex({
    regionGeoJson,
    planningAreaGeoJson,
  });

  const parsed = parseScopedSearch("central downtown core maxwell", scopeIndex);

  assert.equal(parsed.activeGeoScope?.type, "planning-area");
  assert.equal(parsed.activeGeoScope?.name, "Downtown Core");
  assert.equal(parsed.residualKeyword, "maxwell");
});
