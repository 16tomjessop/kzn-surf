#!/usr/bin/env python3
"""
Local, user-driven Facebook photo capture helper for the KZN Surf project.

This tool does not log in to Facebook, automate scrolling, or bypass access
controls. It only receives photo URLs and visible metadata that the user
deliberately sends from their own browser session.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import mimetypes
import os
import re
import secrets
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "data" / "facebook-capture"
BOOKMARKLET_SOURCE = Path(__file__).with_name("bookmarklet.js")
MAX_BODY_BYTES = 8 * 1024 * 1024
MAX_IMAGE_BYTES = 30 * 1024 * 1024

CSV_FIELDS = [
    "id",
    "captured_at",
    "batch_note",
    "group_hint",
    "page_url",
    "post_url",
    "raw_time_text",
    "timezone",
    "image_url",
    "local_path",
    "download_status",
    "http_status",
    "bytes",
    "image_width",
    "image_height",
    "image_alt",
    "context_text",
]

TRACKING_PARAMS = {
    "__cft__",
    "__tn__",
    "comment_id",
    "reply_comment_id",
    "notif_id",
    "notif_t",
    "ref",
    "refid",
    "mibextid",
    "paipv",
    "locale",
    "eav",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")


def clean_text(value: Any, limit: int = 1000) -> str:
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:limit]


def canonical_url(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    try:
        parsed = urllib.parse.urlsplit(raw)
    except ValueError:
        return raw
    query = [
        (key, val)
        for key, val in urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
        if key not in TRACKING_PARAMS and not key.startswith("__")
    ]
    return urllib.parse.urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urllib.parse.urlencode(query, doseq=True),
            "",
        )
    )


def stable_id(item: dict[str, Any]) -> str:
    image_url = canonical_url(item.get("image_url") or item.get("imageUrl"))
    post_url = canonical_url(item.get("post_url") or item.get("postUrl"))
    image_fingerprint = image_url.split("?")[0]
    payload = "|".join(
        [
            image_fingerprint,
            post_url,
            str(item.get("image_width") or item.get("imageWidth") or ""),
            str(item.get("image_height") or item.get("imageHeight") or ""),
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:18]


def safe_extension(url: str, content_type: str | None) -> str:
    if content_type:
        ext = mimetypes.guess_extension(content_type.split(";")[0].strip().lower())
        if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
            return ".jpg" if ext == ".jpe" else ext
    path = urllib.parse.urlsplit(url).path
    ext = Path(path).suffix.lower()
    if ext in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        return ext
    return ".jpg"


def ensure_csv(path: Path) -> None:
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()


def existing_ids(csv_path: Path) -> set[str]:
    if not csv_path.exists():
        return set()
    with csv_path.open("r", newline="", encoding="utf-8") as handle:
        return {row.get("id", "") for row in csv.DictReader(handle) if row.get("id")}


def append_csv(csv_path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    ensure_csv(csv_path)
    with csv_path.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS, extrasaction="ignore")
        for row in rows:
            writer.writerow({field: row.get(field, "") for field in CSV_FIELDS})


def append_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def download_image(url: str, out_dir: Path, record_id: str) -> dict[str, Any]:
    if not url.startswith(("http://", "https://")):
        return {"download_status": "skipped", "http_status": "", "bytes": 0, "local_path": ""}

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari"
            ),
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            status = getattr(response, "status", 200)
            content_type = response.headers.get("Content-Type", "")
            ext = safe_extension(url, content_type)
            image_dir = out_dir / "images"
            image_dir.mkdir(parents=True, exist_ok=True)
            final_path = image_dir / f"{record_id}{ext}"
            temp_path = image_dir / f".{record_id}{ext}.part"

            total = 0
            with temp_path.open("wb") as handle:
                while True:
                    chunk = response.read(1024 * 128)
                    if not chunk:
                        break
                    total += len(chunk)
                    if total > MAX_IMAGE_BYTES:
                        raise ValueError(f"image exceeds {MAX_IMAGE_BYTES // (1024 * 1024)} MB limit")
                    handle.write(chunk)
            temp_path.replace(final_path)
            return {
                "download_status": "downloaded",
                "http_status": status,
                "bytes": total,
                "local_path": str(final_path.relative_to(out_dir)),
            }
    except Exception as exc:  # noqa: BLE001 - store the reason for later triage.
        return {
            "download_status": f"error: {clean_text(exc, 180)}",
            "http_status": getattr(exc, "code", ""),
            "bytes": 0,
            "local_path": "",
        }


def normalize_item(batch: dict[str, Any], item: dict[str, Any], out_dir: Path, do_download: bool) -> dict[str, Any]:
    image_url = canonical_url(item.get("imageUrl") or item.get("image_url"))
    post_url = canonical_url(item.get("postUrl") or item.get("post_url") or batch.get("pageUrl"))
    record = {
        "captured_at": clean_text(batch.get("capturedAt") or now_iso(), 80),
        "batch_note": clean_text(batch.get("batchNote"), 300),
        "group_hint": clean_text(batch.get("groupHint"), 220),
        "page_url": canonical_url(batch.get("pageUrl")),
        "post_url": post_url,
        "raw_time_text": clean_text(item.get("rawTimeText") or item.get("raw_time_text"), 220),
        "timezone": clean_text(batch.get("timezone"), 100),
        "image_url": image_url,
        "local_path": "",
        "download_status": "not_downloaded",
        "http_status": "",
        "bytes": 0,
        "image_width": item.get("imageWidth") or item.get("image_width") or "",
        "image_height": item.get("imageHeight") or item.get("image_height") or "",
        "image_alt": clean_text(item.get("imageAlt") or item.get("image_alt"), 300),
        "context_text": clean_text(item.get("contextText") or item.get("context_text"), 700),
    }
    record["id"] = stable_id(record)
    if do_download:
        record.update(download_image(image_url, out_dir, record["id"]))
    return record


def html_page(server: "CaptureServer") -> bytes:
    bookmarklet = make_bookmarklet(server)
    escaped_bookmarklet = html.escape(bookmarklet, quote=True)
    out_dir = html.escape(str(server.out_dir))
    token = html.escape(server.token)
    body = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KZN Surf Facebook Capture</title>
  <style>
    :root {{ color-scheme: light dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }}
    body {{ max-width: 920px; margin: 0 auto; padding: 32px 20px 56px; line-height: 1.5; }}
    h1 {{ margin: 0 0 8px; font-size: 28px; }}
    h2 {{ margin-top: 32px; }}
    code, textarea {{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }}
    .card {{ border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 8px; padding: 18px; margin: 18px 0; }}
    .bookmarklet {{ display: inline-flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 6px; background: #0b6b8f; color: white; text-decoration: none; font-weight: 700; }}
    .muted {{ color: color-mix(in srgb, CanvasText 68%, transparent); }}
    textarea {{ box-sizing: border-box; width: 100%; min-height: 180px; padding: 12px; border-radius: 6px; }}
    button {{ border: 0; border-radius: 6px; padding: 10px 14px; background: #0b6b8f; color: white; font-weight: 700; cursor: pointer; }}
    li + li {{ margin-top: 8px; }}
    .status {{ margin-top: 12px; font-weight: 700; }}
  </style>
</head>
<body>
  <h1>KZN Surf Facebook Capture</h1>
  <p class="muted">Local helper for saving permitted surf-photo references into <code>{out_dir}</code>.</p>

  <div class="card">
    <h2>Bookmarklet</h2>
    <p>Drag this button to your bookmarks bar, then click it while permitted Skinny Surfers Durban photos are visible in Facebook.</p>
    <p><a class="bookmarklet" href="{escaped_bookmarklet}">Capture visible surf photos</a></p>
    <p class="muted">The helper does not log in, scroll the page, or store Facebook cookies. It only receives what you explicitly send.</p>
  </div>

  <div class="card" id="paste">
    <h2>Paste Fallback</h2>
    <p>If Facebook blocks direct local saving, the bookmarklet copies the capture batch. Paste it here.</p>
    <textarea id="payload" placeholder="Paste copied capture JSON here"></textarea>
    <p><button id="importBtn" type="button">Import pasted batch</button></p>
    <div id="status" class="status"></div>
  </div>

  <h2>Workflow</h2>
  <ol>
    <li>Use this only for photos the group rules and posters allow you to save for this project.</li>
    <li>Open the Facebook group or a photo viewer while this local server is running.</li>
    <li>Scroll manually until the surf photos you want are visible, then run the bookmarklet.</li>
    <li>Repeat in batches. New records go to <code>photos.csv</code>; images that can be fetched go to <code>images/</code>.</li>
  </ol>

  <script>
    const token = {json.dumps(token)};
    const statusEl = document.querySelector('#status');
    document.querySelector('#importBtn').addEventListener('click', async () => {{
      statusEl.textContent = 'Importing...';
      try {{
        const payload = JSON.parse(document.querySelector('#payload').value);
        payload.token = payload.token || token;
        const response = await fetch('/capture', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json', 'X-Capture-Token': token }},
          body: JSON.stringify(payload)
        }});
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || response.statusText);
        statusEl.textContent = `Saved ${{result.saved}} new record(s), downloaded ${{result.downloaded}}, skipped ${{result.duplicates}} duplicate(s).`;
      }} catch (error) {{
        statusEl.textContent = `Import failed: ${{error.message || error}}`;
      }}
    }});
  </script>
</body>
</html>"""
    return body.encode("utf-8")


