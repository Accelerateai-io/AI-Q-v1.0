"""Per-user feature token quota — checked before every Bedrock invoke.

Mirrors backend/src/services/admin/featureTokenQuota.service.ts so Python
chunked/multi-call LLM work stops as soon as the allocation is exhausted.
"""

from __future__ import annotations

import logging
from typing import Any

import psycopg2

from config import settings
from exceptions.custom_exceptions import TokenQuotaExceededError
from services.llm_usage_actor import get_usage_actor

logger = logging.getLogger(__name__)

_FEATURE_LABELS = {
    "attestation": "Attestation",
    "assessment": "Assessment",
    "sales_agent": "Sales agent",
    "reports": "Reports",
}

# Too small to finish a useful report / assessment / chat turn. Stop instead of
# starting a truncated LLM call that would be discarded.
MIN_REMAINING_OUTPUT_TOKENS = 128


def _as_nonneg_int(value: Any) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return 0
    return n if n > 0 else 0


def _connect():
    return psycopg2.connect(
        host=(settings.DATABASE_HOST or "127.0.0.1").strip(),
        port=int((settings.DATABASE_PORT or "5432").strip()),
        dbname=(settings.DATABASE_NAME or "ai_q_db").strip(),
        user=(settings.DATABASE_USER or "postgres").strip(),
        password=settings.DATABASE_PASSWORD
        if settings.DATABASE_PASSWORD is not None
        else "Postgresql123",
    )


def _quota_message(
    feature: str,
    *,
    allocated: int,
    input_exceeded: bool,
    output_exceeded: bool,
) -> str:
    label = _FEATURE_LABELS.get(feature, feature.replace("_", " ").title() or "this feature")
    if allocated <= 0:
        return (
            f"No tokens have been allocated for {label}. "
            "Ask your platform admin to allocate tokens for this feature."
        )
    if input_exceeded and output_exceeded:
        return (
            f"Your {label} input and output token allocations are exhausted. "
            "Ask your platform admin to allocate more tokens."
        )
    if input_exceeded:
        return (
            f"Your {label} input token allocation is exhausted. "
            "Ask your platform admin to allocate more tokens."
        )
    if output_exceeded:
        return (
            f"Your {label} output token allocation is exhausted. "
            "Ask your platform admin to allocate more tokens."
        )
    return (
        f"Your {label} token allocation is exhausted. "
        "Ask your platform admin to allocate more tokens."
    )


