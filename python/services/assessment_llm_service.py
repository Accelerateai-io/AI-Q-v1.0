"""Shared Bedrock invoke for assessment LLM flows (with optional vector formula context).

Huge prompts can be map-reduced. Typical assessment reports fit in one invoke —
do not reuse the 700-word extraction chunker (that created 6–20 Bedrock calls).
"""

from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from contextvars import copy_context

from config import get_bedrock_model_id, settings
from services.bedrock_client import create_bedrock_runtime_client
from services.feature_token_quota import (
    MIN_REMAINING_OUTPUT_TOKENS,
    current_feature_token_balance,
    prepare_feature_token_invoke,
    raise_quota,
)
from services.llm_usage import record_llm_usage, usage_from_anthropic_result
from services.llm_usage_actor import get_usage_actor
from utils.chunker import chunk_document, count_words

_CHUNK_PARTIAL_INSTRUCTION = (
    "This is PART {part} of {total} of the assessment data. "
    "Analyze only this chunk. Produce partial findings for later merge; "
    "do not claim the report is complete."
)

_CHUNK_MERGE_INSTRUCTION = (
    "Below are partial analyses from chunks of one assessment. "
    "Merge them into a single complete final report. "
    "Resolve contradictions using the most specific evidence; "
    "do not invent facts that are not present in the partials."
)

_TRUNCATED_STOP_REASONS = frozenset({"max_tokens", "length", "max_length"})


def _estimate_input_tokens(text: str) -> int:
    return max(1, len(text or "") // 4)


def _generation_hit_quota(
    *,
    capped: bool,
    stop_reason: str,
    output_tokens: int,
    allowed_max: int,
) -> bool:
    """True when this call was cut short because remaining quota ran out."""
    if not capped:
        return False
    reason = (stop_reason or "").strip().lower()
    if reason in _TRUNCATED_STOP_REASONS:
        return True
    return allowed_max > 0 and output_tokens >= allowed_max


def _raise_if_quota_hit(gate: dict, *, total_tokens: int) -> None:
    feature = str(gate.get("feature") or "")
    if not feature:
        return
    balance = dict(gate.get("balance") or {})
    balance["output_exceeded"] = True
    balance["consumed"] = int(balance.get("consumed") or 0) + total_tokens
    raise_quota(feature, balance)


def _invoke_bedrock_once(
    text: str,
    *,
    max_tokens: int,
    temperature: float,
    model_id: str,
    allow_cap: bool = True,
) -> str:
    gate = prepare_feature_token_invoke(
        requested_max_tokens=int(max_tokens),
        estimated_input_tokens=_estimate_input_tokens(text),
        allow_cap=allow_cap,
    )
    allowed_max = int(gate["max_tokens"])
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": allowed_max,
        "temperature": float(temperature),
        "messages": [
            {
                "role": "user",
                "content": [{"type": "text", "text": text}],
            }
        ],
    }
    print(
        f"[LLM] assessment invoke using model: {model_id} "
        f"words={count_words(text)} max_tokens={allowed_max}",
        flush=True,
    )
    started = time.perf_counter()
    response = create_bedrock_runtime_client().invoke_model(
        modelId=model_id,
        contentType="application/json",
        accept="application/json",
        body=json.dumps(body),
    )
    result = json.loads(response["body"].read())
    elapsed = time.perf_counter() - started
    inp, out, total = usage_from_anthropic_result(result)
    print(
        f"[LLM] invoke finished in {elapsed:.1f}s "
        f"stop={result.get('stop_reason') or ''} out_tokens={out}",
        flush=True,
    )
    if inp or out or total:
        actor = get_usage_actor()
        record_llm_usage(
            model_id=model_id,
            input_tokens=inp,
            output_tokens=out,
            total_tokens=total,
            organization_id=actor.get("organization_id"),
            organization_name=actor.get("organization_name"),
            user_id=actor.get("user_id"),
            user_name=actor.get("user_name"),
            feature=actor.get("feature"),
        )
    stop_reason = str(result.get("stop_reason") or "")
    if _generation_hit_quota(
        capped=bool(gate.get("capped")),
        stop_reason=stop_reason,
        output_tokens=out,
        allowed_max=allowed_max,
    ):
        _raise_if_quota_hit(gate, total_tokens=total)
    content = result.get("content") or []
    if content and isinstance(content[0], dict):
        return str(content[0].get("text") or "")
    return ""


def _should_chunk(total_words: int) -> bool:
    if not bool(getattr(settings, "LLM_CHUNK_ENABLED", True)):
        return False
    threshold = int(getattr(settings, "LLM_PROMPT_CHUNK_THRESHOLD", 24000) or 24000)
    return total_words > max(200, threshold)


def _llm_chunk_size() -> int:
    return max(2000, int(getattr(settings, "LLM_CHUNK_SIZE", 8000) or 8000))


def _llm_chunk_overlap() -> int:
    return max(0, int(getattr(settings, "LLM_CHUNK_OVERLAP", 80) or 80))


def _max_map_chunks() -> int:
    return max(2, int(getattr(settings, "LLM_CHUNK_MAX_CHUNKS", 3) or 3))


