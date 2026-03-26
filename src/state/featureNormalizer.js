export function normalizeHawkerFeatures(geoJson) {
  const rawFeatures = geoJson?.features;

  if (!Array.isArray(rawFeatures)) {
    return [];
  }

  return rawFeatures
    .map((feature, index) => {
      const coords = feature?.geometry?.coordinates;

      if (!Array.isArray(coords) || coords.length < 2) {
        return null;
      }

      const [lng, lat] = coords;

      if (typeof lat !== "number" || typeof lng !== "number") {
        return null;
      }

      const properties = feature.properties || {};
      const name = String(properties.NAME || "").trim() || "unknown";
      const postal = String(properties.ADDRESSPOSTALCODE || "").trim() || "na";

      return {
        id: `${name}-${postal}-${lat}-${lng}-${index}`,
        properties,
        location: { lat, lng },
      };
    })
    .filter(Boolean);
}
