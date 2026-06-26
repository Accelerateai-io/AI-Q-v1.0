import type { ChangeEvent } from "react";

export interface BuyerDataInterface {
  organizationName: string;
  organizationType: string;
  sector: {
    public_sector: string[];
    private_sector: string[];
    non_profit_sector: string[];
  };
  organizationWebsite: string;
  organizationDescription: string;

  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactRole: string;
  departmentOwner: string;

  employeeCount: string;
  annualRevenue: string;
  yearFounded: string;

  headquartersLocation: string;
  operatingRegions: string[];
  dataResidencyRequirements: string[];

  existingAIInitiatives: string;
  aiGovernanceMaturity: string;
  dataGovernanceMaturity: string;
  aiSkillsAvailability: string;
  changeManagementCapability: string;

  primaryRegulatoryFrameworks: string[];
  regulatoryPenaltyExposure: string;
  dataClassificationHandled: string[];
  piiHandling: string;

  existingTechStack: string[];
  aiRiskAppetite: string;
  acceptableRiskLevel: string;
}


/** Field-level validation errors (field name -> message) from Zod */
export interface StepFieldErrors {
  [field: string]: string;
}

export interface StepPropsBuyerrData {
  formBuyerData: BuyerDataInterface;
  setFormBuyerData: React.Dispatch<React.SetStateAction<BuyerDataInterface>>;
  /** When Continue fails, parent passes Zod field errors for this step */
  fieldErrors?: StepFieldErrors;
  /** Optional header (from tab config) */
  title?: string;
  subTitle?: string;
  icon?: React.ReactNode;
}

export type FormElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement;

export type FormChangeEvent = ChangeEvent<FormElement>;
