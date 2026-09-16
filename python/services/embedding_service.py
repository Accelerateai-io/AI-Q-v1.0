"""LangChain Bedrock embeddings for pgvector storage."""

from __future__ import annotations

from langchain_aws import BedrockEmbeddings

from config import settings
from services.bedrock_client import create_bedrock_runtime_client


class EmbeddingService:
    """Thin wrapper around LangChain BedrockEmbeddings (Titan v2)."""

    def __init__(self) -> None:
        self.model_id = settings.EMBEDDING_MODEL_ID
        self.dimensions = settings.EMBEDDING_DIMENSIONS
        self._embeddings = BedrockEmbeddings(
            client=create_bedrock_runtime_client(),
            model_id=self.model_id,
            model_kwargs={
                "dimensions": self.dimensions,
                "normalize": True,
            },
        )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        # Titan has a hard input limit; keep chunks within a safe bound.
        trimmed = [text[:50_000] for text in texts]
        vectors = self._embeddings.embed_documents(trimmed)
        for vector in vectors:
            if len(vector) != self.dimensions:
                raise RuntimeError(
                    f"Expected {self.dimensions}-d embedding, got {len(vector)}"
                )
        return vectors

    def embed_query(self, text: str) -> list[float]:
        vectors = self.embed_documents([text])
        return vectors[0]
