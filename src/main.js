import { fetchHawkerGeoJson } from "./services/apiService.js";
import { HawkerStore } from "./state/store.js";
import { HawkerMapView } from "./ui/mapView.js";
import { setupSearchView, buildStatusMessage } from "./ui/searchView.js";

function normalizeFeatures(geoJson) {
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

function updateStatus({
  statusElement,
  loading,
  error,
  totalCount,
  shownCount,
  searchText,
}) {
  statusElement.textContent = buildStatusMessage({
    loading,
    error,
    totalCount,
    shownCount,
    searchText,
  });
}

async function bootstrap() {
  const statusElement = document.getElementById("statusMessage");
  const searchInput = document.getElementById("searchInput");
  const store = new HawkerStore();
  const mapView = new HawkerMapView({
    mapElementId: "map",
    detailsElementId: "detailsPanel",
  });

  let loading = true;
  let error = "";

  store.subscribe((state) => {
    const hasSearchText = Boolean(state.searchText.trim());

    mapView.render(state.filteredList, {
      shouldAutoFocus: hasSearchText,
    });

    updateStatus({
      statusElement,
      loading,
      error,
      totalCount: state.masterList.length,
      shownCount: state.filteredList.length,
      searchText: state.searchText,
    });
  });

  setupSearchView({
    inputElement: searchInput,
    onSearch: (value) => {
      store.applyFilter(value);
    },
  });

  try {
    const geoJson = await fetchHawkerGeoJson();
    const normalized = normalizeFeatures(geoJson);
    store.setMasterList(normalized);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  } finally {
    loading = false;
    const state = store.getState();
    updateStatus({
      statusElement,
      loading,
      error,
      totalCount: state.masterList.length,
      shownCount: state.filteredList.length,
      searchText: state.searchText,
    });
  }
}

bootstrap();
