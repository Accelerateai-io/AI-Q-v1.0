from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from api.health import router as health_router
from api.scoring import router as scoring_router
from api.assessment_llm import router as assessment_llm_router
from api.cots_scoring import router as cots_scoring_router
from api.config_llm import router as config_llm_router

from config import aws_credentials_configured, get_bedrock_model_id, settings

app = FastAPI(
    title=settings.APP_NAME
)

# Paths that never require the service key (used by load balancers / liveness checks).
_SERVICE_KEY_EXEMPT_PATHS = {"/", "/health", "/docs", "/openapi.json"}


@app.middleware("http")
async def require_service_key(request: Request, call_next):
    """
    Node is the only caller of this service. When PY_SERVICE_KEY is configured,
    reject any request that does not present it as X-Service-Key. When it is not
    configured, requests pass (local dev) but startup logs a loud warning.
    """
    expected = (settings.PY_SERVICE_KEY or "").strip()
    if expected and request.url.path not in _SERVICE_KEY_EXEMPT_PATHS:
        provided = (request.headers.get("x-service-key") or "").strip()
        if provided != expected:
            return JSONResponse(status_code=401, content={"detail": "Invalid or missing service key"})
    return await call_next(request)


if not (settings.PY_SERVICE_KEY or "").strip():
    print(
        "[warn] PY_SERVICE_KEY is not set — the scoring service accepts unauthenticated "
        "requests. Set PY_SERVICE_KEY in python/.env (and on the Node side) before deploying.",
        flush=True,
    )

if not aws_credentials_configured():
    # Without credentials the LLM leg of /assessment/score fails and profile reports
    # degrade to a single stub section, so make it loud at startup.
    print(
        "[warn] No AWS credentials found — Bedrock calls will fail and VTS will "
        "fall back to formula-only scoring. Set AWS_ACCESS_KEY_ID / "
        "AWS_SECRET_ACCESS_KEY in python/.env.",
        flush=True,
    )
else:
    print(f"[LLM] Bedrock configured for model: {get_bedrock_model_id()}", flush=True)

app.include_router(health_router)
app.include_router(scoring_router)
app.include_router(assessment_llm_router)
app.include_router(cots_scoring_router)
app.include_router(config_llm_router)

try:
    from api.assessment import router as assessment_router
    app.include_router(assessment_router)
except Exception as exc:
    # Extraction stack is optional; scoring still runs without langchain/boto/docs deps.
    print(f"[warn] assessment router not loaded: {exc}")


@app.get("/")
def root():
    return {
        "application": settings.APP_NAME,
        "status": "Running"
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)