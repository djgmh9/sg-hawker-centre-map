export function setupSearchView({ inputElement, onSearch }) {
  inputElement.addEventListener("input", (event) => {
    onSearch(event.target.value);
  });
}

export function buildStatusMessage({
  loading,
  error,
  totalCount,
  shownCount,
  searchText,
  activeGeoScope,
  residualKeyword,
}) {
  if (loading) {
    return "Loading hawker centres from data.gov.sg...";
  }

  if (error) {
    return `Could not load hawker centres: ${error}`;
  }

  if (shownCount === 0 && searchText.trim()) {
    if (activeGeoScope) {
      if (residualKeyword) {
        return `No hawker centres found in ${activeGeoScope.name} matching "${residualKeyword}".`;
      }

      return `No hawker centres found in ${activeGeoScope.name}.`;
    }

    return `No matches for \"${searchText.trim()}\".`;
  }

  if (searchText.trim()) {
    if (activeGeoScope) {
      if (residualKeyword) {
        return `Showing ${shownCount} of ${totalCount} hawker centres in ${activeGeoScope.name} matching "${residualKeyword}".`;
      }

      return `Showing ${shownCount} of ${totalCount} hawker centres in ${activeGeoScope.name}.`;
    }

    return `Showing ${shownCount} of ${totalCount} hawker centres.`;
  }

  return `Showing all ${totalCount} hawker centres.`;
}
