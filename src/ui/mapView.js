import { ScopeOverlayView } from "./scopeOverlayView.js";
import { MarkerStyleView } from "./markerStyleView.js";

const SG_CENTER = [1.3521, 103.8198];
const SG_ZOOM = 11;

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

  const block = String(
    properties.ADDRESSBLOCKHOUSENUMBER || ""
  ).trim();
  const street = String(
    properties.ADDRESSSTREETNAME || ""
  ).trim();
  const postal = String(properties.ADDRESSPOSTALCODE || "").trim();

  return [block, street, postal].filter(Boolean).join(" ");
}

function detailsHtml(feature) {
  if (!feature) {
    return `
      <h2 class="details-title">Hawker Centre Details</h2>
      <p class="details-empty">Click a map marker to view full details.</p>
    `;
  }

  const properties = feature.properties || {};
  const name = escapeHtml(properties.NAME || "Unknown hawker centre");
  const buildingName = escapeHtml(properties.ADDRESSBUILDINGNAME || "Unknown building");
  const numberOfCookedFoodStalls = escapeHtml(properties.NUMBER_OF_COOKED_FOOD_STALLS || "N/A");
  const address = escapeHtml(buildAddress(properties) || "Address unavailable");
  // const postal = escapeHtml(
  //   properties.ADDRESSPOSTALCODE || "Unknown postal code"
  // );
  const lat = Number(feature.location?.lat);
  const lng = Number(feature.location?.lng);
  const location =
    Number.isFinite(lat) && Number.isFinite(lng)
      ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      : "Location unavailable";

  return `
    <h2 class="details-title">${name}</h2>
    <dl class="details-grid">
      <div>
        <dt>Building</dt>
        <dd>${buildingName}</dd>
      </div>
      <div>
        <dt>Address</dt>
        <dd>${address}</dd>
      </div>
      <div>
        <dt>Number of Cooked Food Stalls</dt>
        <dd>${numberOfCookedFoodStalls}</dd>
      </div>
      <div>
        <dt>Coordinates</dt>
        <dd>${location}</dd>
      </div>
    </dl>
  `;
}

function tooltipHtml(properties) {
  const name = escapeHtml(properties.NAME || "Unknown hawker centre");
  const address = escapeHtml(buildAddress(properties) || "Address unavailable");

  return `
    <p class="tooltip-title">${name}</p>
    <p class="tooltip-body">${address}</p>
  `;
}

export class HawkerMapView {
  constructor({ mapElementId, detailsElementId }) {
    this.detailsElement =
      typeof detailsElementId === "string"
        ? document.getElementById(detailsElementId)
        : null;
    this.markersByFeatureId = new Map();
    this.markerStyleView = new MarkerStyleView();

    this.map = L.map(mapElementId, {
      zoomControl: true,
      minZoom: 11,
      maxZoom: 18,
    }).setView(SG_CENTER, SG_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(this.map);

    this.clusterLayer = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      removeOutsideVisibleBounds: true,
    });

