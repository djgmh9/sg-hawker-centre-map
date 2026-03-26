import { normalizeSearchText } from "../utils/query.js";

function extractFeatureName(feature, keys) {
  const properties = feature?.properties || {};

  for (const key of keys) {
    const value = String(properties[key] || "").trim();
    if (value) {
      return value;
    }
  }

  return "";
}

function buildRegionTerms(regionName) {
  const terms = new Set();
  const normalized = normalizeSearchText(regionName);

  if (normalized) {
    terms.add(normalized);
  }

  if (normalized.endsWith(" region")) {
    terms.add(normalized.slice(0, -" region".length));
  }

  if (normalized.includes("north east")) {
    terms.add("north east");
    terms.add("northeast");
  }

  return [...terms];
}

function buildAreaTerms(areaName) {
  const terms = new Set();
  const normalized = normalizeSearchText(areaName);

  if (normalized) {
    terms.add(normalized);
  }

  return [...terms];
}

function buildLookupTerms(entries) {
  const terms = [];

  entries.forEach((entry) => {
    entry.lookupTerms.forEach((term) => {
      terms.push({
        term,
        entryId: entry.id,
        termLength: term.length,
      });
    });
  });

  return terms.sort((a, b) => b.termLength - a.termLength);
}

function toCoordinatePairs(ring) {
  if (!Array.isArray(ring)) {
    return [];
  }

  return ring
    .map((coordinate) => {
      if (!Array.isArray(coordinate) || coordinate.length < 2) {
        return null;
      }

      const [lng, lat] = coordinate;

      if (typeof lat !== "number" || typeof lng !== "number") {
        return null;
      }

      return { lat, lng };
    })
    .filter(Boolean);
}

function isPointInRing(lat, lng, ring) {
  const points = toCoordinatePairs(ring);

  if (points.length < 3) {
    return false;
  }

  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].lng;
    const yi = points[i].lat;
    const xj = points[j].lng;
    const yj = points[j].lat;

    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + Number.EPSILON) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function isPointInPolygonCoordinates(lat, lng, polygonCoordinates) {
  if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
    return false;
  }

  const [outerRing, ...innerRings] = polygonCoordinates;

  if (!isPointInRing(lat, lng, outerRing)) {
    return false;
  }

  return !innerRings.some((ring) => isPointInRing(lat, lng, ring));
}

function isPointInGeometry(lat, lng, geometry) {
  if (!geometry) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return isPointInPolygonCoordinates(lat, lng, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygonCoordinates) =>
      isPointInPolygonCoordinates(lat, lng, polygonCoordinates)
    );
  }

  return false;
}

function isWordBoundary(char) {
  return char === undefined || char === " ";
}

function collectScopeMatches(normalizedQuery, geoScopeIndex) {
  const bestBySpan = new Map();

  for (const { term, entryId, termLength } of geoScopeIndex.lookupTerms) {
    const entry = geoScopeIndex.entriesById.get(entryId);

    if (!entry) {
      continue;
    }

    let from = 0;
    while (from < normalizedQuery.length) {
      const start = normalizedQuery.indexOf(term, from);
      if (start < 0) {
        break;
      }

      const end = start + term.length;
      const leftChar = start > 0 ? normalizedQuery[start - 1] : undefined;
      const rightChar = end < normalizedQuery.length ? normalizedQuery[end] : undefined;

      if (isWordBoundary(leftChar) && isWordBoundary(rightChar)) {
        const key = `${start}:${end}`;
        const current = bestBySpan.get(key);

        if (!current || termLength > current.termLength) {
          bestBySpan.set(key, {
            term,
            termLength,
            start,
            end,
            entry,
          });
        }
      }

      from = start + 1;
    }
  }

  return [...bestBySpan.values()].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }

    return b.termLength - a.termLength;
  });
}

function trailingKeyword(normalizedQuery, endIndex) {
  return normalizedQuery.slice(endIndex).trim().replace(/\s+/g, " ");
}

function toRegionEntry(feature) {
  const regionName = extractFeatureName(feature, ["REGION_N"]);
  if (!regionName) {
    return null;
  }

  return {
    id: `region:${normalizeSearchText(regionName)}`,
    type: "region",
    name: regionName,
    regionName,
    boundaryFeature: feature,
    lookupTerms: buildRegionTerms(regionName),
  };
}

function toPlanningAreaEntry(feature) {
  const areaName = extractFeatureName(feature, ["PLN_AREA_N"]);
  const regionName = extractFeatureName(feature, ["REGION_N"]);

  if (!areaName || !regionName) {
    return null;
  }

  return {
    id: `planning-area:${normalizeSearchText(areaName)}`,
    type: "planning-area",
    name: areaName,
    regionName,
    boundaryFeature: feature,
    lookupTerms: buildAreaTerms(areaName),
  };
}

export function buildGeoScopeIndex({ regionGeoJson, planningAreaGeoJson }) {
  const regionEntries = (regionGeoJson?.features || [])
    .map(toRegionEntry)
    .filter(Boolean);

  const planningAreaEntries = (planningAreaGeoJson?.features || [])
    .map(toPlanningAreaEntry)
    .filter(Boolean);

  const entries = [...regionEntries, ...planningAreaEntries];
  const lookupTerms = buildLookupTerms(entries);
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));

  return {
    entriesById,
    lookupTerms,
  };
}

export function parseScopedSearch(query, geoScopeIndex) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery || !geoScopeIndex) {
    return {
      activeGeoScope: null,
      residualKeyword: normalizedQuery,
    };
  }

  const matches = collectScopeMatches(normalizedQuery, geoScopeIndex);
  const firstMatch = matches[0];

  if (!firstMatch) {
    return {
      activeGeoScope: null,
      residualKeyword: normalizedQuery,
    };
  }

  let activeGeoScope = firstMatch.entry;
  let residualKeyword = trailingKeyword(normalizedQuery, firstMatch.end);

  if (firstMatch.entry.type === "region") {
    const areaAfterRegion = matches.find(
      (match) =>
        match.start >= firstMatch.end &&
        match.entry.type === "planning-area" &&
        match.entry.regionName === firstMatch.entry.name
    );

    if (areaAfterRegion) {
      activeGeoScope = areaAfterRegion.entry;
      residualKeyword = trailingKeyword(normalizedQuery, areaAfterRegion.end);
    }
  }

  return {
    activeGeoScope,
    residualKeyword,
  };
}

export function isCentreInsideScope(centre, activeGeoScope) {
  if (!activeGeoScope) {
    return true;
  }

  const geometry = activeGeoScope.boundaryFeature?.geometry;

  if (!geometry || !centre?.location) {
    return false;
  }

  return isPointInGeometry(centre.location.lat, centre.location.lng, geometry);
}
