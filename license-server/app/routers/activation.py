"""
Public endpoints called by the desktop app.
  POST /activate  — first-time activation (binds key to machine)
  POST /verify    — called on every app startup to confirm key is still valid
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LicenseKey

router = APIRouter(tags=["activation"])


# ── Request / response models ─────────────────────────────────────────────────

class ActivateRequest(BaseModel):
    key: str
    machine_id: str


class ActivateResponse(BaseModel):
    ok: bool
    message: str


class VerifyRequest(BaseModel):
    key: str
    machine_id: str


class VerifyResponse(BaseModel):
    valid: bool
    reason: Optional[str] = None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/activate", response_model=ActivateResponse)
def activate(req: ActivateRequest, db: Session = Depends(get_db)) -> ActivateResponse:
    """
    Bind a registration key to a machine on first use.
    Subsequent activations from the same machine succeed silently.
    """
    key = req.key.strip().upper()
    machine_id = req.machine_id.strip()

    if not key or not machine_id:
        raise HTTPException(400, "key and machine_id are required")

    record: LicenseKey | None = db.query(LicenseKey).filter(LicenseKey.key == key).first()

    if not record:
        raise HTTPException(404, "Invalid registration key")

    if record.is_revoked:
        raise HTTPException(403, "This registration key has been revoked")

    if record.machine_id is None:
        # First activation — bind to this machine
        record.machine_id = machine_id
        record.activated_at = datetime.utcnow()
        record.last_seen_at = datetime.utcnow()
        db.commit()
        return ActivateResponse(ok=True, message="Activated successfully")

    if record.machine_id == machine_id:
        # Same machine — refresh last_seen
        record.last_seen_at = datetime.utcnow()
        db.commit()
        return ActivateResponse(ok=True, message="Already activated on this device")

    # Different machine — reject
    raise HTTPException(
        409,
        "This key is already registered to another device. "
        "Contact the admin to reset your device binding.",
    )


@router.post("/verify", response_model=VerifyResponse)
def verify(req: VerifyRequest, db: Session = Depends(get_db)) -> VerifyResponse:
    """
    Called on every app startup to check the key is still valid.
    Returns { valid: true } or { valid: false, reason: "..." }.
    """
    key = req.key.strip().upper()
    machine_id = req.machine_id.strip()

    record: LicenseKey | None = db.query(LicenseKey).filter(LicenseKey.key == key).first()

    if not record:
        return VerifyResponse(valid=False, reason="invalid_key")

    if record.is_revoked:
        return VerifyResponse(valid=False, reason="revoked")

    if record.machine_id != machine_id:
        return VerifyResponse(valid=False, reason="wrong_device")

    # Valid — update last_seen
    record.last_seen_at = datetime.utcnow()
    db.commit()
    return VerifyResponse(valid=True)
