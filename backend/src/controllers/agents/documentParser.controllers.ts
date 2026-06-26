/**
 * Compliance document parsing for vendor attestation uploads.
 * Re-exports the service used after attestation submit; HTTP routes can import from here if needed.
 */
export {
  extractExpiryFromText,
  parseAndStoreComplianceDocumentExpiries,
  type ComplianceDocExpiryEntry,
  type ComplianceDocExpiryMap,
} from "../../services/complianceDocumentParser.js";
