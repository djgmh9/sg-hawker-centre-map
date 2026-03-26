export class ScopeOverlayView {
  constructor(map) {
    this.map = map;
    this.geoScopeLayer = L.featureGroup();
    this.map.addLayer(this.geoScopeLayer);

    this.scopeChipElement = document.createElement("p");
    this.scopeChipElement.className = "map-scope-chip";
    this.scopeChipElement.hidden = true;
    this.map.getContainer().appendChild(this.scopeChipElement);
  }

  render(activeGeoScope) {
    this.geoScopeLayer.clearLayers();
    this.renderScopeChip(activeGeoScope);

    if (!activeGeoScope?.boundaryFeature) {
      return;
    }

    const boundary = L.geoJSON(activeGeoScope.boundaryFeature, {
      color: "#0f7b6c",
      weight: 2,
      fillColor: "#0f7b6c",
      fillOpacity: 0.08,
      dashArray: "7 5",
      interactive: false,
      className: "geo-scope-boundary",
    });

    boundary.addTo(this.geoScopeLayer);
  }

  renderScopeChip(activeGeoScope) {
    if (!activeGeoScope) {
      this.scopeChipElement.hidden = true;
      this.scopeChipElement.textContent = "";
      return;
    }

    const label =
      activeGeoScope.type === "planning-area"
        ? `${activeGeoScope.name} (${activeGeoScope.regionName})`
        : activeGeoScope.name;

    this.scopeChipElement.hidden = false;
    this.scopeChipElement.textContent = `Scope: ${label}`;
  }
}