def _map_max_tokens(requested: int) -> int:
    mapped = int(getattr(settings, "LLM_CHUNK_MAP_MAX_TOKENS", 2048) or 2048)
    return max(256, min(int(requested), mapped))


def _chunk_workers(chunk_count: int) -> int:
    configured = int(getattr(settings, "LLM_CHUNK_MAX_WORKERS", 3) or 3)
    return max(1, min(chunk_count, configured))


def invoke_bedrock_with_chunking(
    *,
    stable_prefix: str,
    payload: str,
    max_tokens: int | None = None,
    temperature: float = 0.3,
    model_id: str | None = None,
) -> str:
    """
    Invoke Bedrock for any model. When prefix+payload is huge, chunk the payload
    with LLM_CHUNK_SIZE (not the 700-word extraction splitter), invoke map
    chunks in parallel, then merge. Prefer a single invoke whenever possible.
    """
    prefix = (stable_prefix or "").strip()
    data = (payload or "").strip()
    if not prefix and not data:
        return ""

    tokens = int(max_tokens or settings.MAX_TOKENS or 8192)
    temp = float(temperature)
    resolved_model = (model_id or "").strip() or get_bedrock_model_id()
    combined = f"{prefix}\n\n{data}".strip() if prefix and data else (prefix or data)
    combined_words = count_words(combined)

    if not data or not _should_chunk(combined_words):
        print(
            f"[LLM] single invoke model={resolved_model} words={combined_words}",
            flush=True,
        )
        return _invoke_bedrock_once(
            combined,
            max_tokens=tokens,
            temperature=temp,
            model_id=resolved_model,
        )

    chunks = chunk_document(
        data,
        chunk_size=_llm_chunk_size(),
        overlap=_llm_chunk_overlap(),
    )
    max_chunks = _max_map_chunks()
    if len(chunks) <= 1 or len(chunks) > max_chunks:
        print(
            f"[LLM] skip map-reduce ({len(chunks)} splits, cap={max_chunks}); "
            f"single invoke words={combined_words}",
            flush=True,
        )
        return _invoke_bedrock_once(
            combined,
            max_tokens=tokens,
            temperature=temp,
            model_id=resolved_model,
        )

    total = len(chunks)
    map_tokens = _map_max_tokens(tokens)
    workers = _chunk_workers(total)
    balance = current_feature_token_balance()
    if balance is not None:
        if balance["exhausted"]:
            raise_quota(str(get_usage_actor().get("feature") or "assessment"), balance)
        remaining_out = balance.get("remaining_output")
        # Parallel maps each request map_tokens; merge needs another call.
        parallel_need = map_tokens * total + MIN_REMAINING_OUTPUT_TOKENS
        if remaining_out is not None and int(remaining_out) < parallel_need:
            print(
                f"[LLM] remaining output {remaining_out} too small for "
                f"{total}x{map_tokens} parallel maps; single invoke",
                flush=True,
            )
            return _invoke_bedrock_once(
                combined,
                max_tokens=tokens,
                temperature=temp,
                model_id=resolved_model,
                allow_cap=True,
            )
    print(
        f"[LLM] chunking enabled model={resolved_model} "
        f"payload_words={count_words(data)} chunks={total} "
        f"workers={workers} map_max_tokens={map_tokens}"
    )

    def _map_chunk(index: int, chunk: str) -> tuple[int, str]:
        part_header = _CHUNK_PARTIAL_INSTRUCTION.format(part=index, total=total)
        parts = [p for p in (prefix, part_header, chunk) if p]
        part_text = "\n\n".join(parts)
        partial = _invoke_bedrock_once(
            part_text,
            max_tokens=map_tokens,
            temperature=temp,
            model_id=resolved_model,
            allow_cap=True,
        )
        return index, (partial or "").strip()

    found: dict[int, str] = {}
    # One Context cannot be entered by two threads. Copy per task so the usage
    # actor still reaches Bedrock quota / usage logging in each worker.
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [
            pool.submit(copy_context().run, _map_chunk, index, chunk)
            for index, chunk in enumerate(chunks, start=1)
        ]
        for fut in as_completed(futures):
            index, partial = fut.result()
            if partial:
                found[index] = partial

    partials = [
        f"### Chunk {index}/{total} findings\n{found[index]}"
        for index in range(1, total + 1)
        if index in found
    ]

    if not partials:
        return ""
    if len(partials) == 1:
        return partials[0].split("\n", 1)[-1].strip()

    merge_body = "\n\n".join(partials)
    merge_parts = [p for p in (prefix, _CHUNK_MERGE_INSTRUCTION, merge_body) if p]
    return _invoke_bedrock_once(
        "\n\n".join(merge_parts),
        max_tokens=tokens,
        temperature=temp,
        model_id=resolved_model,
        allow_cap=True,
    )


def invoke_assessment_llm(
    user_prompt: str,
    *,
    formula_context: str = "",
    max_tokens: int | None = None,
    temperature: float = 0.3,
    model_id: str | None = None,
) -> str:
    """Invoke Bedrock with optional pgvector formula context (chunked when large)."""
    return invoke_bedrock_with_chunking(
        stable_prefix=(formula_context or "").strip(),
        payload=(user_prompt or "").strip(),
        max_tokens=max_tokens,
        temperature=temperature,
        model_id=model_id,
    )
