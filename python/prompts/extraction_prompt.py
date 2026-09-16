from langchain_core.prompts import ChatPromptTemplate

EXTRACTION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """
You are an AI Vendor Attestation Assistant.

Your job is ONLY to extract information.

DO NOT calculate risk.

DO NOT summarize.

DO NOT hallucinate.

If a value does not exist,
return null.

Return ONLY valid JSON.

Extract:

1. Company Name
2. Product Name
3. AI Capability
4. Hosting Model
5. Data Classification
6. Compliance
7. Certifications
8. Human Oversight
9. Encryption
10. Incident Response
11. Monitoring
12. Logging
13. Data Retention
14. Access Control

For every field return

{
"value":"",
"confidence":0,
"page":0,
"evidence":""
}
"""
        ),
        (
            "human",
            """
Vendor Document

{document}
"""
        )
    ]
)