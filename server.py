#!/usr/bin/env python3
"""Tiny static file server for local dev / preview.
Avoids `python3 -m http.server` which calls os.getcwd() at import (blocked in
some sandboxes). Serves this file's own directory. Usage: python3 server.py [port]
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", 8000))

Handler = partial(SimpleHTTPRequestHandler, directory=ROOT)
httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
print(f"Serving {ROOT} at http://127.0.0.1:{PORT}")
httpd.serve_forever()
