function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildAddress(properties) {
  const preferred = properties.ADDRESS_MYENV;

  if (preferred && String(preferred).trim()) {
    return String(preferred).trim();
  }

  const block = String(properties.ADDRESSBLOCKHOUSENUMBER || "").trim();
  const street = String(properties.ADDRESSSTREETNAME || "").trim();
  return [block, street].filter(Boolean).join(" ");
}

export function renderSearchResults(resultsElement, {
  searchText,
  features,
  selectedFeatureId,
  onSelect,
}) {
  if (!resultsElement) {
    return;
  }

  const query = String(searchText || "").trim();

  if (!query) {
    resultsElement.hidden = false;
    resultsElement.innerHTML = '<p class="search-results-empty">Start typing to see matching hawker centres.</p>';
    return;
  }

  const allResults = features || [];

  if (allResults.length === 0) {
    resultsElement.hidden = false;
    resultsElement.innerHTML = '<p class="search-results-empty">No matching hawker centres.</p>';
    return;
  }

  const listHtml = allResults
    .map((feature) => {
      const isActive = feature.id === selectedFeatureId;
      const properties = feature.properties || {};
      const name = escapeHtml(properties.NAME || "Unknown hawker centre");
      const address = escapeHtml(buildAddress(properties) || "Address unavailable");
      const activeClass = isActive ? " search-result-item--active" : "";

      return `
        <li>
          <button
            type="button"
            class="search-result-item${activeClass}"
            data-feature-id="${escapeHtml(feature.id)}"
          >
            <span class="search-result-title">${name}</span>
            <span class="search-result-subtitle">${address}</span>
          </button>
        </li>
      `;
    })
    .join("");

  resultsElement.hidden = false;
  resultsElement.innerHTML = `
    <ul class="search-results-list">
      ${listHtml}
    </ul>
  `;

  resultsElement
    .querySelectorAll(".search-result-item")
    .forEach((button) => {
      button.addEventListener("click", () => {
        const featureId = button.getAttribute("data-feature-id");
        const selectedFeature = (features || []).find((feature) => feature.id === featureId);

        if (selectedFeature && typeof onSelect === "function") {
          onSelect(selectedFeature);
        }
      });
    });
}
