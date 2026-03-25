export class HawkerStore {
  constructor() {
    this.masterList = [];
    this.filteredList = [];
    this.searchText = "";
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

  applyFilter(text = "") {
    this.searchText = text;
    const keyword = text.trim().toLowerCase();

    if (!keyword) {
      this.filteredList = [...this.masterList];
      this.notify();
      return;
    }

    this.filteredList = this.masterList.filter((centre) => {
      const name = (centre.properties.NAME || "").toLowerCase();
      const postal = String(centre.properties.ADDRESSPOSTALCODE || "").toLowerCase();
      return name.includes(keyword) || postal.includes(keyword);
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
    };
  }
}
