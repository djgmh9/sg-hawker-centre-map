const SG_CENTER = [1.3521, 103.8198];
const SG_ZOOM = 12;

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
    properties.ADDRESSBLOCKHOUSENUMBER || properties.BLOCK || ""
  ).trim();
  const street = String(
    properties.ADDRESSSTREETNAME || properties.STREETNAME || ""
  ).trim();
  const postal = String(properties.ADDRESSPOSTALCODE || "").trim();

  return [block, street, postal].filter(Boolean).join(" ");
}

function readFirstNonEmpty(properties, keys, fallback = "") {
  for (const key of keys) {
    const value = properties?.[key];
    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }

  return fallback;
}

function getBuildingName(properties) {
  return readFirstNonEmpty(
    properties,
    ["ADDRESSBUILDINGNAME", "BUILDINGNAME", "BUILDING", "BLOCK"],
    "Unknown building"
  );
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
  const buildingName = escapeHtml(getBuildingName(properties));
  const address = escapeHtml(buildAddress(properties) || "Address unavailable");
  const postal = escapeHtml(
    readFirstNonEmpty(properties, ["ADDRESSPOSTALCODE"], "Unknown postal code")
  );
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
        <dt>Postal</dt>
        <dd>${postal}</dd>
      </div>
      <div>
        <dt>Coordinates</dt>
        <dd>${location}</dd>
      </div>
    </dl>
  `;
}

function popupHtml(properties) {
  const buildingName = escapeHtml(getBuildingName(properties));
  const name = escapeHtml(properties.NAME || "Unknown hawker centre");
  const address = escapeHtml(buildAddress(properties) || "Address unavailable");
  const postal = escapeHtml(
    properties.ADDRESSPOSTALCODE || "Unknown postal code"
  );

  return `
    <h3 class="popup-title">${name}</h3>
    <p class="popup-body"><strong>Building:</strong> ${buildingName}</p>
    <p class="popup-body">${address}</p>
    <p class="popup-body"><strong>Postal:</strong> ${postal}</p>
  `;
}

export class HawkerMapView {
  constructor({ mapElementId, detailsElementId }) {
    this.detailsElement =
      typeof detailsElementId === "string"
        ? document.getElementById(detailsElementId)
        : null;
    this.selectedFeatureId = null;

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
    this.updateDetails(null);
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

  autoFocus(features, shouldFocus) {
    if (!shouldFocus || features.length === 0) {
      return;
    }

    if (features.length === 1) {
      const [single] = features;
      this.map.flyTo([single.location.lat, single.location.lng], 16, {
        animate: true,
        duration: 0.35,
      });
      return;
    }

    const bounds = L.latLngBounds(
      features.map((feature) => [feature.location.lat, feature.location.lng])
    );
    this.map.fitBounds(bounds.pad(0.2), {
      animate: true,
      duration: 0.35,
      maxZoom: 16,
    });
  }

  render(features, { shouldAutoFocus = false } = {}) {
    this.clusterLayer.clearLayers();

    const selectedFeatureInView = this.findFeatureById(
      features,
      this.selectedFeatureId
    );

    if (!selectedFeatureInView) {
      this.selectedFeatureId = null;
      this.updateDetails(null);
    }

    const markers = features
      .map((feature) => {
        const { lat, lng } = feature.location;
        const marker = L.marker([lat, lng]);

        marker.bindPopup(popupHtml(feature.properties));
        marker.on("mouseover", () => marker.openPopup());
        marker.on("mouseout", () => marker.closePopup());
        marker.on("click", () => {
          this.selectedFeatureId = feature.id;
          this.updateDetails(feature);
        });

        return marker;
      })
      .filter(Boolean);

    this.clusterLayer.addLayers(markers);
    this.autoFocus(features, shouldAutoFocus);
  }
}
