import { isCentreInsideScope, parseScopedSearch } from "./geoScope.js";
import { normalizeSearchText } from "../utils/query.js";

export const HAWKER_ACTION_TYPES = {
  SET_MASTER_LIST: "SET_MASTER_LIST",
  SET_GEO_SCOPE_INDEX: "SET_GEO_SCOPE_INDEX",
  APPLY_FILTER: "APPLY_FILTER",
  SELECT_FEATURE: "SELECT_FEATURE",
};

function withFilterState(state, text = "") {
  const searchText = text;
  const normalizedQuery = normalizeSearchText(text);

  const { activeGeoScope, residualKeyword } = parseScopedSearch(
    normalizedQuery,
    state.geoScopeIndex
  );

  if (!normalizedQuery) {
    const filteredList = [...state.masterList];
    const selectedFeatureId = filteredList.some(
      (centre) => centre.id === state.selectedFeatureId
    )
      ? state.selectedFeatureId
      : null;

    return {
      ...state,
      searchText,
      activeGeoScope: null,
      residualKeyword: "",
      filteredList,
      selectedFeatureId,
    };
  }

  const textKeyword = activeGeoScope ? residualKeyword : normalizedQuery;
  const filteredList = state.masterList.filter((centre) => {
    if (!isCentreInsideScope(centre, activeGeoScope)) {
      return false;
    }

    if (!textKeyword) {
      return true;
    }

    const name = (centre.properties.NAME || "").toLowerCase();
    const postal = String(centre.properties.ADDRESSPOSTALCODE || "").toLowerCase();
    const building = String(centre.properties.ADDRESSBUILDINGNAME || "").toLowerCase();
    const street = String(centre.properties.ADDRESSSTREETNAME || "").toLowerCase();
    const fullAddress = String(centre.properties.ADDRESS_MYENV || "").toLowerCase();
    return (
      name.includes(textKeyword) ||
      postal.includes(textKeyword) ||
      building.includes(textKeyword) ||
      street.includes(textKeyword) ||
      fullAddress.includes(textKeyword)
    );
  });

  const selectedFeatureId = filteredList.some(
    (centre) => centre.id === state.selectedFeatureId
  )
    ? state.selectedFeatureId
    : null;

  return {
    ...state,
    searchText,
    activeGeoScope,
    residualKeyword,
    filteredList,
    selectedFeatureId,
  };
}

export function reduceHawkerState(state, action) {
  if (!action?.type) {
    return state;
  }

  switch (action.type) {
    case HAWKER_ACTION_TYPES.SET_MASTER_LIST: {
      const masterList = Array.isArray(action.payload?.list)
        ? action.payload.list
        : [];
      return withFilterState({
        ...state,
        masterList,
      }, state.searchText);
    }
    case HAWKER_ACTION_TYPES.SET_GEO_SCOPE_INDEX: {
      const geoScopeIndex = action.payload?.index || null;
      return withFilterState({
        ...state,
        geoScopeIndex,
      }, state.searchText);
    }
    case HAWKER_ACTION_TYPES.APPLY_FILTER:
      return withFilterState(state, action.payload?.text || "");
    case HAWKER_ACTION_TYPES.SELECT_FEATURE: {
      const nextFeatureId = action.payload?.featureId || null;
      const selectedFeatureId = state.filteredList.some(
        (centre) => centre.id === nextFeatureId
      )
        ? nextFeatureId
        : null;

      return {
        ...state,
        selectedFeatureId,
      };
    }
    default:
      return state;
  }
}

export class HawkerStore {
  constructor() {
    this.state = {
      masterList: [],
      filteredList: [],
      searchText: "",
      geoScopeIndex: null,
      activeGeoScope: null,
      residualKeyword: "",
      selectedFeatureId: null,
    };
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState(), null);
    return () => this.listeners.delete(listener);
  }

  dispatch(action) {
    const nextState = reduceHawkerState(this.state, action);
    if (nextState === this.state) {
      return;
    }

    this.state = nextState;
    this.notify(action);
  }

  setMasterList(list) {
    this.dispatch({
      type: HAWKER_ACTION_TYPES.SET_MASTER_LIST,
      payload: { list },
    });
  }

  setGeoScopeIndex(index) {
    this.dispatch({
      type: HAWKER_ACTION_TYPES.SET_GEO_SCOPE_INDEX,
      payload: { index },
    });
  }

  setSelectedFeatureId(featureId) {
    this.dispatch({
      type: HAWKER_ACTION_TYPES.SELECT_FEATURE,
      payload: { featureId },
      meta: { shouldPan: false, source: "store" },
    });
  }

  applyFilter(text = "") {
    this.dispatch({
      type: HAWKER_ACTION_TYPES.APPLY_FILTER,
      payload: { text },
    });
  }

  notify(action) {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state, action || null));
  }

  getState() {
    return this.state;
  }
}
