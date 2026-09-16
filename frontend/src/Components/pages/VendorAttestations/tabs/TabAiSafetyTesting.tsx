/**
 * Vendor Self Attestation – AI Safety & Testing tab content.
 */
import type { ReactNode } from "react";
import AttestationDynamicStep from "../AttestationDynamicStep";
import FormField from "../../../UI/FormField";
import Select from "../../../UI/Select";
import Input from "../../../UI/Input";
import type {
  BugBountyProgram,
  VendorSelfAttestationPayload,
  VulnerabilityDisclosurePolicy,
} from "../../../../types/vendorSelfAttestation";
import {
  BUG_BOUNTY_STATUS_OPTIONS,
  VDP_STATUS_OPTIONS,
} from "../../../../constants/vendorAttestationOptions";

export interface TabAiSafetyTestingProps {
  attestation: VendorSelfAttestationPayload;
  setAttestation: React.Dispatch<React.SetStateAction<VendorSelfAttestationPayload>>;
  data: Record<string, { label: string; placeholder?: string; required?: boolean }>;
  fieldErrors?: Record<string, string>;
  title?: string;
  subTitle?: string;
  icon?: ReactNode;
}

const EMPTY_VDP: VulnerabilityDisclosurePolicy = {
  status: "",
  url: "",
  ack_sla_hours: "",
};

const EMPTY_BUG_BOUNTY: BugBountyProgram = {
  status: "",
  url: "",
  scope: "",
};

function TabAiSafetyTesting({
  attestation,
  setAttestation,
  data,
  fieldErrors,
  title = "AI Safety & Testing",
  subTitle,
  icon,
}: TabAiSafetyTestingProps) {
  const vdp = attestation.vulnerability_disclosure_policy ?? EMPTY_VDP;
  const bounty = attestation.bug_bounty ?? EMPTY_BUG_BOUNTY;
  const showVdpDetails = vdp.status === "published" || vdp.status === "on_request";
  const showBountyDetails = bounty.status === "public" || bounty.status === "private";

  function updateVdp(patch: Partial<VulnerabilityDisclosurePolicy>) {
    const nextStatus = patch.status ?? vdp.status;
    const next =
      nextStatus === "none"
        ? { ...EMPTY_VDP, status: nextStatus }
        : { ...vdp, ...patch };
    setAttestation((prev) => ({ ...prev, vulnerability_disclosure_policy: next }));
  }

  function updateBounty(patch: Partial<BugBountyProgram>) {
    const nextStatus = patch.status ?? bounty.status;
    const next =
      nextStatus === "none"
        ? { ...EMPTY_BUG_BOUNTY, status: nextStatus }
        : { ...bounty, ...patch };
    setAttestation((prev) => ({ ...prev, bug_bounty: next }));
  }

  return (
    <>
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

      <div className="form_fields_vendor">
        <FormField
          label="Do you publish a VDP?"
          mandatory={true}
          tooltipText="Vulnerability Disclosure Policy status, URL, and acknowledgement SLA."
          errorText={fieldErrors?.vulnerability_disclosure_policy}
        >
          <Select
            labelName=""
            id="vulnerability_disclosure_policy_status"
            name="vulnerability_disclosure_policy_status"
            value={vdp.status}
            onChange={(e) => updateVdp({ status: e.target.value })}
            default_option="Select VDP status"
            options={VDP_STATUS_OPTIONS}
            required
          />
        </FormField>
      </div>
      {showVdpDetails && (
        <>
          <div className="form_fields_vendor">
            <Input
              labelName="VDP URL"
              type="url"
              id="vulnerability_disclosure_policy_url"
              name="vulnerability_disclosure_policy_url"
              value={vdp.url}
              onChange={(e) => updateVdp({ url: e.target.value })}
            />
          </div>
          <div className="form_fields_vendor">
            <Input
              labelName="Acknowledgement SLA (hours)"
              type="text"
              id="vulnerability_disclosure_policy_ack"
              name="vulnerability_disclosure_policy_ack"
              value={vdp.ack_sla_hours}
              onChange={(e) =>
                updateVdp({ ack_sla_hours: e.target.value.replace(/[^\d]/g, "") })
              }
            />
          </div>
        </>
      )}

      <div className="form_fields_vendor">
        <FormField
          label="Do you run a bug bounty?"
          mandatory={true}
          tooltipText="Bug bounty status, URL, and scope."
          errorText={fieldErrors?.bug_bounty}
        >
          <Select
            labelName=""
            id="bug_bounty_status"
            name="bug_bounty_status"
            value={bounty.status}
            onChange={(e) => updateBounty({ status: e.target.value })}
            default_option="Select bug bounty status"
            options={BUG_BOUNTY_STATUS_OPTIONS}
            required
          />
        </FormField>
      </div>
      {showBountyDetails && (
        <>
          <div className="form_fields_vendor">
            <Input
              labelName="Bug bounty URL"
              type="url"
              id="bug_bounty_url"
              name="bug_bounty_url"
              value={bounty.url}
              onChange={(e) => updateBounty({ url: e.target.value })}
            />
          </div>
          <div className="form_fields_vendor">
            <Input
              labelName="Scope"
              type="text"
              id="bug_bounty_scope"
              name="bug_bounty_scope"
              value={bounty.scope}
              onChange={(e) => updateBounty({ scope: e.target.value })}
            />
          </div>
        </>
      )}
    </>
  );
}

export default TabAiSafetyTesting;
