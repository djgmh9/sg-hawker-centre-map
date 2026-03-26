export class MarkerStyleView {
  constructor() {
    const centeredAnchorOptions = {
      tooltipAnchor: [0, -32],
      popupAnchor: [0, -34],
    };

    // Keep Leaflet's built-in pin image while customizing interaction states.
    this.baseMarkerIcon = new L.Icon.Default({
      ...centeredAnchorOptions,
      className: "hawker-marker",
    });
    this.hoverMarkerIcon = new L.Icon.Default({
      ...centeredAnchorOptions,
      className: "hawker-marker hawker-marker--hover",
    });
    this.selectedMarkerIcon = new L.Icon.Default({
      ...centeredAnchorOptions,
      className: "hawker-marker hawker-marker--selected",
    });
  }

  getBaseIcon() {
    return this.baseMarkerIcon;
  }

  apply(marker, { selected = false, hovered = false } = {}) {
    let icon = this.baseMarkerIcon;
    let zIndexOffset = 0;

    if (selected) {
      icon = this.selectedMarkerIcon;
      zIndexOffset = 300;
    } else if (hovered) {
      icon = this.hoverMarkerIcon;
      zIndexOffset = 150;
    }

    if (marker.options.icon !== icon) {
      marker.setIcon(icon);
    }

    marker.setZIndexOffset(zIndexOffset);
  }
}
