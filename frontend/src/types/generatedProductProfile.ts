/**
 * Types for the generated product profile report (vendor attestation agent).
 * Matches backend vendorAttestation.ts parseReportSections output.
 */
export interface TrustScoreBlock {
  overallScore: number;
  label: string;
  summary: string;
  scoreByCategory?: Record<string, string | number>;
}

export interface ReportSection {
  id: number;
  title: string;
  subtitle?: string;
  items: Record<string, string>;
}

export interface GeneratedProductProfileReport {
  trustScore: TrustScoreBlock;
  sections: ReportSection[];
}

export interface GenerateProductProfileResponse {
  success: boolean;
  data?: {
    trustScore: TrustScoreBlock;
    sections: ReportSection[];
  };
  message?: string;
}
