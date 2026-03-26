const LOCAL_PROXY_ENDPOINT = "/api/hawker-centres";

async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }

  return response.json();
}

async function fetchFromLocalProxy() {
  return fetchJson(LOCAL_PROXY_ENDPOINT);
}

export async function fetchHawkerGeoJson() {
  try {
    return await fetchFromLocalProxy();
  } catch (_proxyError) {
    // Proxy is offline, log the error.
    console.warn("Local proxy fetch failed.", _proxyError);
    throw new Error("Unable to fetch hawker centre data. Please try again later.");
  }
}
