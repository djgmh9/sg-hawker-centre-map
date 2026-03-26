import { fetchHawkerGeoJson } from "./services/apiService.js";
import { fetchBoundaryGeoJson } from "./services/boundaryService.js";
import { buildGeoScopeIndex } from "./state/geoScope.js";
import { normalizeHawkerFeatures } from "./state/featureNormalizer.js";
import { HawkerStore } from "./state/store.js";
import { HawkerMapView } from "./ui/mapView.js";
import { setupSearchView } from "./ui/searchView.js";
import { renderSearchResults } from "./ui/searchResultsView.js";
import { renderStatusMessage } from "./ui/statusView.js";

async function bootstrap() {
  const statusElement = document.getElementById("statusMessage");
  const searchInput = document.getElementById("searchInput");
  const searchResultsElement = document.getElementById("searchResults");
  const leftColumnElement = document.querySelector(".left-column");
  const detailsPanelElement = document.querySelector(".details-panel");
  const store = new HawkerStore();
  const mapView = new HawkerMapView({
    mapElementId: "map",
    detailsElementId: "detailsContent",
  });

  const syncDetailsPanelHeight = () => {
    if (!leftColumnElement || !detailsPanelElement) {
      return;
    }

    detailsPanelElement.style.height = `${leftColumnElement.offsetHeight}px`;
  };

  syncDetailsPanelHeight();
  window.addEventListener("resize", syncDetailsPanelHeight);

  let loading = true;
  let error = "";

  store.subscribe((state) => {
    syncDetailsPanelHeight();

    const hasSearchText = Boolean(state.searchText.trim());

    mapView.render(state.filteredList, {
      shouldAutoFocus: hasSearchText,
      activeGeoScope: state.activeGeoScope,
      selectedFeatureId: state.selectedFeatureId,
      onSelect: (feature, options = {}) => {
        store.setSelectedFeatureId(feature.id);

        if (options.shouldPan) {
          mapView.revealFeature(feature, {
            shouldPan: true,
          });
        }
      },
    });

    renderSearchResults(searchResultsElement, {
      searchText: state.searchText,
      features: state.filteredList,
      selectedFeatureId: state.selectedFeatureId,
      onSelect: (feature) => {
        store.setSelectedFeatureId(feature.id);
        mapView.revealFeature(feature, {
          shouldPan: true,
        });
      },
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
    syncDetailsPanelHeight();
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
