import { useCallback, useEffect, useId, useState } from "react";
import { Copy, Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react";
import {
  fetchAiRiskApiKeyConfig,
  saveAiRiskApiKey,
} from "../../../utils/aiRiskApiKeyApi";

type AiRiskApiKeyCardProps = {
  idPrefix?: string;
};

export function AiRiskApiKeyCard({ idPrefix }: AiRiskApiKeyCardProps) {
  const generatedId = useId();
  const baseId = idPrefix ?? generatedId;
  const inputId = `${baseId}-input`;

  const [apiKey, setApiKey] = useState("");
  const [appliedKey, setAppliedKey] = useState("");
  const [baseUrlConfigured, setBaseUrlConfigured] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [statusMessage, setStatusMessage] = useState("");

  const hasAppliedKey = Boolean(appliedKey.trim());
  const canSave = Boolean(apiKey.trim()) && apiKey.trim() !== appliedKey;
  const canCopy = Boolean((apiKey || appliedKey).trim());

  const loadConfig = useCallback(async () => {
    const token = sessionStorage.getItem("bearerToken");
    if (!token) {
      setIsLoading(false);
      setSaveStatus("error");
      setStatusMessage("Sign in to manage the AI Risk API key.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchAiRiskApiKeyConfig();
      if (result.ok === false) {
        setSaveStatus("error");
        setStatusMessage(result.message);
        return;
      }

      const key = result.config.apiKey.trim();
      setApiKey(key);
      setAppliedKey(key);
      setBaseUrlConfigured(result.config.baseUrlConfigured);
      setSaveStatus("idle");
      setStatusMessage(
        result.config.baseUrlConfigured
          ? ""
          : "API key can be saved; also set AI_RISK_INTELLECT_BASE_URL (or RI_BASE_URL) so scoring can use likelihood, impact, severity, and intent from AI Risk Intellect.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const handleCopy = async () => {
    const value = (apiKey || appliedKey).trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus("copied");
      setStatusMessage("API key copied to clipboard.");
      window.setTimeout(() => {
        setCopyStatus("idle");
        setStatusMessage((msg) =>
          msg === "API key copied to clipboard." ? "" : msg,
        );
      }, 2000);
    } catch {
      setCopyStatus("error");
      setStatusMessage("Unable to copy API key.");
    }
  };

  const handleSave = async () => {
    const value = apiKey.trim();
    if (!value) {
      setSaveStatus("error");
      setStatusMessage("Enter an API key before saving.");
      return;
    }

    setIsSaving(true);
    setSaveStatus("idle");
    setStatusMessage("");

    try {
      const result = await saveAiRiskApiKey(value);
      if (result.ok === false) {
        setSaveStatus("error");
        setStatusMessage(result.message);
        return;
      }

      const saved = result.config.apiKey.trim() || value;
      setAppliedKey(saved);
      setApiKey(saved);
      setBaseUrlConfigured(result.config.baseUrlConfigured);
      setSaveStatus("success");
      setStatusMessage(
        result.config.baseUrlConfigured
          ? "AI Risk API key saved. Product (VTS) scoring will use likelihood, impact, and severity from AI Risk Intellect; Vendor and Buyer COTS will use it for intent after matching risks from the AI-Q risk DB."
          : "AI Risk API key saved. Set AI_RISK_INTELLECT_BASE_URL (or RI_BASE_URL) on the server to enable Risk Intellect scoring.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const statusClassName =
    saveStatus === "error" || copyStatus === "error"
      ? "adminPage__modelStatus adminPage__modelStatus--error"
      : saveStatus === "success" || copyStatus === "copied"
        ? "adminPage__modelStatus adminPage__modelStatus--success"
        : "adminPage__modelStatus";

  return (
    <section
      className="org_settings_card controlsPage__card"
      aria-labelledby={`${baseId}-title`}
    >
      <div className="controlsPage__cardHead">
        <span className="controlsPage__cardIconWrap" aria-hidden>
          <KeyRound size={20} strokeWidth={2} />
        </span>
        <div className="controlsPage__cardHeadText">
          <h2 id={`${baseId}-title`} className="controlsPage__cardTitle">
            AI Risk API Key
          </h2>
          <p className="controlsPage__cardHint">
            Used for likelihood, impact, and severity on Product Profile (VTS) scoring, and intent scoring on Vendor and Buyer COTS assessments.
          </p>
        </div>
      </div>

      <div className="adminPage__modelField">
        <div className="adminPage__modelLabelRow">
          <label className="adminPage__modelLabel" htmlFor={inputId}>
            API key
          </label>
          <span
            className="adminPage__modelCurrent"
            role="status"
            aria-live="polite"
          >
            {isLoading
              ? "Loading…"
              : hasAppliedKey
                ? baseUrlConfigured
                  ? "Configured"
                  : "Key set (base URL missing)"
                : "Not set"}
          </span>
        </div>

        <div className="adminPage__modelControls">
          <div className="controlsPage__apiKeyInputWrap">
            <input
              id={inputId}
              className="controlsPage__apiKeyInput"
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setSaveStatus("idle");
                if (copyStatus !== "idle") setCopyStatus("idle");
                setStatusMessage("");
              }}
              placeholder="Enter AI Risk API key"
              autoComplete="off"
              spellCheck={false}
              disabled={isSaving || isLoading}
            />
            <button
              type="button"
              className="controlsPage__apiKeyToggle"
              onClick={() => setShowKey((value) => !value)}
              aria-label={showKey ? "Hide API key" : "Show API key"}
              disabled={isSaving || isLoading}
            >
              {showKey ? (
                <EyeOff size={18} strokeWidth={1.75} aria-hidden />
              ) : (
                <Eye size={18} strokeWidth={1.75} aria-hidden />
              )}
            </button>
          </div>

          <div className="adminPage__modelActions">
            <button
              type="button"
              className="adminPage__ghostBtn adminPage__modelTestBtn"
              onClick={() => void handleCopy()}
              disabled={!canCopy || isSaving || isLoading}
            >
              <Copy size={16} aria-hidden />
              {copyStatus === "copied" ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              className="usersPage__btn usersPage__btn--primary adminPage__modelApplyBtn"
              onClick={() => void handleSave()}
              disabled={!canSave || isSaving || isLoading}
              aria-busy={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2
                    className="usersPage__spinner"
                    size={16}
                    aria-hidden
                  />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={16} aria-hidden />
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        {statusMessage ? (
          <p className={statusClassName} role="status" aria-live="polite">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </section>
  );
}
