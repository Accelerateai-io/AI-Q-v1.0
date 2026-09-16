"""CLI: LangChain/LangGraph chunk PDFs and store embeddings in pgvector.

Examples:
  python scripts/ingest_pdfs_to_pgvector.py --dir "path/to/folder"
  python scripts/ingest_pdfs_to_pgvector.py --file "path/to/doc.pdf"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from services.vector_ingest_service import VectorIngestService

DEFAULT_DIR = (
    ROOT.parent
    / "backend"
    / "public"
    / "uploads_vendor_attestations"
    / "febea4a8-1fb1-45c4-8cd6-f028dbcec9d8"
)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Ingest PDFs into Postgres pgvector via LangChain + LangGraph"
    )
    parser.add_argument("--dir", type=str, default=str(DEFAULT_DIR), help="PDF directory")
    parser.add_argument("--file", type=str, default=None, help="Single PDF file")
    parser.add_argument(
        "--database-url",
        type=str,
        default=None,
        help="Optional Postgres URL override (default: DATABASE_* from settings/.env)",
    )
    args = parser.parse_args()

    service = VectorIngestService(args.database_url)
    service.ensure_schema()

    if args.file:
        results = [service.ingest_file(args.file)]
    else:
        results = service.ingest_directory(args.dir)

    payload = {
        "ingested": results,
        "total_chunks": sum(int(r.get("chunks") or 0) for r in results),
    }
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
