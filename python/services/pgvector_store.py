"""Postgres + pgvector persistence for document chunks."""

from __future__ import annotations

import json
from typing import Any, Sequence

import psycopg2
from langchain_core.documents import Document
from pgvector import Vector
from pgvector.psycopg2 import register_vector

from config import settings

SCHEMA_SQL = f"""
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID,
    source_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector({settings.EMBEDDING_DIMENSIONS}) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{{}}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_path, chunk_index)
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
    ON document_chunks
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS document_chunks_source_path_idx
    ON document_chunks (source_path);
"""


class PgVectorStore:
    def __init__(self, database_url: str | None = None) -> None:
        # Prefer explicit URL when passed (ingest CLI); otherwise discrete DATABASE_*.
        self.database_url = database_url
        self._conn_kwargs = {
            "user": (settings.DATABASE_USER or "postgres").strip(),
            "password": settings.DATABASE_PASSWORD
            if settings.DATABASE_PASSWORD is not None
            else "Postgresql123",
            "host": (settings.DATABASE_HOST or "127.0.0.1").strip(),
            "port": int((settings.DATABASE_PORT or "5432").strip()),
            "dbname": (settings.DATABASE_NAME or "ai_q_db").strip(),
            "connect_timeout": 10,
        }

    def _connect(self):
        if self.database_url:
            conn = psycopg2.connect(self.database_url)
        else:
            conn = psycopg2.connect(**self._conn_kwargs)
        register_vector(conn)
        return conn

    def ensure_schema(self) -> None:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(SCHEMA_SQL)
            conn.commit()

    def replace_document_chunks(
        self,
        *,
        source_path: str,
        file_name: str,
        documents: Sequence[Document],
        embeddings: Sequence[Sequence[float]],
        document_id: str | None = None,
        extra_metadata: dict[str, Any] | None = None,
    ) -> int:
        if len(documents) != len(embeddings):
            raise ValueError(
                f"documents ({len(documents)}) and embeddings ({len(embeddings)}) length mismatch"
            )

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM document_chunks WHERE source_path = %s",
                    (source_path,),
                )
                for doc, embedding in zip(documents, embeddings):
                    metadata = {
                        **dict(doc.metadata),
                        **(extra_metadata or {}),
                    }
                    metadata.pop("document_id", None)
                    metadata.pop("source", None)
                    cur.execute(
                        """
                        INSERT INTO document_chunks (
                            document_id,
                            source_path,
                            file_name,
                            chunk_index,
                            content,
                            embedding,
                            metadata
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s::jsonb)
                        """,
                        (
                            document_id,
                            source_path,
                            file_name,
                            int(doc.metadata.get("chunk_index", 0)),
                            doc.page_content,
                            Vector(list(embedding)),
                            json.dumps(metadata, default=str),
                        ),
                    )
            conn.commit()
        return len(documents)

    def similarity_search(
        self,
        query_embedding: Sequence[float],
        *,
        k: int = 5,
        source_path: str | None = None,
        file_name_ilike: str | None = None,
    ) -> list[dict[str, Any]]:
        query_vector = Vector(list(query_embedding))
        sql = """
            SELECT
                id,
                file_name,
                chunk_index,
                content,
                metadata,
                1 - (embedding <=> %s) AS score
            FROM document_chunks
        """
        params: list[Any] = [query_vector]
        wheres: list[str] = []
        if source_path:
            wheres.append("source_path = %s")
            params.append(source_path)
        if file_name_ilike:
            wheres.append("file_name ILIKE %s")
            params.append(file_name_ilike)
        if wheres:
            sql += " WHERE " + " AND ".join(wheres)
        sql += " ORDER BY embedding <=> %s LIMIT %s"
        params.extend([query_vector, k])

        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()

        return [
            {
                "id": str(row[0]),
                "file_name": row[1],
                "chunk_index": row[2],
                "content": row[3],
                "metadata": row[4],
                "score": float(row[5]),
            }
            for row in rows
        ]

    def count_chunks(self) -> int:
        with self._connect() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM document_chunks")
                row = cur.fetchone()
                return int(row[0] if row else 0)
