#!/usr/bin/env python3
"""Local dev server with data.gov.sg proxy endpoint.

Run this file instead of python -m http.server so browser requests avoid
cross-origin issues on temporary S3 links.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HOST = "127.0.0.1"
PORT = 5173
DATASET_ID = "d_4a086da0a5553be1d89383cd90d07ecd"
ROOT_DIR = Path(__file__).resolve().parent
ENV_LOCAL_PATH = ROOT_DIR / ".env.local"


def load_env_local(path: Path) -> None:
    """Load simple KEY=VALUE pairs from .env.local into process environment."""
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")

        if key and key not in os.environ:
            os.environ[key] = value


load_env_local(ENV_LOCAL_PATH)

POLL_URL = (
    "https://api-open.data.gov.sg/v1/public/api/datasets/"
    f"{DATASET_ID}/poll-download"
)
API_PATH = "/api/hawker-centres"
DATA_GOV_SG_API_KEY = os.getenv("DATA_GOV_SG_API_KEY", "").strip()
DEFAULT_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/123.0.0.0 Safari/537.36"
    ),
}


def _build_headers(include_api_key: bool = False) -> dict[str, str]:
    """Build request headers and attach API key only when required."""
    headers = dict(DEFAULT_HEADERS)
    if include_api_key and DATA_GOV_SG_API_KEY:
        headers["x-api-key"] = DATA_GOV_SG_API_KEY
    return headers


def fetch_json(url: str, timeout: int = 20, include_api_key: bool = False) -> dict:
    """Fetch JSON from a URL and return parsed object."""
    request = urllib.request.Request(
        url,
        headers=_build_headers(include_api_key=include_api_key),
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            content = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"HTTP {exc.code} for {url}") from exc
    return json.loads(content)


def fetch_hawker_geojson() -> dict:
    """Perform the data.gov.sg poll-download handshake server-side."""
    poll = fetch_json(POLL_URL, include_api_key=True)
    code = poll.get("code")
    if isinstance(code, int) and code != 0:
        error_msg = poll.get("errorMsg") or poll.get("errMsg") or "Unknown API error"
        raise RuntimeError(f"poll-download code {code}: {error_msg}")

    temp_url = poll.get("data", {}).get("url")

    if not temp_url:
        raise RuntimeError("poll-download response missing data.url")

    return fetch_json(temp_url)


class AppHandler(SimpleHTTPRequestHandler):
    """Serve static files and a local API proxy endpoint."""

    def do_GET(self) -> None:
        if self.path == API_PATH:
            self._handle_hawker_api()
            return

        super().do_GET()

    def _handle_hawker_api(self) -> None:
        try:
            payload = fetch_hawker_geojson()
            body = json.dumps(payload).encode("utf-8")
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        except (urllib.error.URLError, json.JSONDecodeError, RuntimeError) as exc:
            error_body = json.dumps({"error": str(exc)}).encode("utf-8")
            self.send_response(HTTPStatus.BAD_GATEWAY)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(error_body)))
            self.end_headers()
            self.wfile.write(error_body)


def main() -> None:
    """Start local development server in project root."""
    with ThreadingHTTPServer((HOST, PORT), AppHandler) as server:
        print(f"Serving {ROOT_DIR} at http://{HOST}:{PORT}")
        server.serve_forever()


if __name__ == "__main__":
    main()
