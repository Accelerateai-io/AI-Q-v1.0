"""
Extraction Service

Responsibilities
----------------
1. Download vendor document from S3
2. Extract document text
3. Split document into chunks
4. Send each chunk to Amazon Bedrock
5. Merge responses
6. Return structured extraction
"""

from __future__ import annotations

import asyncio
import json
import time
from typing import Dict, List, Any

from logger import logger

from services.bedrock_service import BedrockService
from utils.s3_helper import S3Helper
from utils.document_loader import load_document
from utils.chunker import chunk_document

from prompts.extraction_prompt import EXTRACTION_PROMPT

from exceptions.custom_exceptions import (
    BedrockException,
    ExtractionException,
    DocumentEmptyException
)
from collections import defaultdict
from typing import Optional

class ExtractionService:

    def __init__(self):

        self.bedrock = BedrockService()

        self.s3 = S3Helper()

    async def process_document(
        self,
        assessment_id: int,
        document_key: str
    ) -> Dict:

        logger.info(
            f"Processing assessment {assessment_id}"
        )

        start = time.time()

        # ---------------------------------------
        # Download file from S3
        # ---------------------------------------

        local_file = self.s3.download_file(
            document_key
        )

        logger.info(
            f"Downloaded file : {local_file}"
        )

        # ---------------------------------------
        # Read document
        # ---------------------------------------

        document = load_document(local_file)

        if not document.strip():

            raise DocumentEmptyException(
                "Uploaded document contains no text."
            )

        logger.info(
            f"Characters extracted : {len(document)}"
        )

        # ---------------------------------------
        # Chunk document
        # ---------------------------------------

        chunks = chunk_document(document)

        logger.info(
            f"Chunks created : {len(chunks)}"
        )

        extracted_chunks = []

        # ---------------------------------------
        # Process each chunk
        # ---------------------------------------

        for index, chunk in enumerate(chunks):

            logger.info(
                f"Processing chunk {index + 1}"
            )

            result = await self._process_chunk(
                chunk,
                index + 1
            )

            extracted_chunks.append(result)

        logger.info(
            "All chunks processed."
        )

        merged = self.merge_chunks(
            extracted_chunks
        )

        elapsed = round(
            time.time() - start,
            2
        )

        logger.info(
            f"Completed in {elapsed}s"
        )

        return {
            "assessmentId": assessment_id,
            "processingTime": elapsed,
            "chunkCount": len(chunks),
            "result": merged
        }

    async def _process_chunk(
        self,
        chunk: str,
        chunk_number: int
    ) -> Dict:

        try:

            prompt = EXTRACTION_PROMPT.invoke(
                {
                    "document": chunk
                }
            )

            logger.info(
                f"Calling Bedrock for chunk {chunk_number}"
            )

            response = await asyncio.to_thread(
                self.bedrock.invoke,
                prompt
            )

            logger.info(
                f"Chunk {chunk_number} completed"
            )

            return json.loads(response)

        except json.JSONDecodeError as ex:

            logger.exception(ex)

            raise ExtractionException(
                "Invalid JSON returned by LLM."
            )

        except Exception as ex:

            logger.exception(ex)

            raise BedrockException(
                "Failed to invoke Amazon Bedrock."
            )




    def merge_chunks(
        self,
        chunk_results: List[Dict]
    ) -> Dict:
        """
        Merge all extracted chunk responses.

        Rules

        1. Highest confidence wins
        2. Preserve evidence list
        3. Preserve page numbers
        4. Ignore empty values
        """

        merged = {}

        evidence_map = defaultdict(list)

        for chunk in chunk_results:

            if not isinstance(chunk, dict):
                continue

            for field, value in chunk.items():

                if value is None:
                    continue

                if field not in merged:

                    merged[field] = value

                    evidence_map[field].append(
                        {
                            "page": value.get("page"),
                            "confidence": value.get("confidence"),
                            "evidence": value.get("evidence")
                        }
                    )

                    continue

                existing = merged[field]

                existing_conf = existing.get(
                    "confidence",
                    0
                )

                current_conf = value.get(
                    "confidence",
                    0
                )

                if current_conf > existing_conf:

                    merged[field] = value

                evidence_map[field].append(
                    {
                        "page": value.get("page"),
                        "confidence": current_conf,
                        "evidence": value.get("evidence")
                    }
                )

        for field in merged:

            merged[field]["allEvidence"] = evidence_map[field]

        return merged

    # ---------------------------------------------------------

    def validate_extraction(
        self,
        extracted: Dict,
        questionnaire: Optional[Dict] = None
    ) -> Dict:
        """
        Compare extracted evidence with questionnaire answers.

        Returns

        {
            verified,
            missing,
            conflicts
        }
        """

        if questionnaire is None:

            return {
                "verified": [],
                "missing": [],
                "conflicts": []
            }

        verified = []

        missing = []

        conflicts = []

        for field, answer in questionnaire.items():

            llm_value = extracted.get(field)

            if llm_value is None:

                missing.append(field)

                continue

            extracted_value = llm_value.get("value")

            if extracted_value is None:

                missing.append(field)

                continue

            if str(answer).lower() == str(
                extracted_value
            ).lower():

                verified.append(field)

            else:

                conflicts.append(
                    {
                        "field": field,
                        "questionnaire": answer,
                        "document": extracted_value
                    }
                )

        return {
            "verified": verified,
            "missing": missing,
            "conflicts": conflicts
        }

    # ---------------------------------------------------------

    def overall_confidence(
        self,
        extracted: Dict
    ) -> float:

        scores = []

        for value in extracted.values():

            if not isinstance(value, dict):
                continue

            score = value.get(
                "confidence",
                0
            )

            scores.append(score)

        if not scores:
            return 0

        return round(
            sum(scores) / len(scores),
            2
        )

    # ---------------------------------------------------------

    async def execute(
        self,
        assessment_id: int,
        document_key: str,
        questionnaire: Optional[Dict] = None
    ) -> Dict:

        result = await self.process_document(
            assessment_id,
            document_key
        )

        extracted = result["result"]

        validation = self.validate_extraction(
            extracted,
            questionnaire
        )

        confidence = self.overall_confidence(
            extracted
        )

        result["confidence"] = confidence

        result["validation"] = validation

        logger.info(
            f"Overall confidence : {confidence}"
        )

        return result