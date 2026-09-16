"""Request/response schemas for Vendor Trust Score API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ScoreRequest(BaseModel):
    """Attestation form payload (or pre-built formula_input) + optional vendor_data for LLM."""

    payload: dict[str, Any] | None = None
    formula_input: dict[str, Any] | None = None
    # Free-text / structured dump used by the Bedrock trust-score agent (Node-equivalent).
    vendor_data: str | None = None
    # Optional actor for Observability usage events
    actor_user_id: int | None = None
    actor_user_name: str | None = None
    actor_organization_id: int | None = None
    actor_organization_name: str | None = None
    usage_feature: str | None = None


class ScoreResponse(BaseModel):
    # Primary trust score: LLM Overall Trust Score (Node agent behavior).
    vendor_trust_score: float
    product_risk: float
    governance_risk: float
    operational_risk: float
    weighted_risk: float
    grade: str
    classification: str
    recommended_action: str
    detail: dict[str, Any] = Field(default_factory=dict)
    scoring_version: str = "vts-llm-1.0"
    scoring_source: str = "llm"
    # Deterministic formula score kept for comparison / breakdown.
    formula_vendor_trust_score: float | None = None
    # Parsed LLM report (Node-shaped) for Node to persist without re-calling Bedrock.
    trust_score: dict[str, Any] | None = None
    sections: list[dict[str, Any]] = Field(default_factory=list)
    raw: str | None = None
    # Full VTS RATIONALE block (same text as Python/Node terminal).
    rationale: str | None = None
