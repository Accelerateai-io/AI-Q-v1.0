"""Shared Bedrock Runtime client with timeouts suitable for long Claude invokes."""

from __future__ import annotations

from threading import Lock
from typing import Any

import boto3
from botocore.config import Config

from config import settings

_client_lock = Lock()
_cached_client: Any | None = None
_cached_key: tuple[str, str, str, int, int] | None = None


def _client_cache_key() -> tuple[str, str, str, int, int]:
    read_timeout = int(getattr(settings, "BEDROCK_READ_TIMEOUT", 300) or 300)
    connect_timeout = int(getattr(settings, "BEDROCK_CONNECT_TIMEOUT", 10) or 10)
    return (
        (settings.AWS_REGION or "").strip(),
        (settings.AWS_ACCESS_KEY_ID or "").strip(),
        (settings.AWS_SESSION_TOKEN or "").strip(),
        read_timeout,
        connect_timeout,
    )


def create_bedrock_runtime_client() -> Any:
    """
    Reuse one boto3 bedrock-runtime client per process.

    Building a client on every invoke reloads credentials and botocore config.
    Default botocore read_timeout is 60s; large Claude calls need more headroom.
    """
    global _cached_client, _cached_key
    key = _client_cache_key()
    client = _cached_client
    if client is not None and _cached_key == key:
        return client
    with _client_lock:
        if _cached_client is not None and _cached_key == key:
            return _cached_client
        read_timeout, connect_timeout = key[3], key[4]
        kwargs: dict[str, Any] = {
            "region_name": settings.AWS_REGION,
            "config": Config(
                connect_timeout=connect_timeout,
                read_timeout=read_timeout,
                retries={"max_attempts": 2, "mode": "standard"},
            ),
        }
        if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
            kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
            kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
            if (settings.AWS_SESSION_TOKEN or "").strip():
                kwargs["aws_session_token"] = settings.AWS_SESSION_TOKEN
        _cached_client = boto3.client("bedrock-runtime", **kwargs)
        _cached_key = key
        return _cached_client
