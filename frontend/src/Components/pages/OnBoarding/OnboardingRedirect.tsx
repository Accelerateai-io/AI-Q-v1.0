import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import LoadingMessage from "../../UI/LoadingMessage";
import { getApiBaseUrl } from "../../../utils/apiBaseUrl";

/**
 * Authenticated landing for the bare `/onBoarding` route. An admin who signed in
 * but has not finished onboarding (e.g. their emailed link expired) used to hit
 * "Page Not Found" here. Instead we ask the server for a FRESH onboarding link and
 * forward them to it.
 */
const OnboardingRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    document.title = "AI-Q | Onboarding";

    const run = async () => {
      const bearerToken = sessionStorage.getItem("bearerToken");
      if (!bearerToken) {
        navigate("/login", { replace: true });
        return;
      }
      try {
        const res = await fetch(`${getApiBaseUrl()}/onboarding/self-link`, {
          method: "GET",
          headers: { Authorization: `Bearer ${bearerToken}` },
        });
        const data = (await res.json().catch(() => ({}))) as {
          token?: string;
          onboardingPath?: string;
          onboardingCompleted?: boolean;
          message?: string;
        };
        if (cancelled) return;

        if (res.ok && data.onboardingCompleted) {
          navigate("/dashboard", { replace: true });
          return;
        }
        if (res.ok && data.token && data.onboardingPath) {
          sessionStorage.setItem("onboardingToken", data.token);
          navigate(data.onboardingPath, { replace: true });
          return;
        }
        toast.error(data.message || "Could not start onboarding. Please sign in again.");
        navigate("/login", { replace: true });
      } catch {
        if (cancelled) return;
        toast.error("Could not start onboarding. Please try again.");
        navigate("/login", { replace: true });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return <LoadingMessage message="Preparing your onboarding…" />;
};

export default OnboardingRedirect;
