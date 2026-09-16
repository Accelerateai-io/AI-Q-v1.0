/**
 * Vendor Self Attestation – Deployment Architecture tab content.
 * Heading, subheading, and icon from step config (Vendor Onboarding UI pattern).
 */
import type { ReactNode } from "react";
import AttestationDynamicStep from "../AttestationDynamicStep";
import FormField from "../../../UI/FormField";
import Select from "../../../UI/Select";
import type { VendorSelfAttestationPayload } from "../../../../types/vendorSelfAttestation";
import { TENANT_ISOLATION_MODEL_OPTIONS } from "../../../../constants/vendorAttestationOptions";
import { YES_NO_OPTIONS } from "../../../../constants/vendorOnboardingData";

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
    <>
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
      <div className="form_fields_vendor">
        <FormField
          label="Is the product multi-tenant? What isolation model?"
          mandatory={true}
          tooltipText="Select whether the product is multi-tenant. If yes, choose the isolation model."
          errorText={fieldErrors?.is_multi_tenant}
        >
          <Select
            labelName=""
            id="is_multi_tenant"
            name="is_multi_tenant"
            value={attestation.is_multi_tenant || ""}
            onChange={(e) => {
              const value = e.target.value
              setAttestation((prev) => ({
                ...prev,
                is_multi_tenant: value,
                tenant_isolation_model: value === "yes" ? prev.tenant_isolation_model : "",
              }))
            }}
            default_option="Select Yes or No"
            options={YES_NO_OPTIONS}
            required
          />
        </FormField>
      </div>
      {attestation.is_multi_tenant === "yes" && (
        <div className="form_fields_vendor">
          <FormField
            label="Isolation model"
            mandatory={true}
            tooltipText="How tenant data and workloads are isolated."
            errorText={fieldErrors?.tenant_isolation_model}
          >
            <Select
              labelName=""
              id="tenant_isolation_model"
              name="tenant_isolation_model"
              value={attestation.tenant_isolation_model || ""}
              onChange={(e) =>
                setAttestation((prev) => ({
                  ...prev,
                  tenant_isolation_model: e.target.value,
                }))
              }
              default_option="Select isolation model"
              options={TENANT_ISOLATION_MODEL_OPTIONS}
              required
            />
          </FormField>
        </div>
      )}
    </>
  );
}

export default TabDeploymentArchitecture;
