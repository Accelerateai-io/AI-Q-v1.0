/**
 * Vendor Self Attestation – Company Profile tab content.
 * Renders read-only/editable company profile from vendor onboarding.
 * Heading, subheading, and icon from step config (Vendor Onboarding UI pattern).
 */
import type { ReactNode } from "react";
import StepCompanyProfileAttestation from "../StepCompanyProfileAttestation";
import type { AttestationCompanyProfile } from "../../../../types/vendorSelfAttestation";

export interface TabCompanyProfileProps {
  companyProfile: AttestationCompanyProfile;
  setCompanyProfile: React.Dispatch<React.SetStateAction<AttestationCompanyProfile>>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
}

function TabCompanyProfile({
  companyProfile,
  setCompanyProfile,
  fieldErrors,
  title,
  subTitle,
  icon,
}: TabCompanyProfileProps) {
  return (
    <StepCompanyProfileAttestation
      companyProfile={companyProfile}
      setCompanyProfile={setCompanyProfile}
      fieldErrors={fieldErrors}
      title={title}
      subTitle={subTitle}
      icon={icon}
    />
  );
}

export default TabCompanyProfile;