    this.map.addLayer(this.clusterLayer);
    this.scopeOverlayView = new ScopeOverlayView(this.map);
    this.updateDetails(null);
  }

  closeAllTooltips() {
    this.markersByFeatureId.forEach((marker) => {
      marker.closeTooltip();
    });
  }

  revealFeature(feature, { shouldPan = false } = {}) {
    if (!feature) {
      return;
    }

    this.closeAllTooltips();

    const marker = this.markersByFeatureId.get(feature.id);
    if (!marker) {
      return;
    }

    const openMarkerTooltip = () => {
      marker.openTooltip();
    };

    if (shouldPan) {
      const visibleParent = this.clusterLayer.getVisibleParent(marker);

      if (visibleParent !== marker) {
        this.clusterLayer.zoomToShowLayer(marker, openMarkerTooltip);
        return;
      }

      this.map.panTo(marker.getLatLng(), {
        animate: true,
        duration: 0.25,
      });
      openMarkerTooltip();
      return;
    }

    openMarkerTooltip();
  }

  updateDetails(feature) {
    if (!this.detailsElement) {
      return;
    }

    this.detailsElement.innerHTML = detailsHtml(feature);
  }

  findFeatureById(features, id) {
    if (!id) {
      return null;
    }

    return features.find((feature) => feature.id === id) || null;
  }

  getTooltipPlacement(lat, lng) {
    const mapSize = this.map.getSize();
    const point = this.map.latLngToContainerPoint([lat, lng]);
    const edgePadding = 16;
    const horizontalThreshold = 240;

    const isLeft = point.x <= edgePadding + horizontalThreshold;
    const isRight = mapSize.x - point.x <= edgePadding + horizontalThreshold;

    if (isLeft) return { direction: "right", offset: [12, 0] };
    if (isRight) return { direction: "left", offset: [-12, 0] };

    return { direction: "top", offset: [0, -12] };
  }

  shouldMoveToSingleFeature(feature, targetZoom = 16) {
    const target = L.latLng(feature.location.lat, feature.location.lng);
    const currentCenter = this.map.getCenter();
    const distanceToTarget = this.map.distance(currentCenter, target);
    const zoomReached = this.map.getZoom() >= targetZoom;

    return distanceToTarget > 20 || !zoomReached;
  }

  shouldMoveToBounds(bounds) {
    const currentBounds = this.map.getBounds();
    const targetCenter = bounds.getCenter();
    const currentCenter = currentBounds.getCenter();
    const centerDistance = this.map.distance(currentCenter, targetCenter);

    return !currentBounds.contains(bounds) || centerDistance > 40;
  }

  autoFocus(features, shouldFocus) {
    if (!shouldFocus || features.length === 0) {
      return;
    }

    if (features.length === 1) {
      const [single] = features;

      if (!this.shouldMoveToSingleFeature(single, 16)) {
        return;
      }

      this.map.flyTo([single.location.lat, single.location.lng], 16, {
        animate: true,
        duration: 0.35,
      });
      return;
    }

    const bounds = L.latLngBounds(
      features.map((feature) => [feature.location.lat, feature.location.lng])
    );

    if (!this.shouldMoveToBounds(bounds)) {
      return;
    }

    this.map.fitBounds(bounds.pad(0.2), {
      animate: true,
      duration: 0.35,
      maxZoom: 16,
    });
  }

  render(features, {
    shouldAutoFocus = false,
    activeGeoScope = null,
    selectedFeatureId = null,
    onSelect = null,
  } = {}) {
    this.clusterLayer.clearLayers();
    this.markersByFeatureId.clear();
    this.scopeOverlayView.render(activeGeoScope);

    const selectedFeatureInView = this.findFeatureById(features, selectedFeatureId);
    this.updateDetails(selectedFeatureInView);

    const markers = features
      .map((feature) => {
        const { lat, lng } = feature.location;
        const marker = L.marker([lat, lng], {
          icon: this.markerStyleView.getBaseIcon(),
        });
        const isSelected = feature.id === selectedFeatureId;
        const initialPlacement = this.getTooltipPlacement(lat, lng);

        marker.bindTooltip(tooltipHtml(feature.properties), {
          direction: initialPlacement.direction,
          offset: initialPlacement.offset,
          className: "hawker-tooltip",
          opacity: 0.96,
        });
        marker.on("mouseover", () => {
          const placement = this.getTooltipPlacement(lat, lng);
          const tooltip = marker.getTooltip();

          if (tooltip) {
            tooltip.options.direction = placement.direction;
            tooltip.options.offset = L.point(
              placement.offset[0],
              placement.offset[1]
            );
          }

          this.markerStyleView.apply(marker, {
            selected: feature.id === selectedFeatureId,
            hovered: true,
          });
          marker.openTooltip();
        });
        marker.on("mouseout", () => {
          this.markerStyleView.apply(marker, {
            selected: feature.id === selectedFeatureId,
          });
          marker.closeTooltip();
        });
        marker.on("click", () => {
          if (typeof onSelect === "function") {
            onSelect(feature, { shouldPan: false });
          }
        });

        this.markerStyleView.apply(marker, {
          selected: isSelected,
        });
        this.markersByFeatureId.set(feature.id, marker);

        return marker;
      })
      .filter(Boolean);

    this.clusterLayer.addLayers(markers);

    if (selectedFeatureInView) {
      this.revealFeature(selectedFeatureInView, { shouldPan: false });
    } else {
      this.closeAllTooltips();
    }

    this.autoFocus(features, shouldAutoFocus);
  }
}
