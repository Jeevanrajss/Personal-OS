"""LLM client — supports local (LM Studio / Ollama) and cloud providers
(OpenAI, Anthropic/Claude, Google Gemini, Groq, Together, Mistral, custom).

Configuration is loaded from the settings DB at runtime (cached 60 s) and
falls back to .env values if the DB has no AI settings yet.

Supported providers
-------------------
- local      LM Studio / Ollama / any OpenAI-compatible local server
- openai     api.openai.com
- anthropic  api.anthropic.com  (different request/response format)
- google     Gemini via OpenAI-compat endpoint
- groq       api.groq.com
- together   api.together.xyz
- mistral    api.mistral.ai
- custom     user-supplied base URL + optional API key
"""
from __future__ import annotations

import time
from typing import Any

import httpx

from app.config import get_settings

_env = get_settings()

# ---------------------------------------------------------------------------
# Runtime config cache — refreshed from DB every 60 s
# ---------------------------------------------------------------------------
_cache: dict[str, str] | None = None
_cache_ts: float = 0.0
_CACHE_TTL = 60.0


def _env_defaults() -> dict[str, str]:
    return {
        "provider": _env.llm_provider or "local",
        "api_base": f"{_env.llm_host}/v1",
        "api_key": "",
        "chat_model": _env.llm_chat_model,
        "fast_model": _env.llm_fast_model,
        "embed_model": _env.llm_embed_model,
        "is_anthropic": "false",
    }


def _load_config() -> dict[str, str]:
    global _cache, _cache_ts
    now = time.monotonic()
    if _cache is not None and (now - _cache_ts) < _CACHE_TTL:
        return _cache

    try:
        from app.db import SessionLocal
        from app.models.setting import Setting as SettingModel

        with SessionLocal() as db:
            rows = db.query(SettingModel).filter(
                SettingModel.key.like("ai.%")
            ).all()
            if rows:
                cfg = {r.key[3:]: (r.value or "") for r in rows}  # strip "ai." prefix
                # Fill missing keys from env defaults
                defaults = _env_defaults()
                for k, v in defaults.items():
                    cfg.setdefault(k, v)
                _cache = cfg
                _cache_ts = now
                return _cache
    except Exception:
        pass  # DB not ready yet (first boot) — fall back silently

    _cache = _env_defaults()
    _cache_ts = now
    return _cache


def invalidate_config_cache() -> None:
    """Called by the settings router after saving new AI config."""
    global _cache_ts
    _cache_ts = 0.0


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
class LLMError(RuntimeError):
    pass


def _get_headers(cfg: dict[str, str]) -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    api_key = cfg.get("api_key", "").strip()
    if not api_key:
        return headers
    if cfg.get("is_anthropic") == "true":
        headers["x-api-key"] = api_key
        headers["anthropic-version"] = "2023-06-01"
    else:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


def _chat_url(cfg: dict[str, str]) -> str:
    base = cfg.get("api_base", "").rstrip("/")
    if cfg.get("is_anthropic") == "true":
        return f"{base}/v1/messages"
    return f"{base}/chat/completions"


def _purpose_to_model(cfg: dict[str, str], purpose: str) -> str:
    mapping = {
        "chat": cfg.get("chat_model", ""),
        "insights": cfg.get("chat_model", ""),
        "summary": cfg.get("chat_model", ""),
        "categorize": cfg.get("fast_model", "") or cfg.get("chat_model", ""),
        "parse": cfg.get("fast_model", "") or cfg.get("chat_model", ""),
    }
    return mapping.get(purpose, cfg.get("chat_model", ""))


# ---------------------------------------------------------------------------
# Anthropic adapter
# ---------------------------------------------------------------------------
async def _complete_anthropic(
    messages_no_system: list[dict[str, str]],
    system: str | None,
    model: str,
    temperature: float,
    max_tokens: int,
    cfg: dict[str, str],
) -> str:
    """POST to /v1/messages (Anthropic format)."""
    base = cfg.get("api_base", "https://api.anthropic.com").rstrip("/")
    url = f"{base}/v1/messages"
    headers = _get_headers(cfg)

    payload: dict[str, Any] = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": messages_no_system,
    }
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=300) as client:
        try:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            body = e.response.text
            raise LLMError(f"Anthropic API error {e.response.status_code}: {body}") from e
        except httpx.HTTPError as e:
            raise LLMError(f"Anthropic request failed: {e}") from e

    data = r.json()
    try:
        return data["content"][0]["text"].strip()
    except (KeyError, IndexError) as e:
        raise LLMError(f"Unexpected Anthropic response shape: {data}") from e


