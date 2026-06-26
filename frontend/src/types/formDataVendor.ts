// VENDOR ONBOARDING TYPES

import type { ChangeEvent } from "react";
export interface VendorDataInterface {
  organization_Id?: string;
  vendorType: string;
  vendorName: string;
  sector: {
    public_sector: string[];
    private_sector: string[];
    non_profit_sector: string[];
  };
  vendorMaturity: string;
  companyWebsite: string;
  companyDescription: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactRole: string;
  employeeCount: string;
  yearFounded: number;
  headquartersLocation: string;
  operatingRegions: string[];
}

/** Field-level validation errors (field name -> message) from Zod */
export interface StepFieldErrors {
  [field: string]: string;
}

export interface StepPropsVendorData {
  formVendorData: VendorDataInterface;
  setFormVendorData: React.Dispatch<React.SetStateAction<VendorDataInterface>>;
  /** When Continue fails, parent passes Zod field errors for this step */
  fieldErrors?: StepFieldErrors;
}

export type FormElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

export type FormChangeEvent = ChangeEvent<FormElement>;
