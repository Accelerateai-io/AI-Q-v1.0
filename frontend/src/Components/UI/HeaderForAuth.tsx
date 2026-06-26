import React from "react";
import { Shield } from "lucide-react";

/** Shared auth header: logo only (same as Login). No platform title text. */
const HeaderForAuth = () => {
  return (
    <div className="header_for_auth" aria-label="AI Eval">
      <span>
        <Shield size={24} aria-hidden />
      </span>
      <p>AI Eval Platform</p>
    </div>
  );
};

export default HeaderForAuth;