def make_bookmarklet(server: "CaptureServer") -> str:
    source = BOOKMARKLET_SOURCE.read_text(encoding="utf-8")
    source = source.replace("__CAPTURE_ENDPOINT__", f"{server.base_url}/capture")
    source = source.replace("__CAPTURE_TOKEN__", server.token)
    wrapped = f"(function(){{\n{source}\n}})();"
    return "javascript:" + urllib.parse.quote(wrapped, safe="")


class CaptureServer(ThreadingHTTPServer):
    def __init__(self, server_address: tuple[str, int], handler_class: type[BaseHTTPRequestHandler], out_dir: Path, download: bool):
        super().__init__(server_address, handler_class)
        self.out_dir = out_dir
        self.download = download
        self.token = secrets.token_urlsafe(24)
        host, port = self.server_address
        self.base_url = f"http://{host}:{port}"


class Handler(BaseHTTPRequestHandler):
    server: CaptureServer

    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("[%s] %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

    def send_cors(self) -> None:
        origin = self.headers.get("Origin") or "*"
        self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Capture-Token")
        self.send_header("Access-Control-Allow-Private-Network", "true")

    def write_json(self, status: int, payload: dict[str, Any], cors: bool = False) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        if cors:
            self.send_cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self.send_cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        path = urllib.parse.urlsplit(self.path).path
        if path in {"/", "/index.html"}:
            body = html_page(self.server)
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/bookmarklet.txt":
            body = make_bookmarklet(self.server).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == "/health":
            self.write_json(200, {"ok": True, "out_dir": str(self.server.out_dir)})
            return
        self.send_error(404)

    def do_POST(self) -> None:  # noqa: N802
        path = urllib.parse.urlsplit(self.path).path
        if path != "/capture":
            self.send_error(404)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.write_json(400, {"error": "Invalid content length"}, cors=True)
            return

        if length <= 0 or length > MAX_BODY_BYTES:
            self.write_json(413, {"error": "Capture payload is empty or too large"}, cors=True)
            return

        try:
            batch = json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError as exc:
            self.write_json(400, {"error": f"Invalid JSON: {exc}"}, cors=True)
            return

        token = self.headers.get("X-Capture-Token") or batch.get("token")
        if token != self.server.token:
            self.write_json(403, {"error": "Capture token mismatch. Restart from the local dashboard bookmarklet."}, cors=True)
            return

        items = batch.get("items")
        if not isinstance(items, list):
            self.write_json(400, {"error": "Capture payload must contain an items array"}, cors=True)
            return

        out_dir = self.server.out_dir
        out_dir.mkdir(parents=True, exist_ok=True)
        csv_path = out_dir / "photos.csv"
        jsonl_path = out_dir / "captures.jsonl"
        seen = existing_ids(csv_path)
        rows: list[dict[str, Any]] = []
        duplicates = 0

        for raw_item in items:
            if not isinstance(raw_item, dict):
                continue
            record = normalize_item(batch, raw_item, out_dir, self.server.download)
            if not record["image_url"]:
                continue
            if record["id"] in seen:
                duplicates += 1
                continue
            seen.add(record["id"])
            rows.append(record)

        append_csv(csv_path, rows)
        append_jsonl(jsonl_path, rows)
        downloaded = sum(1 for row in rows if row.get("download_status") == "downloaded")
        errors = [row["download_status"] for row in rows if str(row.get("download_status", "")).startswith("error:")]
        self.write_json(
            200,
            {
                "ok": True,
                "saved": len(rows),
                "duplicates": duplicates,
                "downloaded": downloaded,
                "download_errors": len(errors),
                "out_dir": str(out_dir),
            },
            cors=True,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the local KZN Surf Facebook capture helper.")
    parser.add_argument("--host", default="127.0.0.1", help="Local interface to bind. Keep this as 127.0.0.1 unless you know why.")
    parser.add_argument("--port", type=int, default=8765, help="Local port for the dashboard.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUTPUT_DIR, help="Output directory for CSV and images.")
    parser.add_argument("--no-download", action="store_true", help="Save metadata only; do not try to download image URLs.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    out_dir = args.out.expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    server = CaptureServer((args.host, args.port), Handler, out_dir=out_dir, download=not args.no_download)
    print(f"KZN Surf Facebook Capture running at {server.base_url}")
    print(f"Saving records to {out_dir}")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
