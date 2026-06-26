/**
 * Vendor Self Attestation – AI Safety & Testing tab content.
 * Heading, subheading, and icon from step config (Vendor Onboarding UI pattern).
 */
import type { ReactNode } from "react";
import AttestationDynamicStep from "../AttestationDynamicStep";
import type { VendorSelfAttestationPayload } from "../../../../types/vendorSelfAttestation";

export interface TabAiSafetyTestingProps {
  attestation: VendorSelfAttestationPayload;
  setAttestation: React.Dispatch<React.SetStateAction<VendorSelfAttestationPayload>>;
  data: Record<string, { label: string; placeholder?: string; required?: boolean }>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
}

function TabAiSafetyTesting({
  attestation,
  setAttestation,
  data,
  fieldErrors,
  title = "AI Safety & Testing",
  subTitle,
  icon,
}: TabAiSafetyTestingProps) {
  return (
    <AttestationDynamicStep
      title={title}
      subTitle={subTitle}
      icon={icon}
      sectionKey="ai_safety_testing"
      data={data}
      attestation={attestation}
      setAttestation={setAttestation}
      fieldErrors={fieldErrors}
    />
  );
}

export default TabAiSafetyTesting;
