-- Vendor self attestation: HIPAA Business Associate Agreement (Yes/No) for Compliance & Certifications
ALTER TABLE vendor_self_attestations
  ADD COLUMN IF NOT EXISTS hipaa_baa VARCHAR(100);
