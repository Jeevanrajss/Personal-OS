from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.database import init_db
from app.routers.activation import router as activation_router
from app.routers.admin import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Personal OS — License Server",
    version="1.0.0",
    lifespan=lifespan,
    # Hide docs in production
    docs_url="/docs" if os.getenv("APP_ENV") != "production" else None,
    redoc_url=None,
)

# CORS — allow the desktop app (localhost) and the admin dashboard (same origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Desktop app calls from file:// or localhost — allow all
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ────────────────────────────────────────────────────────────────
app.include_router(activation_router)
app.include_router(admin_router)


# ── Admin UI (static SPA) ─────────────────────────────────────────────────────
_ADMIN_UI = Path(__file__).parent.parent / "admin_ui"

if _ADMIN_UI.exists():
    # Serve admin/index.html at /admin
    @app.get("/admin", include_in_schema=False)
    @app.get("/admin/", include_in_schema=False)
    def serve_admin_ui() -> FileResponse:
        return FileResponse(_ADMIN_UI / "index.html")


# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health", include_in_schema=False)
def health() -> dict:
    return {"ok": True, "service": "personal-os-license"}
