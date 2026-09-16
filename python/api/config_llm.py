"""Runtime LLM model config — kept in sync by Node Controls → Apply."""

from __future__ import annotations

from pydantic import BaseModel, Field

from fastapi import APIRouter

from config import get_bedrock_model_id, set_bedrock_model_id
from exceptions.custom_exceptions import raise_http_exception

router = APIRouter(
    prefix="/config",
    tags=["Config"],
)


class LlmModelUpdateRequest(BaseModel):
    modelId: str = Field(..., min_length=1, max_length=512)


class LlmModelResponse(BaseModel):
    modelId: str
    requiresPythonRestart: bool = False


@router.get("/llm-model", response_model=LlmModelResponse)
def get_llm_model() -> LlmModelResponse:
    return LlmModelResponse(modelId=get_bedrock_model_id())


@router.put("/llm-model", response_model=LlmModelResponse)
def put_llm_model(body: LlmModelUpdateRequest) -> LlmModelResponse:
    model_id = (body.modelId or "").strip()
    if not model_id:
        raise_http_exception("modelId is required", status_code=400)
    set_bedrock_model_id(model_id)
    return LlmModelResponse(modelId=get_bedrock_model_id(), requiresPythonRestart=False)
