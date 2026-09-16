from pydantic import BaseModel


class Evidence(BaseModel):

    value: str | None = None

    confidence: float

    page: int | None = None

    evidence: str | None = None


class ExtractionResponse(BaseModel):

    company_name: Evidence

    product_name: Evidence

    ai_capability: Evidence

    hosting_model: Evidence

    compliance: Evidence

    certifications: Evidence

    human_oversight: Evidence

    encryption: Evidence

    monitoring: Evidence

    logging: Evidence

    incident_response: Evidence

    access_control: Evidence

    data_retention: Evidence