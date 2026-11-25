#!/usr/bin/env python3
"""EMON local-AI helper (2026-11-21): the forecast seeders talk plain OpenAI-style chat to LLM_API_URL and cannot switch
a model's "thinking" off, and every small model here answers with EMPTY text when it thinks. This sits in front of
Ollama on 127.0.0.1:11439, adds  reasoning_effort: "none"  to each chat request and passes everything else through.
Only ever talks to 127.0.0.1:11436 (ollama-emon.service).  Unit: wm-llm-nothink.service."""
import json
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

UP = "http://127.0.0.1:11436"


class H(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            body = self.rfile.read(int(self.headers.get("Content-Length") or 0))
            if self.path.startswith("/v1/chat/completions"):
                try:
                    doc = json.loads(body)
                    doc.setdefault("reasoning_effort", "none")
                    doc["stream"] = False
                    body = json.dumps(doc).encode()
                except Exception:  # noqa: BLE001 - pass it through untouched
                    pass
            req = urllib.request.Request(UP + self.path, body, {"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=300) as r:
                data, code = r.read(), r.status
        except urllib.error.HTTPError as e:
            data, code = e.read(), e.code
        except Exception as e:  # noqa: BLE001
            data, code = json.dumps({"error": str(e)[:200]}).encode(), 502
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *a):
        pass


ThreadingHTTPServer(("127.0.0.1", 11439), H).serve_forever()
