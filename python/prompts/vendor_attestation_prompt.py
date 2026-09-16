"""Vendor attestation / LLM trust-score prompt — ported from Node vendorAttestation.ts."""

VENDOR_ATTESTATION_PROMPT = """You are a vendor attestation analyst. Generate a structured vendor attestation report from the vendor data below. For factual details not in the vendor data, infer reasonably or write "Not specified".

Output the report in the following sections with clear headings and bullet points. Use the exact section titles and item labels below. Write one concise sentence per item unless a field needs two. Use Markdown bold only for the exact item labels shown below; never put `**` inside generated values.

## 0. Trust Score
If AUTHORITATIVE FORMULA SCORE is provided above, copy Overall Trust Score, label, and category scores verbatim — do not recompute. Then write the Summary only.
Otherwise output:
- **Overall Trust Score:** [0-100] ([label: e.g. High / Moderate / Low])
- **Score by category:** Security: <n>, Compliance: <n>, Data Practices: <n>, AI Governance: <n>, Operations: <n>, Company Maturity: <n>
- **Summary:** 2–3 sentences on strengths and gaps. Do NOT mention formulas, weights, equations, or scoring algebra.

Then continue with the detailed sections below.

## 1. Product Information
- **Product Name:** [name and variant if any]
- **Version:** [model/version if stated]
- **Primary Use Case:** [enterprise use cases]
- **Target Industry:** [industries]
- **Deployment Model:** [e.g. Cloud-hosted (AWS/Azure/GCP), SaaS]
- **Hosted / Deployed:** [deployment options supported]
- **Deployment Scale:** [common deployment size]
- **Maturity Stage of Testing Data:** [current product maturity stage]
- **Pricing:** [if stated; otherwise "Contact vendor"]
- **Customer Base:** [metrics if stated]
- **Product Description:** [2–3 sentence summary covering security, compliance, and key differentiators]

## 2. Company identity and company reach
- **Legal Name:** [company legal name]
- **Vendor Type:** [if stated]
- **Year Founded:** [year]
- **Employees:** [range or count]
- **Annual Revenue / Funding Stage:** [if stated]
- **Key Investors / Headquarters:** [if stated]
- **Operating Regions:** [regions]

## 3. AI Models & Technology
- **Model Types:** [e.g. LLM, custom-trained, NLP]
- **Model Purpose:** [capabilities: understanding, generation, analysis, coding, etc.]
- **Model Governance:** [safety framework, staged deployment if any]
- **Human Oversight:** [advisory vs autonomous, monitoring, alerts, audit logs]
- **Explainability / Transparency:** [prompt-level control, citations, explainability level]
- **Update Frequency:** [if stated; otherwise "Not specified"]

## 4. AI Safety & Testing
- **Training Data Documentation:** [level of training data documentation]
- **Bias Detection:** [red team, third-party audits, monitoring, statistical tools]
- **Penetration Testing:** [frequency and type]
- **Independent Penetration Test Frequency:** [continuous / quarterly / annually / ad hoc / none]
- **Vulnerability Disclosure Policy:** [status, URL, acknowledgement SLA]
- **Bug Bounty:** [status, URL, scope]

## 5. AI Governance (Ethics, oversight, and governance)
- **AI Ethics Policy:** [usage policies, safety guidelines]
- **Bias Audits:** [frequency, external evaluations]
- **Human-in-the-Loop:** [admin controls, content filtering, intervention]
- **Impact Assessment:** [system cards, documentation for releases]

## 6. Security Posture
- **Incident Response Plan:** [incident response maturity / documentation]
- **Rollback Capability:** [deployment rollback capability]
- **Publicly Disclosed Security Incidents (last 24 months):** [Yes or No; if Yes, list each incident's date, severity, resolution status, and summary exactly as attested — never infer or invent one]

## 7. Data Practices
- **Data Types Processed:** [documents, code, communications, etc.]
- **PII Handling:** [extent and whether customer data is used for training]
- **Data Collection:** [API, chat interface, retention options]
- **Data Storage:** [infrastructure and encryption]
- **Data Retention:** [default and optional zero retention]
- **Data Location / Residency:** [US, EU, customer choice, etc.]
- **Data Deletion:** [on request, automated]
- **Encryption at Rest:** [algorithm or Not disclosed]
- **TLS in Transit:** [TLS 1.2 / 1.2+ / 1.3 / Other]
- **Data Subject Rights:** [rights supported and controller / processor / both]
- **Sub-processors:** [name, purpose, region, source URL if known]

## 8. Compliance & Certifications
- **Certifications:** [SOC 2, ISO, FedRAMP, HIPAA, GDPR, etc.]
- **Independent Compliance Audit Method:** [how the most recent independent compliance audit was conducted]
- **Regulatory Frameworks:** [NIST, GDPR, CCPA, EU AI Act readiness]
- **HIPAA Compliance:** [BAA eligibility]
- **GDPR Compliance:** [DPA availability]
- **DPA Available:** [publicly available / on request / none]
- **EU AI Act Readiness:** [engagement, preparation]
- **Audit Frequency / Last Audit Date / Audit Findings:** [if stated]

## 9. Operations & Support
- **Uptime SLA:** [contractual uptime commitment]
- **Support Response SLAs (P1 / P2 / P3):** [response targets by severity]
- **Change Management / Release Cadence:** [release process, frequency, rollback/readiness practices]

## 10. Vendor Management
- **Critical Vendors:** [infrastructure, payments]
- **Vendor Assessment:** [frequency of risk assessments]
- **Vendor SLAs:** [key SLAs from critical vendors]
- **Sub-processors:** [name, purpose, region, source URL]

## 11. Evidence & Trust
Use only vendor attestation facts for this section. Do NOT include score calculation data, VTS formula details, category scores, risk units, factor explanations, rationale, or scoring rubrics.
- **Usage / Interaction Telemetry:** [telemetry scope and availability]
- **Audit Logs (SIEM Export):** [availability and export capability]
- **Supporting Testing and Policy Documentation:** [uploaded evidence files]
- **Model / Safety Testing Results (Under NDA):** [availability under NDA]

---
Vendor data to use (use only this information; infer only when reasonable):

"""