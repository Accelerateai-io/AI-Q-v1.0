from fastapi import APIRouter

from services.extraction_service import (
    ExtractionService
)

router = APIRouter(
    prefix="/assessment",
    tags=["Assessment"]
)


@router.post("/process")
async def process_assessment():

    service = ExtractionService()

    questionnaire = {

        "company_name": "ABC Technologies",

        "certifications": "ISO27001"

    }

    result = await service.execute(

        assessment_id=1001,

        document_key="vendors/vendor.pdf",

        questionnaire=questionnaire

    )

    return result