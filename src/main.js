import { fetchHawkerGeoJson } from "./services/apiService.js";
import { fetchBoundaryGeoJson } from "./services/boundaryService.js";
import { buildGeoScopeIndex } from "./state/geoScope.js";
import { normalizeHawkerFeatures } from "./state/featureNormalizer.js";
import { HAWKER_ACTION_TYPES, HawkerStore } from "./state/store.js";
import { HawkerMapView } from "./ui/mapView.js";
import { setupSearchView } from "./ui/searchView.js";
import { renderSearchResults } from "./ui/searchResultsView.js";
import { renderStatusMessage } from "./ui/statusView.js";

async function bootstrap() {
  const statusElement = document.getElementById("statusMessage");
  const searchInput = document.getElementById("searchInput");
  const searchGuideElement = document.querySelector(".search-guide");
  const searchResultsElement = document.getElementById("searchResults");
  const controlsElement = document.querySelector(".controls");
  const mapElement = document.getElementById("map");
  const detailsPanelElement = document.querySelector(".details-panel");
  const store = new HawkerStore();
  const mapView = new HawkerMapView({
    mapElementId: "map",
    detailsElementId: "detailsContent",
  });

  const syncDetailsPanelHeight = () => {
    if (!detailsPanelElement || !controlsElement || !mapElement) {
      return;
    }

    const controlsHeight = Math.ceil(controlsElement.getBoundingClientRect().height);
    const mapHeight = Math.ceil(mapElement.getBoundingClientRect().height);
    detailsPanelElement.style.height = `${controlsHeight + mapHeight}px`;
  };

  syncDetailsPanelHeight();
  window.addEventListener("resize", syncDetailsPanelHeight);

  if (searchGuideElement) {
    searchGuideElement.addEventListener("toggle", () => {
      syncDetailsPanelHeight();
      mapView.map.invalidateSize({ pan: false, animate: false });
    });
  }

  if (typeof ResizeObserver !== "undefined") {
    const contentResizeObserver = new ResizeObserver(() => {
      syncDetailsPanelHeight();
      mapView.map.invalidateSize({ pan: false, animate: false });
    });

    if (controlsElement) {
      contentResizeObserver.observe(controlsElement);
    }

    if (mapElement) {
      contentResizeObserver.observe(mapElement);
    }
  }

  const dispatchFeatureSelection = (feature, meta = {}) => {
    store.dispatch({
      type: HAWKER_ACTION_TYPES.SELECT_FEATURE,
      payload: { featureId: feature?.id || null },
      meta,
    });
  };

  const shouldAutoFocusForAction = (action, hasSearchText) => {
    if (!hasSearchText) {
      return false;
    }

    const type = action?.type;
    return (
      type === HAWKER_ACTION_TYPES.APPLY_FILTER ||
      type === HAWKER_ACTION_TYPES.SET_MASTER_LIST ||
      type === HAWKER_ACTION_TYPES.SET_GEO_SCOPE_INDEX
    );
  };

  let loading = true;
  let error = "";

  store.subscribe((state, action) => {
    syncDetailsPanelHeight();

    const hasSearchText = Boolean(state.searchText.trim());
    const shouldAutoFocus = shouldAutoFocusForAction(action, hasSearchText);

    mapView.render(state.filteredList, {
      shouldAutoFocus,
      activeGeoScope: state.activeGeoScope,
      selectedFeatureId: state.selectedFeatureId,
      onSelect: (feature) => {
        dispatchFeatureSelection(feature, {
          shouldPan: false,
          source: "map",
        });
      },
    });

    renderSearchResults(searchResultsElement, {
      searchText: state.searchText,
      features: state.filteredList,
      selectedFeatureId: state.selectedFeatureId,
      onSelect: (feature) => {
        dispatchFeatureSelection(feature, {
          shouldPan: true,
          source: "results-list",
        });
      },
    });

    if (
      action?.type === HAWKER_ACTION_TYPES.SELECT_FEATURE &&
      action.meta?.shouldPan
    ) {
      const selectedFeature = state.filteredList.find(
        (feature) => feature.id === state.selectedFeatureId
      );

      if (selectedFeature) {
        mapView.revealFeature(selectedFeature, {
          shouldPan: true,
        });
      }
    }

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
      store.dispatch({
        type: HAWKER_ACTION_TYPES.APPLY_FILTER,
        payload: { text: value },
      });
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
