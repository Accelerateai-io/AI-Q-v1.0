/**
 * Vendor Self Attestation – Deployment Architecture tab content.
 * Heading, subheading, and icon from step config (Vendor Onboarding UI pattern).
 */
import type { ReactNode } from "react";
import AttestationDynamicStep from "../AttestationDynamicStep";
import type { VendorSelfAttestationPayload } from "../../../../types/vendorSelfAttestation";

export interface TabDeploymentArchitectureProps {
  attestation: VendorSelfAttestationPayload;
  setAttestation: React.Dispatch<React.SetStateAction<VendorSelfAttestationPayload>>;
  data: Record<string, { label: string; placeholder?: string; required?: boolean }>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
}

function TabDeploymentArchitecture({
  attestation,
  setAttestation,
  data,
  fieldErrors,
  title = "Deployment Architecture",
  subTitle,
  icon,
}: TabDeploymentArchitectureProps) {
  return (
    <AttestationDynamicStep
      title={title}
      subTitle={subTitle}
      icon={icon}
      sectionKey="deployment_architecture"
      data={data}
      attestation={attestation}
      setAttestation={setAttestation}
      fieldErrors={fieldErrors}
    />
  );
}

export default TabDeploymentArchitecture;
