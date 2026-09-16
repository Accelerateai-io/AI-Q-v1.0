"""Build searchable blobs for certification scoring."""

from __future__ import annotations

from typing import Any, Callable


def collect_compliance_upload_file_names(payload: dict[str, Any]) -> list[str]:
    names: list[str] = []
    doc_uploads = None
    if isinstance(payload.get("document_uploads"), dict):
        doc_uploads = payload["document_uploads"]
    elif isinstance(payload.get("documentUpload"), dict):
        doc_uploads = payload["documentUpload"]
    if not doc_uploads:
        return names
    slot2 = doc_uploads.get("2")
    if not isinstance(slot2, dict):
        return names
    by_category = slot2.get("byCategory") if isinstance(slot2.get("byCategory"), dict) else {}
    for arr in by_category.values():
        if isinstance(arr, list):
            for name in arr:
                if isinstance(name, str) and name.strip():
                    names.append(name.strip())
    return names


def certification_form_text_from_getter(get: Callable[[str], Any]) -> str:
    parts: list[str] = []

    def walk(v: Any) -> None:
        if v is None:
            return
        if isinstance(v, list):
            for item in v:
                walk(item)
            return
        if isinstance(v, dict):
            for item in v.values():
                walk(item)
            return
        t = str(v).strip()
        if t:
            parts.append(t)

    walk(get("security_certifications"))
    walk(get("security_compliance_certificates"))
    walk(get("regulatorycompliance_cert_material"))
    hipaa_baa = str(get("hipaa_baa") or "").strip().lower()
    if hipaa_baa in ("yes", "yes_standard", "yes_on_request"):
        parts.append("HIPAA BAA")
    return " ".join(parts)