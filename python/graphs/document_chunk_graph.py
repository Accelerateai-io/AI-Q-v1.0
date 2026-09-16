"""LangGraph ingest: load → LangChain chunk → embed → pgvector store."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Literal, Optional, TypedDict

from langchain_core.documents import Document
from langgraph.graph import END, START, StateGraph
from loguru import logger

from services.embedding_service import EmbeddingService
from services.pgvector_store import PgVectorStore
from utils.chunker import chunk_to_documents
from utils.document_loader import load_document


class ChunkIngestState(TypedDict, total=False):
    path: str
    document_id: Optional[str]
    text: str
    documents: list[Document]
    embeddings: list[list[float]]
    result: dict[str, Any]
    error: str


def _route_ok_or_error(state: ChunkIngestState) -> Literal["ok", "error"]:
    return "error" if state.get("error") else "ok"


def build_document_chunk_graph(database_url: str):
    """Compile a reusable LangGraph for one Postgres database URL."""
    store = PgVectorStore(database_url)
    embedder = EmbeddingService()

    def load_node(state: ChunkIngestState) -> dict[str, Any]:
        path = Path(state["path"]).resolve()
        if not path.exists():
            return {"error": f"File not found: {path}"}
        try:
            text = load_document(path)
        except Exception as exc:  # noqa: BLE001 - surface loader errors in graph state
            return {"error": f"Failed to load {path.name}: {exc}"}
        if not text.strip():
            return {"error": f"No text extracted from {path.name}"}
        return {"path": str(path), "text": text}

    def chunk_node(state: ChunkIngestState) -> dict[str, Any]:
        path = Path(state["path"])
        documents = chunk_to_documents(
            state["text"],
            metadata={
                "source": str(path),
                "file_name": path.name,
            },
        )
        if not documents:
            return {"error": f"LangChain produced no chunks for {path.name}"}
        logger.info(
            "LangChain chunked {name}: {count} chunks",
            name=path.name,
            count=len(documents),
        )
        return {"documents": documents}

    def embed_node(state: ChunkIngestState) -> dict[str, Any]:
        texts = [doc.page_content for doc in state["documents"]]
        embeddings = embedder.embed_documents(texts)
        return {"embeddings": embeddings}

    def store_node(state: ChunkIngestState) -> dict[str, Any]:
        if state.get("error"):
            return {"result": {"error": state["error"], "chunks": 0}}

        path = Path(state["path"])
        documents = state["documents"]
        inserted = store.replace_document_chunks(
            source_path=str(path),
            file_name=path.name,
            documents=documents,
            embeddings=state["embeddings"],
            document_id=state.get("document_id"),
            extra_metadata={
                "orchestrator": "langgraph",
                "embedding_model": embedder.model_id,
                "embedding_dimensions": embedder.dimensions,
            },
        )
        result = {
            "file_name": path.name,
            "source_path": str(path),
            "chunks": inserted,
            "chars": len(state.get("text") or ""),
            "chunker": "langchain.RecursiveCharacterTextSplitter",
            "orchestrator": "langgraph",
            "embedding_model": embedder.model_id,
        }
        logger.info(
            "pgvector stored {file_name}: {chunks} chunks",
            file_name=result["file_name"],
            chunks=result["chunks"],
        )
        return {"result": result}

    graph = StateGraph(ChunkIngestState)
    graph.add_node("load", load_node)
    graph.add_node("chunk", chunk_node)
    graph.add_node("embed", embed_node)
    graph.add_node("store", store_node)

    graph.add_edge(START, "load")
    graph.add_conditional_edges(
        "load",
        _route_ok_or_error,
        {"ok": "chunk", "error": "store"},
    )
    graph.add_conditional_edges(
        "chunk",
        _route_ok_or_error,
        {"ok": "embed", "error": "store"},
    )
    graph.add_edge("embed", "store")
    graph.add_edge("store", END)
    return graph.compile()


@lru_cache(maxsize=4)
def get_document_chunk_graph(database_url: str):
    return build_document_chunk_graph(database_url)


def run_chunk_ingest(
    path: str | Path,
    database_url: str,
    document_id: str | None = None,
) -> dict[str, Any]:
    app = get_document_chunk_graph(database_url)
    final = app.invoke(
        {
            "path": str(path),
            "document_id": document_id,
        }
    )
    result = final.get("result") or {}
    if result.get("error"):
        raise ValueError(result["error"])
    return result