def get_feature_token_balance(
    *,
    user_id: int,
    organization_id: int,
    feature: str,
) -> dict[str, Any]:
    empty = {
        "allocated_input": 0,
        "allocated_output": 0,
        "consumed_input": 0,
        "consumed_output": 0,
        "allocated": 0,
        "consumed": 0,
        "remaining_input": 0,
        "remaining_output": 0,
        "input_exceeded": False,
        "output_exceeded": False,
        "exhausted": True,
    }
    uid = _as_nonneg_int(user_id)
    oid = _as_nonneg_int(organization_id)
    feat = (feature or "").strip()
    if uid < 1 or oid < 1 or not feat:
        return empty

    try:
        conn = _connect()
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT coalesce(sum(input_tokens), 0), coalesce(sum(output_tokens), 0)
                    FROM org_user_token_allocations
                    WHERE user_id = %s AND organization_id = %s AND feature = %s
                    """,
                    (uid, oid, feat),
                )
                alloc = cur.fetchone() or (0, 0)
                cur.execute(
                    """
                    SELECT coalesce(sum(input_tokens), 0), coalesce(sum(output_tokens), 0)
                    FROM llm_model_usage_events
                    WHERE user_id = %s AND organization_id = %s AND feature = %s
                    """,
                    (uid, oid, feat),
                )
                used = cur.fetchone() or (0, 0)
        finally:
            conn.close()
    except Exception as exc:  # noqa: BLE001 — fail closed for authenticated actors
        logger.warning("get_feature_token_balance failed: %s", exc)
        return empty

    allocated_input = _as_nonneg_int(alloc[0])
    allocated_output = _as_nonneg_int(alloc[1])
    consumed_input = _as_nonneg_int(used[0])
    consumed_output = _as_nonneg_int(used[1])
    allocated = allocated_input + allocated_output
    consumed = consumed_input + consumed_output
    remaining_input = (
        max(0, allocated_input - consumed_input) if allocated_input > 0 else None
    )
    remaining_output = (
        max(0, allocated_output - consumed_output) if allocated_output > 0 else None
    )
    input_exceeded = allocated_input > 0 and consumed_input >= allocated_input
    output_exceeded = allocated_output > 0 and consumed_output >= allocated_output
    exhausted = allocated <= 0 or input_exceeded or output_exceeded
    return {
        "allocated_input": allocated_input,
        "allocated_output": allocated_output,
        "consumed_input": consumed_input,
        "consumed_output": consumed_output,
        "allocated": allocated,
        "consumed": consumed,
        "remaining_input": remaining_input,
        "remaining_output": remaining_output,
        "input_exceeded": input_exceeded,
        "output_exceeded": output_exceeded,
        "exhausted": exhausted,
    }


def current_feature_token_balance() -> dict[str, Any] | None:
    """Quota row for the request actor, or None when quota is not enforced."""
    actor = get_usage_actor()
    user_id = actor.get("user_id")
    feature = (actor.get("feature") or "").strip()
    organization_id = actor.get("organization_id")
    if user_id is None or not feature or organization_id is None:
        return None
    return get_feature_token_balance(
        user_id=int(user_id),
        organization_id=int(organization_id),
        feature=feature,
    )


def raise_quota(feature: str, balance: dict[str, Any]) -> None:
    raise TokenQuotaExceededError(
        _quota_message(
            feature,
            allocated=int(balance.get("allocated") or 0),
            input_exceeded=bool(balance.get("input_exceeded")),
            output_exceeded=bool(balance.get("output_exceeded")),
        ),
        feature=feature,
        allocated=int(balance.get("allocated") or 0),
        consumed=int(balance.get("consumed") or 0),
    )


def prepare_feature_token_invoke(
    *,
    requested_max_tokens: int,
    estimated_input_tokens: int = 0,
    allow_cap: bool = True,
) -> dict[str, Any]:
    """
    Block the next Bedrock call when the actor's feature quota is exhausted.

    Caps max_tokens to remaining output on the first call of a generation so a
    short remaining budget can still finish. Later steps (allow_cap=False) stop
    immediately instead of emitting a truncated chunk. Never starts a call when
    remaining output is below MIN_REMAINING_OUTPUT_TOKENS.

    Skips only when there is no authenticated actor (internal/admin tests).
    Returns { max_tokens, capped, feature, balance }.
    """
    requested = max(1, _as_nonneg_int(requested_max_tokens) or 1)
    actor = get_usage_actor()
    user_id = actor.get("user_id")
    if user_id is None:
        return {"max_tokens": requested, "capped": False, "feature": None, "balance": None}

    feature = (actor.get("feature") or "").strip()
    if not feature:
        return {"max_tokens": requested, "capped": False, "feature": None, "balance": None}

    organization_id = actor.get("organization_id")
    if organization_id is None:
        raise_quota(
            feature,
            {
                "allocated": 0,
                "consumed": 0,
                "input_exceeded": False,
                "output_exceeded": False,
            },
        )

    balance = get_feature_token_balance(
        user_id=int(user_id),
        organization_id=int(organization_id),
        feature=feature,
    )
    if balance["exhausted"]:
        raise_quota(feature, balance)

    remaining_input = balance.get("remaining_input")
    if (
        remaining_input is not None
        and estimated_input_tokens > 0
        and estimated_input_tokens > int(remaining_input)
    ):
        raise_quota(
            feature,
            {**balance, "input_exceeded": True},
        )

    remaining_output = balance.get("remaining_output")
    max_tokens = requested
    capped = False
    if remaining_output is not None:
        remaining = int(remaining_output)
        if remaining < MIN_REMAINING_OUTPUT_TOKENS:
            raise_quota(feature, {**balance, "output_exceeded": True})
        if remaining < requested:
            if not allow_cap:
                raise_quota(feature, {**balance, "output_exceeded": True})
            max_tokens = remaining
            capped = True

    return {
        "max_tokens": max_tokens,
        "capped": capped,
        "feature": feature,
        "balance": balance,
    }
