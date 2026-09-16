"""Load text from PDF / DOCX files."""

from __future__ import annotations

from pathlib import Path

import pdfplumber
from docx import Document


def load_pdf(path: str | Path) -> str:
    parts: list[str] = []
    with pdfplumber.open(str(path)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                parts.append(page_text)
    return "\n".join(parts)


def load_docx(path: str | Path) -> str:
    doc = Document(str(path))
    return "\n".join(p.text for p in doc.paragraphs if p.text)


def load_document(path: str | Path) -> str:
    file_path = Path(path)
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return load_pdf(file_path)
    if suffix == ".docx":
        return load_docx(file_path)
    raise ValueError(f"Unsupported file type: {suffix or '(none)'}")
