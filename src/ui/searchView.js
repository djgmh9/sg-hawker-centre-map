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
}) {
  if (loading) {
    return "Loading hawker centres from data.gov.sg...";
  }

  if (error) {
    return `Could not load hawker centres: ${error}`;
  }

  if (shownCount === 0 && searchText.trim()) {
    return `No matches for \"${searchText.trim()}\".`;
  }

  if (searchText.trim()) {
    return `Showing ${shownCount} of ${totalCount} hawker centres.`;
  }

  return `Showing all ${totalCount} hawker centres.`;
}
