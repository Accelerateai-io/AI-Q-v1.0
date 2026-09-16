"""Facade for LangGraph/LangChain document ingest into pgvector."""

from __future__ import annotations

from pathlib import Path

from loguru import logger

from config import settings
from graphs.document_chunk_graph import run_chunk_ingest
from services.pgvector_store import PgVectorStore


class VectorIngestService:
    def __init__(self, database_url: str | None = None) -> None:
        # None => PgVectorStore uses discrete DATABASE_* from settings (same as Node Pool).
        self.database_url = database_url
        self.store = PgVectorStore(database_url)

    def ensure_schema(self) -> None:
        self.store.ensure_schema()

    def ingest_file(self, path: str | Path, document_id: str | None = None) -> dict:
        result = run_chunk_ingest(
            path=path,
            database_url=self.database_url or settings.DATABASE_URL,
            document_id=document_id,
        )
        logger.info(
            "Ingest complete for {file_name}: {chunks} chunks",
            file_name=result.get("file_name"),
            chunks=result.get("chunks"),
        )
        return result

    def ingest_directory(self, directory: str | Path) -> list[dict]:
        directory = Path(directory)
        if not directory.is_dir():
            raise NotADirectoryError(directory)

        # Use iterdir so filenames with [] (e.g. [Anthropic]...) are not glob-parsed.
        pdfs = sorted(
            (p for p in directory.iterdir() if p.is_file() and p.suffix.lower() == ".pdf"),
            key=lambda p: p.name.lower(),
        )
        if not pdfs:
            raise FileNotFoundError(f"No PDFs found in {directory}")
        return [self.ingest_file(pdf) for pdf in pdfs]
