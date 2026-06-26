import React from "react";
import { Info } from "lucide-react";
const ErrorText = ({ error_text }) => {
  return (
    <>
      <div className="error_text_sec">
        <Info size={14} className="error_icon" />

        <p>{error_text}</p>
      </div>
    </>
  );
};

export default ErrorText;
