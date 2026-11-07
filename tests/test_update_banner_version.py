#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""The PWA update banner names the new version, not just "there is an update"."""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SW_MGR = (ROOT / "src" / "islands" / "ServiceWorkerManager.js").read_text(encoding="utf-8")
SW = (ROOT / "sw.js").read_text(encoding="utf-8")


class TestUpdateBannerVersion(unittest.TestCase):
    def test_service_worker_reports_its_version(self):
        self.assertIn("event.data.type !== 'GET_VERSION'", SW)
        self.assertIn("version: APP_VERSION", SW)

    def test_version_file_bypasses_service_worker_cache(self):
        self.assertIn("url.pathname.endsWith('/VERSION')) return;", SW)

    def test_banner_asks_new_worker_with_version_file_fallback(self):
        self.assertIn("worker.postMessage({ type: 'GET_VERSION' }", SW_MGR)
        self.assertIn("fetch('VERSION?_=' + Date.now(), { cache: 'no-store' })", SW_MGR)
        self.assertIn("showUpdateNotification(newWorker)", SW_MGR)
        self.assertIn("showUpdateNotification(reg.waiting)", SW_MGR)

    def test_banner_text_names_new_and_current_version(self):
        self.assertIn("'🚀 Đã có phiên bản 汉字思维 mới v' +", SW_MGR)
        self.assertIn("newVersion", SW_MGR)
        self.assertIn("' (bạn đang dùng v' + current + ')'", SW_MGR)


if __name__ == "__main__":
    unittest.main()
