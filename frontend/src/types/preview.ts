// src/types/preview.ts

export type PreviewValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | PreviewValue[]
  | { [key: string]: PreviewValue };

export interface PreviewField<T> {
  label: string;
  value: (data: T) => PreviewValue;
}



export interface PreviewSection<T> {
  title: string;
  fields: PreviewField<T>[];
}



/**
 * Represents the vendor datatype collected in the onboarding form for preview
 */
export interface VendorFormData {
  vendorName?: string;
  vendorType?: string;
  vendorMaturity?: string;
  companyWebsite?: string;
  companyDescription?: string;
  employeeCount?: string;
  yearFounded?: number;
  headquartersLocation?: string;
  operatingRegions?: string[];
  primaryContactName?: string;
  primaryContactRole?: string;
  primaryContactEmail?: string;
  sector?: Record<string, string[]>;
}