import { useEffect, useId, useState } from "react";
import { Building2, Cpu, KeyRound, SlidersHorizontal } from "lucide-react";
import "../UserManagement/user_management.css";
import "../../../styles/page_tabs.css";
import "./controls.css";
import { AiRiskApiKeyCard } from "./AiRiskApiKeyCard";
import { ModelCompatibilityChecker } from "./ModelCompatibilityChecker";
import OrganizationConfiguration, {
  type OrgConfigListItem,
} from "./OrganizationConfiguration";
import OrganizationControl from "./OrganizationControl";

type ControlsTab = "key" | "organization";

function Controls() {
  const baseId = useId();
  const [activeTab, setActiveTab] = useState<ControlsTab>("key");
  const [selectedOrg, setSelectedOrg] = useState<OrgConfigListItem | null>(null);

  useEffect(() => {
    document.title = "AI-Q | Controls";
  }, []);

  useEffect(() => {
    if (activeTab !== "organization") setSelectedOrg(null);
  }, [activeTab]);

  const showingOrgControl = activeTab === "organization" && selectedOrg != null;

  return (
    <div className="controlsPage sec_user_page org_settings_page">
      {!showingOrgControl && (
        <>
          <div className="org_settings_header page_header_align heading_user_page">
            <div className="org_settings_headers page_header_row">
              <span className="icon_size_header" aria-hidden>
                <SlidersHorizontal size={24} className="header_icon_svg" />
              </span>
              <div className="page_header_title_block">
                <h1 className="org_settings_title page_header_title">Controls</h1>
                <p className="org_settings_subtitle page_header_subtitle">
                  Configure LLM models, API keys, and organization settings.
                </p>
              </div>
            </div>
          </div>

          <div className="page_tabs controlsPage__tabs" role="tablist" aria-label="Controls sections">
            <button
              type="button"
              role="tab"
              id={`${baseId}-tab-key`}
              aria-selected={activeTab === "key"}
              aria-controls={`${baseId}-panel-key`}
              className={`page_tab ${activeTab === "key" ? "page_tab_active" : ""}`}
              onClick={() => setActiveTab("key")}
            >
              <KeyRound size={18} />
              Key Configuration
            </button>
            <button
              type="button"
              role="tab"
              id={`${baseId}-tab-org`}
              aria-selected={activeTab === "organization"}
              aria-controls={`${baseId}-panel-org`}
              className={`page_tab ${activeTab === "organization" ? "page_tab_active" : ""}`}
              onClick={() => setActiveTab("organization")}
            >
              <Building2 size={18} />
              Organization Configuration
            </button>
          </div>
        </>
      )}

      {activeTab === "key" && (
        <div
          className="controlsPage__cards"
          role="tabpanel"
          id={`${baseId}-panel-key`}
          aria-labelledby={`${baseId}-tab-key`}
        >
          <section
            className="org_settings_card controlsPage__card"
            aria-labelledby={`${baseId}-llm-title`}
          >
            <div className="controlsPage__cardHead">
              <span className="controlsPage__cardIconWrap" aria-hidden>
                <Cpu size={20} strokeWidth={2} />
              </span>
              <div className="controlsPage__cardHeadText">
                <h2 id={`${baseId}-llm-title`} className="controlsPage__cardTitle">
                  LLM Model Configuration
                </h2>
                <p className="controlsPage__cardHint">
                  Choose and validate the Bedrock model used for AI assessments.
                </p>
              </div>
            </div>

            <ModelCompatibilityChecker idPrefix={`${baseId}-llm-model`} />
          </section>

          <AiRiskApiKeyCard idPrefix={`${baseId}-api-key`} />
        </div>
      )}

      {activeTab === "organization" && (
        <div
          role="tabpanel"
          id={`${baseId}-panel-org`}
          aria-labelledby={`${baseId}-tab-org`}
        >
          {selectedOrg ? (
            <OrganizationControl
              org={selectedOrg}
              onBack={() => setSelectedOrg(null)}
              onControls={() => {
                setSelectedOrg(null);
                setActiveTab("key");
              }}
            />
          ) : (
            <OrganizationConfiguration onOpenOrg={setSelectedOrg} />
          )}
        </div>
      )}
    </div>
  );
}

export default Controls;
