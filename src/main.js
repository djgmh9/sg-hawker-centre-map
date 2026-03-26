import { fetchHawkerGeoJson } from "./services/apiService.js";
import { fetchBoundaryGeoJson } from "./services/boundaryService.js";
import { buildGeoScopeIndex } from "./state/geoScope.js";
import { normalizeHawkerFeatures } from "./state/featureNormalizer.js";
import { HawkerStore } from "./state/store.js";
import { HawkerMapView } from "./ui/mapView.js";
import { setupSearchView } from "./ui/searchView.js";
import { renderStatusMessage } from "./ui/statusView.js";

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
      activeGeoScope: state.activeGeoScope,
    });

    renderStatusMessage(statusElement, {
      loading,
      error,
      totalCount: state.masterList.length,
      shownCount: state.filteredList.length,
      searchText: state.searchText,
      activeGeoScope: state.activeGeoScope,
      residualKeyword: state.residualKeyword,
    });
  });

  setupSearchView({
    inputElement: searchInput,
    onSearch: (value) => {
      store.applyFilter(value);
    },
  });

  try {
    const [geoJson, boundaryGeoJson] = await Promise.all([
      fetchHawkerGeoJson(),
      fetchBoundaryGeoJson(),
    ]);
    const geoScopeIndex = buildGeoScopeIndex(boundaryGeoJson);
    const normalized = normalizeHawkerFeatures(geoJson);

    store.setGeoScopeIndex(geoScopeIndex);
    store.setMasterList(normalized);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unknown error";
  } finally {
    loading = false;
    const state = store.getState();
    renderStatusMessage(statusElement, {
      loading,
      error,
      totalCount: state.masterList.length,
      shownCount: state.filteredList.length,
      searchText: state.searchText,
      activeGeoScope: state.activeGeoScope,
      residualKeyword: state.residualKeyword,
    });
  }
}

bootstrap();
