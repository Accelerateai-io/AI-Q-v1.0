import React from "react";
import { BUYER_COTS_FIELD_KEYS } from "../../../../constants/buyerCotsAssessmentKeys";
import { BUYER_COTS_ASSESSMENT } from "../../../../constants/buyerCOTSData 1";
import { formatPreviewValue } from "../../../../utils/formatPreviewValue";
import FileUpload from "../../../UI/FileUpload";
import "../../VendorOnboarding/StepVendorOnboardingPreview.css";

const MULTISELECT_KEYS = [
  "integrationSystems",
  "techStack",
  "implementationTeamComposition",
  "regulatoryRequirements",
  "impactedStakeholders",
  "vendorCertifications",
  "operatingRegions",
];

type FormData = Record<string, string>;

// Auto-Generated step commented out in flow; omit from review sections
const SECTION_ORDER: (keyof typeof BUYER_COTS_FIELD_KEYS)[] = [
  "organizationProfile",
  "useCase",
  "vendorEvaluation",
  "readiness",
  "riskProfile",
  "vendorRisk",
  "implementation",
  "evidence",
];

const SECTION_TITLES: Record<string, string> = {
  organizationProfile: "Organization Profile",
  useCase: "Use Case",
  vendorEvaluation: "Vendor Evaluation",
  readiness: "Readiness",
  riskProfile: "Risk Profile",
  vendorRisk: "Vendor Risk",
  implementation: "Implementation",
  evidence: "Evidence",
};

function getPreviewValue(data: FormData, key: string): unknown {
  const v = data[key];
  if (v == null || String(v).trim() === "") return undefined;
  if (MULTISELECT_KEYS.includes(key)) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : String(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function isUploadField(config: { label?: string; placeholder?: string; options?: unknown }): boolean {
  const label = (config.label ?? "").toLowerCase();
  const placeholder = (config.placeholder ?? "").toLowerCase();
  return !config.options && (label.includes("upload") || placeholder.includes("upload"));
}

function parseFileNamesValue(value: string | undefined): string[] {
  if (value == null || String(value).trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

interface StepBuyerCotsPreviewProps {
  formData: FormData;
  title?: string;
  subTitle?: string;
  icon?: React.ReactNode;
}

function StepBuyerCotsPreview({ formData }: StepBuyerCotsPreviewProps) {
  return (
    <div className="vendor_preview">
      <p className="vendor_preview_intro">
        Review your information below. Submit when everything looks correct.
      </p>
      <div className="vendor_preview_sections">
        {SECTION_ORDER.map((sectionKey) => {
          const keys = BUYER_COTS_FIELD_KEYS[sectionKey];
          const sectionData = BUYER_COTS_ASSESSMENT[sectionKey] as Record<
            number,
            { label?: string; placeholder?: string; options?: unknown }
          > | undefined;
          const title = SECTION_TITLES[sectionKey] ?? sectionKey;
          if (!keys?.length) return null;

          return (
            <section key={sectionKey} className="vendor_preview_card">
              <h3 className="vendor_preview_card_title">{title}</h3>
              <dl className="vendor_preview_list">
                {keys.map((key, i) => {
                  const config = sectionData?.[i];
                  const label = config?.label ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
                  const uploadField = config && isUploadField(config);

                  if (uploadField) {
                    const fileNames = parseFileNamesValue(formData[key]);
                    return (
                      <div key={key} className="vendor_preview_row">
                        <dt className="vendor_preview_label">{label}</dt>
                        <dd className="vendor_preview_value">
                          <FileUpload value={fileNames} readOnly />
                        </dd>
                      </div>
                    );
                  }

                  const value = getPreviewValue(formData, key);
                  return (
                    <div key={key} className="vendor_preview_row">
                      <dt className="vendor_preview_label">{label}</dt>
                      <dd className="vendor_preview_value">
                        {formatPreviewValue(value, label)}
                      </dd>
                    </div>
                  );
                })}
                {sectionKey === "vendorEvaluation" &&
                  (formData.integrationSystemsOther ?? "").trim() !== "" && (
                    <div key="integrationSystemsOther" className="vendor_preview_row">
                      <dt className="vendor_preview_label">
                        Integration systems (other details)
                      </dt>
                      <dd className="vendor_preview_value">
                        {formData.integrationSystemsOther}
                      </dd>
                    </div>
                  )}
              </dl>
            </section>
          );
        })}
      </div>
    </div>
  );
}

export default StepBuyerCotsPreview;
