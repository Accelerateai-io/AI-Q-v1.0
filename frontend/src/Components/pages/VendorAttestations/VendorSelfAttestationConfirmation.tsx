/**
 * Shown after successful Vendor Self Attestation submit.
 * Auto-redirects to login after a few seconds; provides manual link if redirect fails.
 */
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import CardContainerOnBoarding from "../../UI/CardContainerOnBoarding";

// const REDIRECT_DELAY_MS = 5000;

const VendorSelfAttestationConfirmation = () => {
  // const navigate = useNavigate();

  // useEffect(() => {
  //   const t = setTimeout(() => {
  //     navigate("/login", { replace: true });
  //   }, REDIRECT_DELAY_MS);
  //   return () => clearTimeout(t);
  // }, [navigate]);

  return (
    <div className="vendor_self_attestation_confirmation_center">
      <CardContainerOnBoarding>
        <div className="onboarding_setup_card">
          <CheckCircle className="confirm_onboarding" />
          <h2>Submission successful</h2>
          <p>
            Your Vendor Self Attestation has been saved.
          </p>
        {/* <p>
          Your Vendor Self Attestation has been saved. You will be redirected to
          the login page in a few seconds.
        </p> */}
        {/* <p>
          If you are not redirected,{" "}
          <Link to="/login">click here to go to the login page</Link>.
        </p> */}
        </div>
      </CardContainerOnBoarding>
    </div>
  );
};

export default VendorSelfAttestationConfirmation;
