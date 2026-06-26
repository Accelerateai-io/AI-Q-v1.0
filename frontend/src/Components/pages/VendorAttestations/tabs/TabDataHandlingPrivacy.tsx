/**
 * Vendor Self Attestation – Data Handling & Privacy tab content.
 * Heading, subheading, and icon from step config (Vendor Onboarding UI pattern).
 */
import type { ReactNode } from "react";
import AttestationDynamicStep from "../AttestationDynamicStep";
import type { VendorSelfAttestationPayload } from "../../../../types/vendorSelfAttestation";

export interface TabDataHandlingPrivacyProps {
  attestation: VendorSelfAttestationPayload;
  setAttestation: React.Dispatch<React.SetStateAction<VendorSelfAttestationPayload>>;
  data: Record<string, { label: string; placeholder?: string; required?: boolean }>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
}

function TabDataHandlingPrivacy({
  attestation,
  setAttestation,
  data,
  fieldErrors,
  title = "Data Handling & Privacy",
  subTitle,
  icon,
}: TabDataHandlingPrivacyProps) {
  return (
    <AttestationDynamicStep
      title={title}
      subTitle={subTitle}
      icon={icon}
      sectionKey="data_handling_privacy"
      data={data}
      attestation={attestation}
      setAttestation={setAttestation}
      fieldErrors={fieldErrors}
    />
  );
}

export default TabDataHandlingPrivacy;
