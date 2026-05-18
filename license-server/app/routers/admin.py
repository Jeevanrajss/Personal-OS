"""
Admin endpoints — protected by Bearer token.
All routes under /admin/keys.
"""
from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LicenseKey

router = APIRouter(prefix="/admin", tags=["admin"])

ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "")


# ── Auth dependency ───────────────────────────────────────────────────────────

def require_admin(authorization: str = Header(default="")) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(500, "Server misconfigured: ADMIN_TOKEN not set")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or token != ADMIN_TOKEN:
        raise HTTPException(401, "Invalid admin token")


# ── Schemas ───────────────────────────────────────────────────────────────────

class KeyOut(BaseModel):
    id: str
    key: str
    owner_name: str
    owner_email: Optional[str]
    notes: Optional[str]
    status: str                  # "active" | "unactivated" | "revoked"
    machine_id: Optional[str]
    created_at: str
    activated_at: Optional[str]
    last_seen_at: Optional[str]
    revoked_at: Optional[str]


class CreateKeyRequest(BaseModel):
    owner_name: str
    owner_email: Optional[str] = None
    notes: Optional[str] = None


def _fmt(dt: Optional[datetime]) -> Optional[str]:
    return dt.isoformat() if dt else None


def _out(k: LicenseKey) -> KeyOut:
    return KeyOut(
        id=k.id,
        key=k.key,
        owner_name=k.owner_name,
        owner_email=k.owner_email,
        notes=k.notes,
        status=k.status,
        machine_id=k.machine_id,
        created_at=_fmt(k.created_at) or "",
        activated_at=_fmt(k.activated_at),
        last_seen_at=_fmt(k.last_seen_at),
        revoked_at=_fmt(k.revoked_at),
    )


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/keys", response_model=list[KeyOut])
def list_keys(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> list[KeyOut]:
    keys = db.query(LicenseKey).order_by(LicenseKey.created_at.desc()).all()
    return [_out(k) for k in keys]


@router.post("/keys", response_model=KeyOut, status_code=201)
def create_key(
    req: CreateKeyRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> KeyOut:
    record = LicenseKey.create(
        owner_name=req.owner_name.strip(),
        owner_email=req.owner_email,
        notes=req.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return _out(record)


@router.post("/keys/{key_id}/revoke", response_model=dict[str, Any])
def revoke_key(
    key_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> dict:
    record = db.get(LicenseKey, key_id)
    if not record:
        raise HTTPException(404, "Key not found")
    if record.is_revoked:
        return {"ok": True, "message": "Already revoked"}
    record.revoked_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "message": f"Key for {record.owner_name} has been revoked"}


@router.post("/keys/{key_id}/unrevoke", response_model=dict[str, Any])
def unrevoke_key(
    key_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> dict:
    record = db.get(LicenseKey, key_id)
    if not record:
        raise HTTPException(404, "Key not found")
    record.revoked_at = None
    db.commit()
    return {"ok": True, "message": f"Key for {record.owner_name} has been reinstated"}


@router.post("/keys/{key_id}/reset-device", response_model=dict[str, Any])
def reset_device(
    key_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> dict:
    """Clear machine binding so the key can be activated on a new device."""
    record = db.get(LicenseKey, key_id)
    if not record:
        raise HTTPException(404, "Key not found")
    record.machine_id = None
    record.activated_at = None
    db.commit()
    return {"ok": True, "message": f"Device binding cleared for {record.owner_name}"}


@router.delete("/keys/{key_id}", response_model=dict[str, Any])
def delete_key(
    key_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin),
) -> dict:
    record = db.get(LicenseKey, key_id)
    if not record:
        raise HTTPException(404, "Key not found")
    db.delete(record)
    db.commit()
    return {"ok": True, "message": f"Key for {record.owner_name} deleted"}
