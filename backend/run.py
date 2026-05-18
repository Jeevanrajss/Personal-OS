"""
Entry point for the packaged desktop app (PyInstaller bundle).
In dev, use uvicorn directly:  uvicorn app.main:app --reload
"""
from __future__ import annotations

import os
import sys

# ── Packaged-app setup ────────────────────────────────────────────────────────
# When running as a PyInstaller bundle sys.frozen is True.
# We set env vars here so app/config.py picks them up before it imports.
if getattr(sys, "frozen", False):
    bundle_dir = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))

    # Tell the backend where the React build lives inside the bundle
    if not os.environ.get("FRONTEND_DIST"):
        os.environ["FRONTEND_DIST"] = os.path.join(bundle_dir, "frontend_dist")

    # Force production mode
    os.environ.setdefault("APP_ENV", "production")

    # Disable SQLCipher in packaged build (Windows compat, PERSONAL_OS_DATA_DIR
    # is set by Electron before spawning this process)
    os.environ.setdefault("DB_ENCRYPTION", "false")

# ── Start server ──────────────────────────────────────────────────────────────
import uvicorn  # noqa: E402 — must come after env setup

if __name__ == "__main__":
    port = int(os.environ.get("APP_PORT", "9847"))
    host = os.environ.get("APP_HOST", "127.0.0.1")
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        log_level="info",
        # No --reload in packaged mode
        reload=False,
    )
