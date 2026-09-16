import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CardContainerOnBoarding from "../../../UI/CardContainerOnBoarding";
import CardOnBoarding from "../../../UI/CardOnBoarding";
import StepCompetitiveAnalysis from "./StepCompetitiveAnalysis";
import StepCustomerDiscovery from "./StepCustomerDiscovery";
import StepCustomerRiskContext from "./StepCustomerRiskContext";
import StepSolutionFit from "./StepSolutionFit";
import Button from "../../../UI/Button";
import { ChevronLeftCircle, ChevronRightCircle, Send } from "lucide-react";
import { VENDOR_COTS_DATA } from "../../../../constants/vendorCotsData";
import { VENDOR_COTS_INITIAL_STATE } from "../../../../constants/vendorCotsAssessmentKeys";
import StepCustomerRiskMitigation from "./StepCustomerRiskMitigation";
import SubmitProgressOverlay from "../../UI/SubmitProgressOverlay";
import { apiErrorMessage, errorToUserMessage } from "../../../utils/tokenQuotaError";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const VendorCOTSMain = () => {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "AI-Q | Vendor COTS";
  });
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [allStepsFilled, setAllStepsFilled] = useState<boolean>(false);
  const [formData, setFormData] = useState<Record<string, string>>({ ...VENDOR_COTS_INITIAL_STATE });
  const [submitError, setSubmitError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleContinue = () => {
    setCurrentStep((prev) => prev + 1);
  };

  const handleBack = () => setCurrentStep((prev) => prev - 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    const token = sessionStorage.getItem("bearerToken");
    if (!token) {
      setSubmitError("Please log in to submit.");
      setSubmitting(false);
      return;
    }
    try {
      const response = await fetch(`${BASE_URL}/vendorCotsAssessment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(apiErrorMessage(result, "Failed to submit assessment"));
      }
      setAllStepsFilled(true);
      setTimeout(() => navigate("/assessments"), 2000);
    } catch (err) {
      setSubmitError(errorToUserMessage(err, "Failed to submit assessment"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CardContainerOnBoarding>
      {submitting && <SubmitProgressOverlay variant="assessment" />}
      <form onSubmit={handleSubmit}>
        <CardOnBoarding className="card_vendor">
          {currentStep === 0 && (
            <StepCustomerDiscovery
              data={VENDOR_COTS_DATA.customer_discovery}
              formData={formData}
              setFormData={setFormData}
            />
          )}
          {currentStep === 1 && (
            <StepSolutionFit
              data={VENDOR_COTS_DATA.solution_fit}
              formData={formData}
              setFormData={setFormData}
            />
          )}
          {currentStep === 2 && (
            <StepCustomerRiskContext
              data={VENDOR_COTS_DATA.customer_risk_context}
              formData={formData}
              setFormData={setFormData}
            />
          )}
          {currentStep === 3 && (
            <StepCompetitiveAnalysis
              data={VENDOR_COTS_DATA.competitive_analysis}
              formData={formData}
              setFormData={setFormData}
            />
          )}
          {currentStep === 4 && (
            <StepCustomerRiskMitigation
              data={VENDOR_COTS_DATA.customer_risk_mitigation}
              formData={formData}
              setFormData={setFormData}
            />
          )}
          {currentStep === 5 && !allStepsFilled && (
            <div className="vendor_preview_step">
              <h2>Review & Submit</h2>
              <p>Review your entries and click Submit to save your assessment.</p>
              {submitError && <p className="error_text" style={{ color: "red" }}>{submitError}</p>}
            </div>
          )}
          {allStepsFilled && (
            <div className="vendor_success_step">
              <h2>Assessment submitted</h2>
              <p>Redirecting to assessments...</p>
            </div>
          )}
        </CardOnBoarding>

        <div className="vendor_action_btns">
          {!allStepsFilled && (
            <div className="action_back">
              <Button
                type="button"
                onClick={currentStep > 0 ? handleBack : undefined}
                disabled={currentStep === 0}
                className="back_btn"
              >
                <span>
                  <ChevronLeftCircle size={16} />
                  Back
                </span>
              </Button>
            </div>
          )}

          {currentStep < 5 && !allStepsFilled && (
            <div className="action_continue_btn">
              <Button
                onClick={handleContinue}
                type="button"
                className="continue_btn"
              >
                <span>
                  Continue <ChevronRightCircle size={16} />
                </span>
              </Button>
            </div>
          )}

          {currentStep === 5 && !allStepsFilled && (
            <div className="action_submit_btn">
              <Button type="submit" className="submit_btn_vendor" disabled={submitting}>
                <span>
                  Submit <Send size={16} />
                </span>
              </Button>
            </div>
          )}
        </div>
      </form>
    </CardContainerOnBoarding>
  );
};

export default VendorCOTSMain;