# ---------------------------------------------------------------------------
# OpenAI-compatible completion (with Gemma retry logic)
# ---------------------------------------------------------------------------
async def _complete(
    payload: dict[str, Any],
    *,
    messages_no_system: list[dict[str, str]],
    system: str | None,
    max_tokens: int,
    cfg: dict[str, str],
) -> str:
    """POST to /chat/completions (OpenAI-compat).

    Handles two Gemma 4 failure modes:
    1. finish_reason="length" — reasoning exhausted all tokens → retry 5x.
    2. Empty content without length — system-prompt aversion → merge system
       into first user message.
    """
    url = _chat_url(cfg)
    headers = _get_headers(cfg)

    async with httpx.AsyncClient(timeout=300) as client:
        try:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
        except httpx.HTTPStatusError as e:
            body = e.response.text
            raise LLMError(f"LLM API error {e.response.status_code}: {body}") from e
        except httpx.HTTPError as e:
            raise LLMError(f"LLM request failed: {e}") from e

    data = r.json()
    try:
        choice = data["choices"][0]
        content = (choice["message"].get("content") or "").strip()
        finish_reason = choice.get("finish_reason", "")
    except (KeyError, IndexError) as e:
        raise LLMError(f"Unexpected LLM response shape: {data}") from e

    if content == "":
        # Retry with merged system prompt and/or boosted token count
        if system:
            retry_messages: list[dict[str, str]] = []
            merged = False
            for msg in messages_no_system:
                if msg["role"] == "user" and not merged:
                    retry_messages.append(
                        {"role": "user", "content": f"{system}\n\n{msg['content']}"}
                    )
                    merged = True
                else:
                    retry_messages.append(msg)
        else:
            retry_messages = messages_no_system

        boosted = min(max_tokens * 5, 4096) if finish_reason == "length" else max_tokens
        retry_payload = {**payload, "messages": retry_messages, "max_tokens": boosted}

        async with httpx.AsyncClient(timeout=300) as client:
            try:
                r2 = await client.post(url, json=retry_payload, headers=headers)
                r2.raise_for_status()
            except httpx.HTTPError as e:
                raise LLMError(f"LLM retry failed: {e}") from e

        data2 = r2.json()
        try:
            content = (data2["choices"][0]["message"].get("content") or "").strip()
        except (KeyError, IndexError):
            pass

    return content


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def generate(
    prompt: str,
    *,
    purpose: str = "chat",
    system: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 1024,
) -> str:
    cfg = _load_config()
    model = _purpose_to_model(cfg, purpose)

    messages_no_system: list[dict[str, str]] = [{"role": "user", "content": prompt}]

    if cfg.get("is_anthropic") == "true":
        return await _complete_anthropic(
            messages_no_system, system, model, temperature, max_tokens, cfg
        )

    full_messages: list[dict[str, str]] = []
    if system:
        full_messages.append({"role": "system", "content": system})
    full_messages.extend(messages_no_system)

    payload: dict[str, Any] = {
        "model": model,
        "messages": full_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    return await _complete(
        payload,
        messages_no_system=messages_no_system,
        system=system,
        max_tokens=max_tokens,
        cfg=cfg,
    )


async def chat(
    messages: list[dict[str, str]],
    *,
    system: str | None = None,
    temperature: float = 0.5,
    max_tokens: int = 800,
) -> str:
    cfg = _load_config()
    model = _purpose_to_model(cfg, "chat")

    if cfg.get("is_anthropic") == "true":
        return await _complete_anthropic(
            messages, system, model, temperature, max_tokens, cfg
        )

    full_messages: list[dict[str, str]] = []
    if system:
        full_messages.append({"role": "system", "content": system})
    full_messages.extend(messages)

    payload: dict[str, Any] = {
        "model": model,
        "messages": full_messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    return await _complete(
        payload,
        messages_no_system=messages,
        system=system,
        max_tokens=max_tokens,
        cfg=cfg,
    )


async def embed(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    cfg = _load_config()
    embed_model = cfg.get("embed_model", "").strip()
    if not embed_model:
        raise LLMError("No embedding model configured.")

    # Anthropic has no embeddings API — callers should guard against this
    if cfg.get("is_anthropic") == "true":
        raise LLMError("Anthropic does not provide an embeddings API.")

    base = cfg.get("api_base", "").rstrip("/")
    url = f"{base}/embeddings"
    headers = _get_headers(cfg)

    payload = {"model": embed_model, "input": texts}

    async with httpx.AsyncClient(timeout=120) as client:
        try:
            r = await client.post(url, json=payload, headers=headers)
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise LLMError(f"Embedding request failed: {e}") from e

    data = r.json()
    try:
        return [item["embedding"] for item in data["data"]]
    except (KeyError, TypeError) as e:
        raise LLMError(f"Unexpected embeddings response: {data}") from e


async def list_models() -> list[str]:
    """Fetch available model IDs from the provider (OpenAI-compat only)."""
    cfg = _load_config()
    if cfg.get("is_anthropic") == "true":
        from app.schemas.setting import PROVIDER_PRESETS
        return PROVIDER_PRESETS["anthropic"]["suggested_chat"]

    base = cfg.get("api_base", "").rstrip("/")
    url = f"{base}/models"
    headers = _get_headers(cfg)

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get(url, headers=headers)
            r.raise_for_status()
        except httpx.HTTPError as e:
            raise LLMError(f"Cannot reach LLM server: {e}") from e

    return [m.get("id", "") for m in r.json().get("data", [])]


async def health() -> dict[str, Any]:
    cfg = _load_config()
    try:
        if cfg.get("is_anthropic") == "true":
            from app.schemas.setting import PROVIDER_PRESETS
            model_names = PROVIDER_PRESETS["anthropic"]["suggested_chat"]
        else:
            model_names = await list_models()

        return {
            "ok": True,
            "provider": cfg.get("provider", "local"),
            "host": cfg.get("api_base", ""),
            "chat_model": cfg.get("chat_model", ""),
            "fast_model": cfg.get("fast_model", ""),
            "embed_model": cfg.get("embed_model", ""),
            "models_available": model_names,
            "chat_loaded": cfg.get("chat_model", "") in model_names,
            "embed_loaded": cfg.get("embed_model", "") in model_names,
        }
    except LLMError as e:
        return {
            "ok": False,
            "provider": cfg.get("provider", "local"),
            "host": cfg.get("api_base", ""),
            "error": str(e),
        }
