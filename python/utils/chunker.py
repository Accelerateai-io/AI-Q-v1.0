"""LangChain text splitting for extraction and RAG ingest."""

from __future__ import annotations

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from config import settings


def count_words(text: str) -> int:
    """Word-length used by the splitter (whitespace-separated tokens)."""
    return len((text or "").split())


def build_text_splitter(
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size if chunk_size is not None else settings.MAX_CHUNK_SIZE,
        chunk_overlap=(
            chunk_overlap if chunk_overlap is not None else settings.OVERLAP_SIZE
        ),
        length_function=count_words,
        separators=["\n\n", "\n", ". ", " ", ""],
        is_separator_regex=False,
    )


def chunk_document(
    text: str,
    chunk_size: int | None = None,
    overlap: int | None = None,
) -> list[str]:
    """Split raw text into chunk strings (used by extraction / assessment LLM)."""
    docs = chunk_to_documents(text, chunk_size=chunk_size, overlap=overlap)
    return [doc.page_content for doc in docs]


def chunk_to_documents(
    text: str,
    metadata: dict | None = None,
    chunk_size: int | None = None,
    overlap: int | None = None,
) -> list[Document]:
    """Split text into LangChain Documents with chunk metadata."""
    if not text or not str(text).strip():
        return []

    splitter = build_text_splitter(chunk_size=chunk_size, chunk_overlap=overlap)
    docs = splitter.create_documents(
        [str(text)],
        metadatas=[dict(metadata or {})],
    )
    for index, doc in enumerate(docs):
        doc.metadata["chunk_index"] = index
        doc.metadata["word_count"] = count_words(doc.page_content)
        doc.metadata["chunker"] = "langchain.RecursiveCharacterTextSplitter"
    return docs
