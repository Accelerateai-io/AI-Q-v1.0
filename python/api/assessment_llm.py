"""
LLM + pgvector formula endpoint for assessment types:
- vendor_self_attestation (type 1 / product profile VTS — also has /assessment/score)
- cots_vendor (type 2)
- cots_buyer (type 3)

Node builds the assessment prompt; Python retrieves formula chunks, prepends them, invokes Bedrock.
"""

from __future__ import annotations

import asyncio
import logging
import time
import traceback
from contextvars import copy_context
from functools import partial
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from exceptions.custom_exceptions import (
    TokenQuotaExceededError,
    raise_http_exception,
    raise_token_quota_http,
)
from services.assessment_llm_service import invoke_assessment_llm
from services.llm_usage_actor import clear_usage_actor, set_usage_actor
from services.vts_vector_retrieval import (
    format_formula_context_for_prompt,
    retrieve_formula_context,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/assessment",
    tags=["Assessment"],
)

AssessmentType = Literal["vendor_self_attestation", "cots_vendor", "cots_buyer"]


class LlmWithVectorRequest(BaseModel):
    assessment_type: AssessmentType = "cots_vendor"
    # Full prompt Node would normally send to Bedrock
    user_prompt: str
    # Shorter text used for embedding similarity (defaults to trimmed user_prompt)
    query_text: str | None = None
    max_tokens: int | None = 8192
    temperature: float | None = 0.3
    # Optional override from Node Controls-selected model
    model_id: str | None = None
    # Optional actor for Observability usage events
    actor_user_id: int | None = None
    actor_user_name: str | None = None
    actor_organization_id: int | None = None
    actor_organization_name: str | None = None
    usage_feature: str | None = None
    # Type 2/3 numeric scores come from Python formulas. Skip pgvector+Titan so
    # report generation is one Bedrock call instead of embed×3 + map-reduce.
    include_formula_context: bool | None = None


class LlmWithVectorResponse(BaseModel):
    text: str
    assessment_type: str
    scoring_source: str = "llm"
    vector: dict[str, Any] = Field(default_factory=dict)


@router.post("/llm-with-vector", response_model=LlmWithVectorResponse)
async def llm_with_vector(body: LlmWithVectorRequest) -> LlmWithVectorResponse:
    """
    Retrieve formula/rubric chunks from pgvector for the assessment type,
    prepend them to user_prompt, invoke Bedrock, return the LLM text.
    """
    try:
        prompt = (body.user_prompt or "").strip()
        if not prompt:
            raise_http_exception("user_prompt is required", status_code=400)

        set_usage_actor(
            user_id=body.actor_user_id,
            user_name=body.actor_user_name,
            organization_id=body.actor_organization_id,
            organization_name=body.actor_organization_name,
            feature=body.usage_feature,
        )

        include_formula = body.include_formula_context
        if include_formula is None:
            include_formula = False

        started = time.perf_counter()
        vector_meta: dict[str, Any] = {
            "used": False,
            "chunks": [],
            "assessment_type": body.assessment_type,
        }
        formula_context = ""
        if include_formula:
            query_text = (body.query_text or prompt[:2000]).strip()
            retrieved = retrieve_formula_context(body.assessment_type, query_text)
            formula_context = format_formula_context_for_prompt(
                str(retrieved.get("context_text") or ""),
                body.assessment_type,
            )
            vector_meta = {
                "used": bool(retrieved.get("used")),
                "chunks": list(retrieved.get("chunks") or []),
                "error": retrieved.get("error"),
                "assessment_type": body.assessment_type,
            }

        bound = partial(
            invoke_assessment_llm,
            prompt,
            formula_context=formula_context,
            max_tokens=body.max_tokens,
            temperature=float(body.temperature if body.temperature is not None else 0.3),
            model_id=body.model_id,
        )
        text = await asyncio.to_thread(copy_context().run, bound)
        if not (text or "").strip():
            raise_http_exception("LLM returned empty response", status_code=500)

        source = "llm+vector" if vector_meta.get("used") else "llm"
        n_chunks = len(vector_meta.get("chunks") or [])
        elapsed = time.perf_counter() - started
        print(
            f"[assessment llm-with-vector] type={body.assessment_type} "
            f"source={source} vector_chunks={n_chunks} text_len={len(text)} "
            f"elapsed={elapsed:.1f}s",
            flush=True,
        )
        if vector_meta.get("used"):
            for ch in (vector_meta.get("chunks") or [])[:4]:
                print(
                    f"  - formula: {ch.get('file_name')} "
                    f"sim={ch.get('score')} preview={(ch.get('content_preview') or '')[:80]}"
                )

        return LlmWithVectorResponse(
            text=text,
            assessment_type=body.assessment_type,
            scoring_source=source,
            vector=vector_meta,
        )
    except TokenQuotaExceededError as exc:
        print(
            f"[LLM] quota 403 feature={exc.feature} allocated={exc.allocated} "
            f"consumed={exc.consumed} {exc.message}",
            flush=True,
        )
        raise_token_quota_http(exc)
    except Exception as exc:
        # FastAPI/Starlette HTTPException already has status_code
        if type(exc).__name__ == "HTTPException" or getattr(exc, "status_code", None):
            raise
        logger.error("llm-with-vector failed: %s\n%s", exc, traceback.format_exc())
        raise_http_exception(str(exc) or "LLM with vector failed", status_code=500)
    finally:
        clear_usage_actor()
