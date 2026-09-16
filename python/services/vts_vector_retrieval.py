"""Retrieve formula / scoring knowledge from pgvector for assessment LLM flows."""

from __future__ import annotations

import logging
from typing import Any, Literal

from config import settings
from services.embedding_service import EmbeddingService
from services.pgvector_store import PgVectorStore

logger = logging.getLogger(__name__)

_store: PgVectorStore | None = None
_embedder: EmbeddingService | None = None
_schema_ready = False


def _vector_clients() -> tuple[PgVectorStore, EmbeddingService]:
    global _store, _embedder, _schema_ready
    if _store is None:
        _store = PgVectorStore()
    if _embedder is None:
        _embedder = EmbeddingService()
    if not _schema_ready:
        _store.ensure_schema()
        _schema_ready = True
    return _store, _embedder

AssessmentType = Literal[
    "vendor_self_attestation",
    "cots_vendor",
    "cots_buyer",
]

FORMULA_QUERIES: dict[str, list[str]] = {
    "vendor_self_attestation": [
        "Vendor Trust Score VTS formula product risk governance risk operational risk weights",
        "VTS = 100 - product risk governance risk operational risk calculation",
        "vendor trust score scoring rubric certifications SLA AI governance mitigation",
    ],
    "cots_vendor": [
        "Vendor COTS sales risk score formula customer friction implementation competitive risk",
        "deal probability sales risk score grade classification vendor COTS assessment",
        "AI EVAL risk scoring technical specification vendor COTS analysis report formula",
    ],
    "cots_buyer": [
        "Buyer COTS implementation risk score formula vendor trust readiness grade",
        "buyer vendor risk assessment scoring rubric overallRiskScore implementation risk",
        "AI EVAL risk scoring technical specification buyer COTS implementation risk formula",
    ],
}


def _build_context_query(assessment_type: str, query_text: str) -> str:
    snippet = (query_text or "").strip().replace("\n", " ")
    if len(snippet) > 600:
        snippet = snippet[:600]
    label = {
        "vendor_self_attestation": "Vendor Trust Score formula",
        "cots_vendor": "Vendor COTS (type 2) sales/risk scoring formula",
        "cots_buyer": "Buyer COTS (type 3) implementation/trust scoring formula",
    }.get(assessment_type, "risk scoring formula")
    return f"{label} and scoring guidance for this assessment: {snippet}"


def retrieve_formula_context(
    assessment_type: str = "vendor_self_attestation",
    query_text: str = "",
    *,
    k: int | None = None,
) -> dict[str, Any]:
    """
    Similarity-search document_chunks for formula / scoring knowledge for the assessment type.
    Returns { context_text, chunks, used, assessment_type }.
    Never raises — empty context on failure so scoring can continue.
    """
    atype = assessment_type if assessment_type in FORMULA_QUERIES else "vendor_self_attestation"
    top_k = int(k or getattr(settings, "VTS_VECTOR_TOP_K", 6) or 6)
    top_k = max(1, min(top_k, 12))

    try:
        store, embedder = _vector_clients()

        default_queries = FORMULA_QUERIES.get(atype, FORMULA_QUERIES["vendor_self_attestation"])
        # Prefer one Titan embed. Extra canned queries only if that search is empty.
        queries = [_build_context_query(atype, query_text), *default_queries[:1]]
        seen: set[str] = set()
        merged: list[dict[str, Any]] = []

        per_query = max(3, top_k)
        for i, q in enumerate(queries):
            if i > 0 and len(merged) >= top_k:
                break
            q_emb = embedder.embed_query(q)
            hits = store.similarity_search(q_emb, k=per_query)
            for hit in hits:
                hid = str(hit.get("id") or "")
                if not hid or hid in seen:
                    continue
                content = str(hit.get("content") or "").strip()
                if not content:
                    continue
                seen.add(hid)
                merged.append(hit)
                if len(merged) >= top_k:
                    break
            if len(merged) >= top_k:
                break

        merged.sort(key=lambda h: float(h.get("score") or 0), reverse=True)
        merged = merged[:top_k]

        if not merged:
            logger.warning(
                "Vector retrieval (%s): no document_chunks found in pgvector",
                atype,
            )
            return {
                "context_text": "",
                "chunks": [],
                "used": False,
                "assessment_type": atype,
            }

        blocks: list[str] = []
        for i, hit in enumerate(merged, start=1):
            fname = str(hit.get("file_name") or "unknown")
            score = hit.get("score")
            score_s = f"{float(score):.3f}" if score is not None else "n/a"
            blocks.append(
                f"[Formula chunk {i} | source={fname} | similarity={score_s}]\n"
                f"{str(hit.get('content') or '').strip()}"
            )

        context_text = "\n\n---\n\n".join(blocks)
        logger.info(
            "Vector retrieval (%s): %s chunks (top_k=%s)",
            atype,
            len(merged),
            top_k,
        )
        return {
            "context_text": context_text,
            "chunks": [
                {
                    "id": str(h.get("id")),
                    "file_name": h.get("file_name"),
                    "chunk_index": h.get("chunk_index"),
                    "score": h.get("score"),
                    "content_preview": str(h.get("content") or "")[:240],
                }
                for h in merged
            ],
            "used": True,
            "assessment_type": atype,
        }
    except Exception as exc:
        logger.warning("Vector retrieval (%s) failed: %s", assessment_type, exc)
        return {
            "context_text": "",
            "chunks": [],
            "used": False,
            "assessment_type": assessment_type,
            "error": str(exc),
        }


def format_formula_context_for_prompt(context_text: str, assessment_type: str = "") -> str:
    if not (context_text or "").strip():
        return ""
    type_note = f" (assessment_type={assessment_type})" if assessment_type else ""
    return (
        "\n\n---\n"
        f"SCORING FORMULAS & GUIDANCE FROM VECTOR DATABASE (pgvector){type_note}\n"
        "Use the following retrieved formula / rubric knowledge ONLY for internal score "
        "computation. Apply these rules to the assessment data when deriving numeric scores. "
        "If a retrieved chunk conflicts with explicit assessment facts, prefer the assessment "
        "facts for facts, but use the formula chunks for HOW to score.\n"
        "CRITICAL — USER-FACING OUTPUT: Do NOT quote, discuss, or display any formulas, "
        "equations, weight percentages, or scoring algebra (e.g. VTS =, IRS =, SRS =, × 0.35) "
        "in summaries, methodology, appendix, or any narrative section. Report results and "
        "business implications only — never the underlying formula.\n\n"
        f"{context_text.strip()}\n"
        "---\n\n"
    )


# Back-compat alias used by VTS scoring path
def retrieve_vts_formula_context(
    vendor_data: str = "",
    *,
    k: int | None = None,
) -> dict[str, Any]:
    return retrieve_formula_context(
        "vendor_self_attestation",
        vendor_data,
        k=k,
    )
