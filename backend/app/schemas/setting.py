"""Schemas + provider preset catalog for the Settings API."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Provider presets
# api_base = full URL up to (not including) /chat/completions
# ---------------------------------------------------------------------------
PROVIDER_PRESETS: dict[str, dict[str, Any]] = {
    "local": {
        "label": "Local (LM Studio / Ollama)",
        "emoji": "🖥️",
        "api_base": "http://127.0.0.1:1234/v1",
        "needs_key": False,
        "is_anthropic": False,
        "suggested_chat": [],          # populated live from /v1/models
        "suggested_embed": "nomic-ai/nomic-embed-text-v1.5-gguf",
        "embed_supported": True,
    },
    "openai": {
        "label": "OpenAI",
        "emoji": "🤖",
        "api_base": "https://api.openai.com/v1",
        "needs_key": True,
        "is_anthropic": False,
        "suggested_chat": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini", "o3-mini"],
        "suggested_embed": "text-embedding-3-small",
        "embed_supported": True,
    },
    "anthropic": {
        "label": "Anthropic (Claude)",
        "emoji": "🧠",
        "api_base": "https://api.anthropic.com",
        "needs_key": True,
        "is_anthropic": True,          # uses different request/response format
        "suggested_chat": [
            "claude-opus-4-5",
            "claude-sonnet-4-5",
            "claude-3-5-haiku-20241022",
            "claude-3-5-sonnet-20241022",
        ],
        "suggested_embed": None,       # Anthropic has no embeddings API
        "embed_supported": False,
    },
    "google": {
        "label": "Google Gemini",
        "emoji": "✨",
        "api_base": "https://generativelanguage.googleapis.com/v1beta/openai",
        "needs_key": True,
        "is_anthropic": False,
        "suggested_chat": ["gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
        "suggested_embed": "text-embedding-004",
        "embed_supported": True,
    },
    "groq": {
        "label": "Groq",
        "emoji": "⚡",
        "api_base": "https://api.groq.com/openai/v1",
        "needs_key": True,
        "is_anthropic": False,
        "suggested_chat": [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "llama-3.2-90b-vision-preview",
            "mixtral-8x7b-32768",
        ],
        "suggested_embed": None,
        "embed_supported": False,
    },
    "together": {
        "label": "Together AI",
        "emoji": "🤝",
        "api_base": "https://api.together.xyz/v1",
        "needs_key": True,
        "is_anthropic": False,
        "suggested_chat": [
            "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
            "mistralai/Mixtral-8x7B-Instruct-v0.1",
            "google/gemma-2-27b-it",
        ],
        "suggested_embed": "togethercomputer/m2-bert-80M-8k-retrieval",
        "embed_supported": True,
    },
    "mistral": {
        "label": "Mistral AI",
        "emoji": "🌪️",
        "api_base": "https://api.mistral.ai/v1",
        "needs_key": True,
        "is_anthropic": False,
        "suggested_chat": ["mistral-large-latest", "mistral-small-latest", "open-mistral-7b"],
        "suggested_embed": "mistral-embed",
        "embed_supported": True,
    },
    "custom": {
        "label": "Custom",
        "emoji": "⚙️",
        "api_base": "",
        "needs_key": False,
        "is_anthropic": False,
        "suggested_chat": [],
        "suggested_embed": None,
        "embed_supported": True,
    },
}


class SettingsBulkUpdate(BaseModel):
    """Payload for PUT /settings — just a flat dict of key→value."""
    settings: dict[str, str]


class LLMTestResult(BaseModel):
    ok: bool
    provider: str
    model: str
    response: str | None
    error: str | None


class LLMHealthResult(BaseModel):
    """Result of the fast reachability probe (GET /settings/health)."""
    ok: bool | None        # None = not applicable (e.g. Anthropic)
    provider: str
    host: str
    models: list[str] = []
    error: str | None = None
    note: str | None = None
