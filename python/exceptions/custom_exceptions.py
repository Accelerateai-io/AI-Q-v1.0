"""
Application Exceptions
"""


class VendorAttestationException(Exception):

    def __init__(
        self,
        message: str
    ):

        self.message = message

        super().__init__(message)


class BedrockException(VendorAttestationException):
    pass


class ExtractionException(VendorAttestationException):
    pass


class ValidationException(VendorAttestationException):
    pass


class RiskCalculationException(VendorAttestationException):
    pass


class S3Exception(VendorAttestationException):
    pass


class UnsupportedDocumentException(
    VendorAttestationException
):
    pass


class DocumentEmptyException(
    VendorAttestationException
):
    pass


TOKEN_QUOTA_EXCEEDED_CODE = "TOKEN_QUOTA_EXCEEDED"


class TokenQuotaExceededError(VendorAttestationException):
    """User has no remaining tokens for this Controls feature. Stop LLM work immediately."""

    def __init__(
        self,
        message: str,
        feature: str | None = None,
        allocated: int = 0,
        consumed: int = 0,
    ):
        super().__init__(message)
        self.feature = feature
        self.allocated = allocated
        self.consumed = consumed
        self.code = TOKEN_QUOTA_EXCEEDED_CODE


def raise_http_exception(
    message: str | dict,
    status_code: int = 500
):
    from fastapi import HTTPException

    raise HTTPException(
        status_code=status_code,
        detail=message
    )


def raise_token_quota_http(error: TokenQuotaExceededError) -> None:
    raise_http_exception(
        {
            "code": TOKEN_QUOTA_EXCEEDED_CODE,
            "message": error.message,
            "feature": error.feature,
            "allocated": error.allocated,
            "consumed": error.consumed,
        },
        status_code=403,
    )