from typing import Any

from langchain_aws import ChatBedrockConverse

from config import get_bedrock_model_id
from services.bedrock_client import create_bedrock_runtime_client
from services.llm_usage import record_llm_usage
from services.llm_usage_actor import get_usage_actor


def _usage_from_langchain(response: Any) -> tuple[int, int, int]:
    meta = getattr(response, "usage_metadata", None)
    if isinstance(meta, dict):
        inp = int(meta.get("input_tokens") or 0)
        out = int(meta.get("output_tokens") or 0)
        total = int(meta.get("total_tokens") or 0) or (inp + out)
        return inp, out, total
    raw = getattr(response, "response_metadata", None)
    if isinstance(raw, dict):
        usage = raw.get("usage") if isinstance(raw.get("usage"), dict) else raw
        inp = int(usage.get("input_tokens") or usage.get("inputTokens") or 0)
        out = int(usage.get("output_tokens") or usage.get("outputTokens") or 0)
        total = int(usage.get("total_tokens") or usage.get("totalTokens") or 0) or (
            inp + out
        )
        return inp, out, total
    return 0, 0, 0


class BedrockService:

    def __init__(self):

        self.client = create_bedrock_runtime_client()

        self._model_id: str | None = None
        self.llm = None
        self._ensure_llm()

    def _ensure_llm(self):
        """Recreate ChatBedrockConverse when Controls updates BEDROCK_MODEL_ID."""
        model_id = get_bedrock_model_id()
        if self.llm is not None and self._model_id == model_id:
            return
        self._model_id = model_id
        self.llm = ChatBedrockConverse(
            client=self.client,
            model=model_id,
            temperature=0,
            max_tokens=4096
        )

    def invoke(self, prompt):
        self._ensure_llm()
        response = self.llm.invoke(prompt)
        inp, out, total = _usage_from_langchain(response)
        if inp or out or total:
            actor = get_usage_actor()
            record_llm_usage(
                model_id=self._model_id or get_bedrock_model_id(),
                input_tokens=inp,
                output_tokens=out,
                total_tokens=total,
                organization_id=actor.get("organization_id"),
                organization_name=actor.get("organization_name"),
                user_id=actor.get("user_id"),
                user_name=actor.get("user_name"),
                feature=actor.get("feature"),
            )
        return response.content
