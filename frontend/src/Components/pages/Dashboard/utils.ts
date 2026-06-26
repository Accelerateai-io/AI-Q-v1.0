/** Re-export dashboard utils from shared utils folder for backward compatibility. */
export {
  BASE_URL,
  formatDisplayDate,
  formatGovDate,
  formatUpdatedDate,
  formatCompletedDate,
  getAssessmentLabel,
  getCompletedByDisplay,
} from "../../../utils/dashboardUtils.js";
export type { AssessmentRowLabel } from "../../../utils/dashboardUtils.js";
export type { AssessmentRow } from "./types";
