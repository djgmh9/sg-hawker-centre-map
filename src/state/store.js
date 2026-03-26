import { isCentreInsideScope, parseScopedSearch } from "./geoScope.js";
import { normalizeSearchText } from "../utils/query.js";

export class HawkerStore {
  constructor() {
    this.masterList = [];
    this.filteredList = [];
    this.searchText = "";
    this.geoScopeIndex = null;
    this.activeGeoScope = null;
    this.residualKeyword = "";
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  setMasterList(list) {
    this.masterList = Array.isArray(list) ? list : [];
    this.applyFilter(this.searchText);
  }

  setGeoScopeIndex(index) {
    this.geoScopeIndex = index || null;
    this.applyFilter(this.searchText);
  }

  applyFilter(text = "") {
    this.searchText = text;
    const normalizedQuery = normalizeSearchText(text);

    const { activeGeoScope, residualKeyword } = parseScopedSearch(
      normalizedQuery,
      this.geoScopeIndex
    );
    this.activeGeoScope = activeGeoScope;
    this.residualKeyword = residualKeyword;

    if (!normalizedQuery) {
      this.activeGeoScope = null;
      this.residualKeyword = "";
      this.filteredList = [...this.masterList];
      this.notify();
      return;
    }

    const textKeyword = this.activeGeoScope ? residualKeyword : normalizedQuery;

    this.filteredList = this.masterList.filter((centre) => {
      if (!isCentreInsideScope(centre, this.activeGeoScope)) {
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

    this.notify();
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  getState() {
    return {
      masterList: this.masterList,
      filteredList: this.filteredList,
      searchText: this.searchText,
      activeGeoScope: this.activeGeoScope,
      residualKeyword: this.residualKeyword,
    };
  }
}
