#!/usr/bin/env python3
"""
tools/capture_readme_screenshots.py
Captures updated, pixel-perfect screenshots of the modern Hanzi Mind UI for README.md using CDP.
"""

import asyncio
import base64
import http.server
import json
import os
from pathlib import Path
import socketserver
import subprocess
import threading
import time
import requests
import websockets

REPO_ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS_DIR = REPO_ROOT / "assets" / "images" / "screenshots"
SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

EDGE_BIN = "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
PORT = 8998
CDP_PORT = 9222


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO_ROOT), **kwargs)

    def log_message(self, format, *args):
        pass


class ScreenshotCapturer:
    def __init__(self):
        self.httpd = None
        self.edge_proc = None

    def start_server(self):
        self.httpd = socketserver.TCPServer(("", PORT), QuietHandler)
        t = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        t.start()

    def start_edge(self):
        self.edge_proc = subprocess.Popen([
            EDGE_BIN,
            "--headless=new",
            f"--remote-debugging-port={CDP_PORT}",
            "--disable-gpu",
            "--disable-extensions",
            "about:blank"
        ])
        for _ in range(30):
            try:
                r = requests.get(f"http://127.0.0.1:{CDP_PORT}/json/list", timeout=1)
                if r.status_code == 200:
                    return
            except Exception:
                time.sleep(0.2)
        raise RuntimeError("Failed to start Edge with CDP")

    async def capture_task(self, filename, url, js_action=None, wait_secs=2.0):
        targets = requests.get(f"http://127.0.0.1:{CDP_PORT}/json/list").json()
        page_target = next(t for t in targets if t.get("type") == "page")
        ws_url = page_target["webSocketDebuggerUrl"]

        async with websockets.connect(ws_url, max_size=100_000_000) as ws:
            msg_id = 1

            async def call(method, params=None):
                nonlocal msg_id
                mid = msg_id
                msg_id += 1
                await ws.send(json.dumps({"id": mid, "method": method, "params": params or {}}))
                while True:
                    resp = json.loads(await ws.recv())
                    if resp.get("id") == mid:
                        return resp.get("result", {})

            await call("Page.enable")
            await call("Runtime.enable")
            await call("Emulation.setDeviceMetricsOverride", {
                "width": 1280,
                "height": 820,
                "deviceScaleFactor": 1,
                "mobile": False
            })

            print(f"[*] Navigating to {url}...")
            await call("Page.navigate", {"url": url})
            await asyncio.sleep(wait_secs)

            if js_action:
                print(f"[*] Executing JS action for {filename}...")
                await call("Runtime.evaluate", {"expression": js_action, "awaitPromise": True})
                await asyncio.sleep(1.0)

            res = await call("Page.captureScreenshot", {"format": "png"})
            data = base64.b64decode(res["data"])
            out_path = SCREENSHOTS_DIR / filename
            with open(out_path, "wb") as f:
                f.write(data)
            print(f"  [✓] Saved {filename} ({len(data):,} bytes)")

    async def run_all(self):
        tasks = [
            (
                "01_dashboard.png",
                f"http://127.0.0.1:{PORT}/index.html?theme=dark",
                None,
                2.0
            ),
            (
                "02_flashcard_front.png",
                f"http://127.0.0.1:{PORT}/index.html?level=hsk30_1&theme=dark",
                """(async () => {
                    localStorage.setItem('hsk_show_illustrations_v2', 'true');
                    showIllustration = true;
                    document.body.classList.remove('hide-illustrations');
                    document.documentElement.classList.remove('hide-illustrations');
                    const targetIdx = WORDS.findIndex(w => w.hanzi === '白天');
                    if (targetIdx !== -1) filteredOrder[idx] = targetIdx;
                    render();
                })()""",
                2.5
            ),
            (
                "02_flashcard_back.png",
                f"http://127.0.0.1:{PORT}/index.html?level=hsk30_1&theme=dark",
                """(async () => {
                    localStorage.setItem('hsk_show_illustrations_v2', 'true');
                    showIllustration = true;
                    document.body.classList.remove('hide-illustrations');
                    document.documentElement.classList.remove('hide-illustrations');
                    await loadLevelIllustrationPack('hsk30_1');
                    const targetIdx = WORDS.findIndex(w => w.hanzi === '白天');
                    if (targetIdx !== -1) filteredOrder[idx] = targetIdx;
                    render();
                    if (!document.getElementById('meaning').classList.contains('show')) {
                        flip();
                    }
                })()""",
                2.5
            ),
            (
                "02_flashcard_writing.png",
                f"http://127.0.0.1:{PORT}/index.html?level=hsk30_1&theme=dark",
                """(async () => {
                    const targetIdx = WORDS.findIndex(w => w.hanzi === '白天');
                    if (targetIdx !== -1) filteredOrder[idx] = targetIdx;
                    render();
                    toggleStudyWritingPanel(true);
                })()""",
                2.5
            ),
            (
                "03_reading_analysis.png",
                f"http://127.0.0.1:{PORT}/index.html?tab=reading&theme=dark",
                "if (typeof setReadingActiveMode === 'function') setReadingActiveMode('breakdown');",
                2.5
            ),
            (
                "04_radicals.png",
                f"http://127.0.0.1:{PORT}/index.html?tab=radicals&theme=dark",
                None,
                2.0
            ),
            (
                "05_sentence_game.png",
                f"http://127.0.0.1:{PORT}/index.html?tab=sentenceGame&theme=dark",
                None,
                2.5
            ),
        ]

        for filename, url, action, wait in tasks:
            await self.capture_task(filename, url, action, wait)

    def close(self):
        if self.edge_proc:
            self.edge_proc.terminate()
        if self.httpd:
            self.httpd.shutdown()


def main():
    capturer = ScreenshotCapturer()
    try:
        capturer.start_server()
        capturer.start_edge()
        asyncio.run(capturer.run_all())
    finally:
        capturer.close()


if __name__ == "__main__":
    main()
