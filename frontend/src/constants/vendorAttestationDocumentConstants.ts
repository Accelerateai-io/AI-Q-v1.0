/**
 * Document upload categories for Vendor Self Attestation (multi-select).
 * Exported for reuse in StepDocUpload and preview.
 */
export const DOCUMENT_CATEGORIES = [
  { label: "SOC 2 Type 1", value: "SOC 2 Type 1" },
  { label: "SOC 2 Type 2", value: "SOC 2 Type 2" },
  { label: "ISO 27001", value: "ISO 27001" },
  { label: "ISO 42001 (AI Management)", value: "ISO 42001 (AI Management)" },
  { label: "HIPAA BAA", value: "HIPAA BAA" },
  { label: "HITRUST", value: "HITRUST" },
  { label: "FedRAMP", value: "FedRAMP" },
  { label: "PCI DSS", value: "PCI DSS" },
  { label: "GDPR Compliant", value: "GDPR Compliant" },
  { label: "CCPA Compliant", value: "CCPA Compliant" },
  { label: "None", value: "None" },
] as const;

/** Max number of files per upload section (each file upload slot allows up to this many files). */
export const MAX_FILES_PER_UPLOAD = 3;

/** Helper text for the main Document Upload step */
export const DOCUMENT_UPLOAD_HELPER_TEXT =
  "Accepted formats: PDF, DOCX, PPT. Max 3 files per section, 10MB per file.";

/** Helper text for Evidence & Supporting Documentation upload (Testing and Policy) */
export const EVIDENCE_TESTING_POLICY_HELPER_TEXT =
  "Upload supporting documentation for certifications and security controls. Accepted: PDF, DOCX, PPT. Max 3 files, 10MB per file.";

/** Accepted file extensions for validation */
export const ACCEPTED_DOCUMENT_EXTENSIONS = [".pdf", ".doc", ".docx", ".ppt", ".pptx"];

/** Max file size in bytes (10MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
