"""Request-scoped actor for LLM usage logging (Python scoring service)."""

from __future__ import annotations

from contextvars import ContextVar
from typing import Any

_actor_ctx: ContextVar[dict[str, Any] | None] = ContextVar(
    "llm_usage_actor",
    default=None,
)


def set_usage_actor(
    *,
    user_id: int | None = None,
    user_name: str | None = None,
    organization_id: int | None = None,
    organization_name: str | None = None,
    feature: str | None = None,
) -> None:
    _actor_ctx.set(
        {
            "user_id": user_id,
            "user_name": (user_name or "").strip() or None,
            "organization_id": organization_id,
            "organization_name": (organization_name or "").strip() or None,
            "feature": (feature or "").strip() or None,
        }
    )


def clear_usage_actor() -> None:
    _actor_ctx.set(None)


def get_usage_actor() -> dict[str, Any]:
    return dict(_actor_ctx.get() or {})
