export interface AssessmentRow {
  assessmentId: number;
  type: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  /** Expiry date: 3 months from created date */
  expiryAt?: string | null;
  organizationId: string | null;
  productName?: string | null;
  vendorName?: string | null;
  cotsUpdatedAt?: string | null;
  completedByUserEmail?: string | null;
  completedByUserFirstName?: string | null;
  completedByUserLastName?: string | null;
  completedByUserName?: string | null;
  [key: string]: unknown;
}

export interface DashboardStats {
  totalOrganizations: number;
  totalVendors: number;
  totalBuyers: number;
  totalAttestations: number;
}

export interface CertificateItem {
  name: string;
  expiryDate: string | null;
  /** Certification category from document_uploads["2"].byCategory (e.g. ISO 27001). */
  certificateType?: string | null;
  /** Same as certificateType; kept for backward compatibility with API responses. */
  complianceType?: string | null;
}

/** Trust score block from generated profile report (per attestation/product) */
export interface GeneratedProfileTrustScore {
  overallScore?: number;
  summary?: string;
  label?: string;
}

export interface AttestationItem {
  id: string;
  /** Alternate id (vendor_self_attestation_id); assessments may reference either id or this. */
  vendor_self_attestation_id?: string | null;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  /** Expiry date (3 months from created); used to hide expired from dropdown. */
  expiryDate?: string | null;
  /** Product name from attestation (display label); fallback "Vendor Self-Attestation" when empty */
  productName?: string | null;
  /** Certificates uploaded in self-attestation (from backend) */
  certificates?: CertificateItem[];
  /** Generated profile report (trust score + sections) for this attestation/product */
  generated_profile_report?: { trustScore?: GeneratedProfileTrustScore; sections?: unknown[] };
}

/** Vendor COTS assessment row for dashboard (from GET /assessments, type cots_vendor) */
export interface VendorAssessmentItem {
  assessmentId: number | string;
  type: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  /** Expiry date: 3 months from created date */
  expiryAt?: string | null;
  vendorAttestationId?: string | null;
  customerOrganizationName?: string | null;
  productName?: string | null;
  vendorCotsUpdatedAt?: string | null;
  cotsUpdatedAt?: string | null;
  completedByUserFirstName?: string | null;
  completedByUserLastName?: string | null;
  completedByUserName?: string | null;
  completedByUserEmail?: string | null;
}
