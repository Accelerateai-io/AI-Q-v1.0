/**
 * Vendor Self Attestation – Product Profile tab content.
 * Heading, subheading, and icon from step config (Vendor Onboarding UI pattern).
 */
import type { ReactNode } from "react";
import AttestationDynamicStep from "../AttestationDynamicStep";
import type { VendorSelfAttestationPayload } from "../../../../types/vendorSelfAttestation";

export interface TabProductProfileProps {
  attestation: VendorSelfAttestationPayload;
  setAttestation: React.Dispatch<React.SetStateAction<VendorSelfAttestationPayload>>;
  data: Record<string, { label: string; placeholder?: string; required?: boolean }>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
}

function TabProductProfile({
  attestation,
  setAttestation,
  data,
  fieldErrors,
  title = "Product Profile",
  subTitle,
  icon,
}: TabProductProfileProps) {
  return (
    <AttestationDynamicStep
      title={title}
      subTitle={subTitle}
      icon={icon}
      sectionKey="product_profile"
      data={data}
      attestation={attestation}
      setAttestation={setAttestation}
      fieldErrors={fieldErrors}
    />
  );
}

export default TabProductProfile;
