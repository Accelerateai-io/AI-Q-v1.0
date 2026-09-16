import React from "react";
import { BUYER_COTS_FORM_SECTIONS } from "../../../../constants/buyerCotsFormSchema";
import { BUYER_COTS_MULTISELECT_KEYS } from "../../../../constants/buyerCotsAssessmentKeys";
import { flattenOnboardingSectorIndustries } from "../../../../constants/buyerCotsOnboardingMapping";
import { parseEvidenceFilesByCategory } from "../../../../constants/buyerCotsDerived";
import { formatPreviewValue } from "../../../../utils/formatPreviewValue";
import FileUpload from "../../../UI/FileUpload";
import "../../VendorOnboarding/StepVendorOnboardingPreview.css";

type FormData = Record<string, string>;

function getPreviewValue(data: FormData, key: string): unknown {
  const v = data[key];
  if (v == null || String(v).trim() === "") return undefined;
  if ((BUYER_COTS_MULTISELECT_KEYS as readonly string[]).includes(key)) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : String(v);
    } catch {
      return String(v);
    }
  }
  return String(v);
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
        {BUYER_COTS_FORM_SECTIONS.map((section) => (
          <section key={section.id} className="vendor_preview_card">
            <h3 className="vendor_preview_card_title">{section.label}</h3>
            <dl className="vendor_preview_list">
              {section.fields.map((field) => {
                if (field.inputType === "evidenceHold") {
                  const byCategory = parseEvidenceFilesByCategory(formData.vendorComplianceDocumentation);
                  const categoriesWithFiles = Object.entries(byCategory).filter(([, names]) => names.length > 0);
                  return (
                    <div key={field.key} className="vendor_preview_row">
                      <dt className="vendor_preview_label">{field.label}</dt>
                      <dd className="vendor_preview_value">
                        {formatPreviewValue(getPreviewValue(formData, "vendorEvidenceReceived"), field.label)}
                        {categoriesWithFiles.map(([category, names]) => (
                          <div key={category} style={{ marginTop: "0.75rem" }}>
                            <div style={{ fontSize: "0.875rem", marginBottom: "0.35rem" }}>{category}</div>
                            <FileUpload value={names} readOnly />
                          </div>
                        ))}
                      </dd>
                    </div>
                  );
                }
                if (field.inputType === "file") {
                  const fileNames = parseFileNamesValue(formData[field.key]);
                  return (
                    <div key={field.key} className="vendor_preview_row">
                      <dt className="vendor_preview_label">{field.label}</dt>
                      <dd className="vendor_preview_value">
                        <FileUpload value={fileNames} readOnly />
                      </dd>
                    </div>
                  );
                }
                if (field.inputType === "industrySector") {
                  return (
                    <div key={field.key} className="vendor_preview_row">
                      <dt className="vendor_preview_label">{field.label}</dt>
                      <dd className="vendor_preview_value">
                        {formatPreviewValue(
                          flattenOnboardingSectorIndustries(formData.industrySector),
                          field.label,
                        )}
                      </dd>
                    </div>
                  );
                }
                if (field.inputType === "vendorProduct") {
                  return (
                    <React.Fragment key={field.key}>
                      <div className="vendor_preview_row">
                        <dt className="vendor_preview_label">Vendor</dt>
                        <dd className="vendor_preview_value">
                          {formatPreviewValue(formData.vendorName, "Vendor")}
                        </dd>
                      </div>
                      <div className="vendor_preview_row">
                        <dt className="vendor_preview_label">Product</dt>
                        <dd className="vendor_preview_value">
                          {formatPreviewValue(formData.productName, "Product")}
                        </dd>
                      </div>
                    </React.Fragment>
                  );
                }
                if (field.inputType === "targetOutcome") {
                  return (
                    <div key={field.key} className="vendor_preview_row">
                      <dt className="vendor_preview_label">{field.label}</dt>
                      <dd className="vendor_preview_value">
                        {formatPreviewValue(formData.expectedOutcomes || formData.targetOutcomeMetric, field.label)}
                      </dd>
                    </div>
                  );
                }
                if (field.inputType === "accountableOwner") {
                  return (
                    <div key={field.key} className="vendor_preview_row">
                      <dt className="vendor_preview_label">{field.label}</dt>
                      <dd className="vendor_preview_value">
                        {formatPreviewValue(
                          [formData.owningDepartment, formData.accountableOwnerName, formData.accountableOwnerRole]
                            .filter(Boolean)
                            .join(" — "),
                          field.label,
                        )}
                      </dd>
                    </div>
                  );
                }
                if (field.inputType === "assessor") {
                  return (
                    <div key={field.key} className="vendor_preview_row">
                      <dt className="vendor_preview_label">{field.label}</dt>
                      <dd className="vendor_preview_value">
                        {formatPreviewValue(
                          [formData.assessorName, formData.assessorRole].filter(Boolean).join(" — "),
                          field.label,
                        )}
                      </dd>
                    </div>
                  );
                }
                const value = getPreviewValue(formData, field.key);
                return (
                  <div key={field.key} className="vendor_preview_row">
                    <dt className="vendor_preview_label">{field.label}</dt>
                    <dd className="vendor_preview_value">
                      {formatPreviewValue(value, field.label)}
                    </dd>
                  </div>
                );
              })}
              {(formData.integrationSystemsOther ?? "").trim() !== "" && section.id === "environment" && (
                <div className="vendor_preview_row">
                  <dt className="vendor_preview_label">Other systems</dt>
                  <dd className="vendor_preview_value">{formData.integrationSystemsOther}</dd>
                </div>
              )}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

export default StepBuyerCotsPreview;
