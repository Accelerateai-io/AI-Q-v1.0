"""Persist Bedrock token usage into llm_model_usage for Observability."""

from __future__ import annotations

import logging
from typing import Any

import psycopg2

from config import settings
from services.llm_usage_actor import get_usage_actor

logger = logging.getLogger(__name__)

# Approximate on-demand Bedrock USD / 1M tokens (estimates only).
_PRICING = [
    ("claude-opus-4", 15.0, 75.0),
    ("claude-sonnet-4", 3.0, 15.0),
    ("claude-haiku-4", 1.0, 5.0),
    ("claude-3-5-sonnet", 3.0, 15.0),
    ("claude-3.5-sonnet", 3.0, 15.0),
    ("claude-3-5-haiku", 0.8, 4.0),
    ("claude-3.5-haiku", 0.8, 4.0),
    ("claude-3-opus", 15.0, 75.0),
    ("claude-3-sonnet", 3.0, 15.0),
    ("claude-3-haiku", 0.25, 1.25),
    ("nova-pro", 0.8, 3.2),
    ("nova-lite", 0.06, 0.24),
]


def _estimate_cost_usd(model_id: str, input_tokens: int, output_tokens: int) -> float:
    lowered = (model_id or "").lower()
    input_rate, output_rate = 3.0, 15.0
    for needle, inp, out in _PRICING:
        if needle in lowered:
            input_rate, output_rate = inp, out
            break
    cost = (input_tokens / 1_000_000.0) * input_rate + (output_tokens / 1_000_000.0) * output_rate
    return round(cost, 6)


def _as_nonneg_int(value: Any) -> int:
    try:
        n = int(value)
    except (TypeError, ValueError):
        return 0
    return n if n > 0 else 0


def record_llm_usage(
    *,
    model_id: str,
    model_name: str | None = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    total_tokens: int = 0,
    organization_id: int | None = None,
    organization_name: str | None = None,
    user_id: int | None = None,
    user_name: str | None = None,
    feature: str | None = None,
) -> None:
    mid = (model_id or "").strip()
    if not mid:
        return

    inp = _as_nonneg_int(input_tokens)
    out = _as_nonneg_int(output_tokens)
    total = _as_nonneg_int(total_tokens)
    if total <= 0 and (inp > 0 or out > 0):
        total = inp + out
    if inp <= 0 and out <= 0 and total > 0:
        out = total
    if inp <= 0 and out <= 0 and total <= 0:
        return

    name = (model_name or "").strip() or mid
    cost = _estimate_cost_usd(mid, inp, out)
    actor = get_usage_actor()
    org_id = organization_id if organization_id is not None else actor.get("organization_id")
    org_name = (organization_name or "").strip() or actor.get("organization_name")
    uid = user_id if user_id is not None else actor.get("user_id")
    uname = (user_name or "").strip() or actor.get("user_name")
    feat = (feature or "").strip() or actor.get("feature")

    parts = [
        "[llmUsage] tokens consumed",
        f"input={inp}",
        f"output={out}",
        f"total={total}",
    ]
    if feat:
        parts.append(f"feature={feat}")
    if uname:
        parts.append(f"user={uname}")
    if org_name:
        parts.append(f"org={org_name}")
    parts.append(f"model={mid}")
    print(" ".join(parts), flush=True)

    try:
        conn = psycopg2.connect(
            host=(settings.DATABASE_HOST or "127.0.0.1").strip(),
            port=int((settings.DATABASE_PORT or "5432").strip()),
            dbname=(settings.DATABASE_NAME or "ai_q_db").strip(),
            user=(settings.DATABASE_USER or "postgres").strip(),
            password=settings.DATABASE_PASSWORD
            if settings.DATABASE_PASSWORD is not None
            else "Postgresql123",
        )
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO llm_model_usage (
                      model_id, model_name, input_tokens, output_tokens,
                      total_tokens, estimated_cost_usd, invoke_count
                    ) VALUES (%s, %s, %s, %s, %s, %s, 1)
                    ON CONFLICT (model_id) DO UPDATE SET
                      model_name = EXCLUDED.model_name,
                      input_tokens = llm_model_usage.input_tokens + EXCLUDED.input_tokens,
                      output_tokens = llm_model_usage.output_tokens + EXCLUDED.output_tokens,
                      total_tokens = llm_model_usage.total_tokens + EXCLUDED.total_tokens,
                      estimated_cost_usd = llm_model_usage.estimated_cost_usd + EXCLUDED.estimated_cost_usd,
                      invoke_count = llm_model_usage.invoke_count + 1,
                      updated_at = NOW()
                    RETURNING id
                    """,
                    (mid, name, inp, out, total, f"{cost:.6f}"),
                )
                usage_row = cur.fetchone()
                usage_id = usage_row[0] if usage_row else None
                cur.execute(
                    """
                    INSERT INTO llm_model_usage_events (
                      usage_id, model_id, organization_id, organization_name,
                      user_id, user_name, feature, input_tokens, output_tokens,
                      total_tokens, estimated_cost_usd
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        usage_id,
                        mid,
                        org_id,
                        (org_name or "").strip() or None,
                        uid,
                        (uname or "").strip() or None,
                        (feat or "").strip() or None,
                        inp,
                        out,
                        total,
                        f"{cost:.6f}",
                    ),
                )
            conn.commit()
        finally:
            conn.close()
    except Exception as exc:  # noqa: BLE001 — never break LLM invoke on metrics
        logger.warning("record_llm_usage failed: %s", exc)


def usage_from_anthropic_result(result: dict[str, Any]) -> tuple[int, int, int]:
    usage = result.get("usage") if isinstance(result, dict) else None
    if not isinstance(usage, dict):
        return 0, 0, 0
    inp = _as_nonneg_int(usage.get("input_tokens"))
    out = _as_nonneg_int(usage.get("output_tokens"))
    total = inp + out if (inp or out) else _as_nonneg_int(usage.get("total_tokens"))
    return inp, out, total
