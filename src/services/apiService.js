const POLL_DOWNLOAD_BASE = "https://api-open.data.gov.sg/v1/public/api/datasets";
const HAWKER_DATASET_ID = "d_4a086da0a5553be1d89383cd90d07ecd";
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

function getTemporaryDownloadUrl(pollResponse) {
  const code = pollResponse?.code;
  if (typeof code === "number" && code !== 0) {
    const apiError = pollResponse?.errorMsg || pollResponse?.errMsg || "Unknown API error";
    throw new Error(`Poll-download API returned code ${code}: ${apiError}`);
  }

  const tempUrl = pollResponse?.data?.url;

  if (!tempUrl) {
    throw new Error("Poll-download response did not contain data.url");
  }

  return tempUrl;
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
