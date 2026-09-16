from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from urllib.parse import quote_plus
import os
import re


_ENV_PATH = Path(__file__).resolve().parent / ".env"


class Settings(BaseSettings):
    # Absolute path so the model / AWS config loads no matter which cwd uvicorn starts from.
    model_config = SettingsConfigDict(
        env_file=str(_ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Vendor Attestation AI"
    AWS_REGION: str = "us-east-1"
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-sonnet-20240229-v1:0"
    EMBEDDING_MODEL_ID: str = "amazon.titan-embed-text-v2:0"
    EMBEDDING_DIMENSIONS: int = 1024
    # boto3 default read_timeout is 60s; large assessment invokes often need longer
    BEDROCK_READ_TIMEOUT: int = 300
    BEDROCK_CONNECT_TIMEOUT: int = 10
    # Map-reduce only for huge prompts. Claude context is ~200k tokens; splitting a
    # typical report (~3–8k words) into 700-word embedding chunks caused 6–20
    # Bedrock calls + merge and pushed generation past the 360s UI poll.
    LLM_CHUNK_ENABLED: bool = True
    # If (prefix + payload) exceeds this many words, split payload and merge
    LLM_PROMPT_CHUNK_THRESHOLD: int = 24000
    # Word size for assessment LLM splits (NOT extraction MAX_CHUNK_SIZE=700)
    LLM_CHUNK_SIZE: int = 8000
    LLM_CHUNK_OVERLAP: int = 80
    # If splitting would exceed this many map calls, do one invoke instead
    LLM_CHUNK_MAX_CHUNKS: int = 3
    # Parallel map-chunk Bedrock calls (then one merge). 1 = sequential.
    LLM_CHUNK_MAX_WORKERS: int = 3
    # Partials do not need a full report; keeps each map call shorter.
    LLM_CHUNK_MAP_MAX_TOKENS: int = 2048
    # How many pgvector formula/scoring chunks to inject into VTS LLM prompt
    VTS_VECTOR_TOP_K: int = 4
    # Formula VTS is authoritative. Skip Titan+pgvector on /assessment/score so
    # generation is one Bedrock call (set true only if narrative must cite rubric).
    VTS_LLM_INCLUDE_FORMULA_CONTEXT: bool = False

    # Same discrete vars as backend/src/database/db.ts
    DATABASE_USER: str = "postgres"
    DATABASE_PASSWORD: str = "Postgresql123"
    DATABASE_HOST: str = "127.0.0.1"
    DATABASE_PORT: str = "5432"
    DATABASE_NAME: str = "ai_q_db"

    S3_BUCKET: str = "vendor-documents"
    LOG_LEVEL: str = "INFO"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_SESSION_TOKEN: str = ""
    # Chunk sizes are measured in words (whitespace-separated)
    MAX_CHUNK_SIZE: int = 700
    OVERLAP_SIZE: int = 50
    TEMPERATURE: float = 0
    MAX_TOKENS: int = 4096
    DOWNLOAD_DIRECTORY: str = "downloads"

    @property
    def DATABASE_URL(self) -> str:
        """SQLAlchemy / psycopg2 DSN built from discrete DATABASE_* settings."""
        user = (self.DATABASE_USER or "postgres").strip()
        password = self.DATABASE_PASSWORD if self.DATABASE_PASSWORD is not None else "Postgresql123"
        host = (self.DATABASE_HOST or "127.0.0.1").strip()
        port = (self.DATABASE_PORT or "5432").strip()
        name = (self.DATABASE_NAME or "ai_q_db").strip()
        return (
            f"postgresql://{quote_plus(user)}:{quote_plus(password)}"
            f"@{host}:{port}/{name}"
        )


settings = Settings()


def _export_aws_credentials_to_environ() -> None:
    """
    Publish configured AWS credentials to the process environment.

    Some Bedrock clients (BedrockService, langchain_aws) are built without explicit
    credential kwargs and rely on the boto3 default chain, which otherwise fails with
    "Unable to locate credentials" even though python/.env has keys.
    """
    exported = {
        "AWS_ACCESS_KEY_ID": settings.AWS_ACCESS_KEY_ID,
        "AWS_SECRET_ACCESS_KEY": settings.AWS_SECRET_ACCESS_KEY,
        "AWS_SESSION_TOKEN": settings.AWS_SESSION_TOKEN,
        "AWS_DEFAULT_REGION": settings.AWS_REGION,
        "AWS_REGION": settings.AWS_REGION,
    }
    for key, value in exported.items():
        cleaned = (value or "").strip()
        if cleaned and not (os.environ.get(key) or "").strip():
            os.environ[key] = cleaned


_export_aws_credentials_to_environ()


def aws_credentials_configured() -> bool:
    """True when Bedrock has usable static credentials or an ambient provider."""
    if settings.AWS_ACCESS_KEY_ID.strip() and settings.AWS_SECRET_ACCESS_KEY.strip():
        return True
    return bool(
        (os.environ.get("AWS_ACCESS_KEY_ID") or "").strip()
        or (os.environ.get("AWS_PROFILE") or "").strip()
        or (os.environ.get("AWS_BEARER_TOKEN_BEDROCK") or "").strip()
        or (os.environ.get("AWS_CONTAINER_CREDENTIALS_RELATIVE_URI") or "").strip()
        or (os.environ.get("AWS_WEB_IDENTITY_TOKEN_FILE") or "").strip()
    )


_logged_bedrock_model_id: str | None = None


def get_bedrock_model_id() -> str:
    """Active Bedrock chat model (Controls Apply updates this at runtime)."""
    global _logged_bedrock_model_id
    model_id = (
        (os.environ.get("BEDROCK_MODEL_ID") or "").strip()
        or (os.environ.get("BEDROCK_MODEL") or "").strip()
        or (settings.BEDROCK_MODEL_ID or "").strip()
        or "anthropic.claude-3-sonnet-20240229-v1:0"
    )
    if _logged_bedrock_model_id != model_id:
        print(f"[LLM] taking model from BEDROCK_MODEL_ID: {model_id}", flush=True)
        _logged_bedrock_model_id = model_id
    return model_id


def set_bedrock_model_id(model_id: str) -> str:
    """
    Update the in-memory Bedrock model and persist to python/.env so restarts keep it.
    Called by PUT /config/llm-model from Node Controls Apply.
    """
    trimmed = (model_id or "").strip()
    if not trimmed:
        raise ValueError("modelId is required")
    previous = get_bedrock_model_id()
    settings.BEDROCK_MODEL_ID = trimmed
    os.environ["BEDROCK_MODEL_ID"] = trimmed
    os.environ["BEDROCK_MODEL"] = trimmed
    _upsert_env_file(_ENV_PATH, {"BEDROCK_MODEL_ID": trimmed, "BEDROCK_MODEL": trimmed})
    print(f"[LLM] model changed (Python sync): {previous!r} -> {trimmed!r}")
    return trimmed


def _upsert_env_file(path: Path, updates: dict[str, str]) -> None:
    if not updates:
        return
    lines: list[str] = []
    if path.exists():
        lines = path.read_text(encoding="utf-8").splitlines()

    touched: set[str] = set()
    next_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            next_lines.append(line)
            continue
        match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=", line)
        if not match:
            next_lines.append(line)
            continue
        key = match.group(1)
        if key in updates:
            next_lines.append(f"{key}={updates[key]}")
            touched.add(key)
        else:
            next_lines.append(line)

    for key, value in updates.items():
        if key not in touched:
            next_lines.append(f"{key}={value}")

    body = "\n".join(next_lines)
    if body and not body.endswith("\n"):
        body += "\n"
    path.write_text(body, encoding="utf-8")


# Back-compat aliases used by chunker / extraction helpers
AWS_ACCESS_KEY_ID = settings.AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY = settings.AWS_SECRET_ACCESS_KEY
MAX_CHUNK_SIZE = settings.MAX_CHUNK_SIZE
OVERLAP_SIZE = settings.OVERLAP_SIZE
TEMPERATURE = settings.TEMPERATURE
MAX_TOKENS = settings.MAX_TOKENS
DOWNLOAD_DIRECTORY = settings.DOWNLOAD_DIRECTORY
