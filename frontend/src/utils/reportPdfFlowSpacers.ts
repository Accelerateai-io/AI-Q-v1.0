import { jsPDF } from "jspdf";

export const REPORT_PDF_FLOW_SPACER_ATTR = "data-report-pdf-flow-spacer";

/**
 * Max empty space we’ll leave at the bottom of a page for mid-size cards/rows.
 * Text / line atoms may use a higher allowance so lines are never mid-split.
 */
const MAX_EMPTY_PAD_FRAC = 0.28;
/** Prefer unbroken text over density — allow up to ~45% empty to keep a line/para whole. */
const MAX_TEXT_EMPTY_PAD_FRAC = 0.45;

/**
 * Atomic units for PDF slicing across complete / general / BVR reports.
 * Prefer mid-size / leaf blocks (not whole section shells) so we don’t push
 * half-page cards and leave large blank regions.
 * Table rows use spacer <tr> inserts (a <div> before <tr> is invalid and gets relocated).
 */
export const REPORT_PDF_ATOMIC_SELECTOR = [
  /* Document chrome / compact panels */
  ".report_assessment_doc_header",
  ".bvr_doc_header",
  ".report_framework_notice",
  ".report_context_panel",
  ".report_approval_summary_banner",
  ".report_section_heading",
  ".report_exec_brief_section",
  ".report_summary_body > .report_exec_brief_section",
  ".report_detail_info_grid",
  /* Metric / recommendation / list atoms */
  ".report_deployment_roi_pair",
  ".report_deployment_roi_titles",
  ".report_deployment_roi_pair > .report_deployment_item",
  ".report_deployment_roi_pair > .report_roi_card",
  ".report_compliance_card",
  ".report_appendix_card",
  ".report_blocker_item",
  ".report_impl_plan_chunk",
  ".report_risk_category_block",
  ".bvr_risk_block",
  ".bvr_risk_scope_block",
  ".bvr_risk_scope_split_col",
  ".bvr_reco_priority_item",
  ".bvr_recommendation_row",
  ".bvr_priority_item",
  ".bvr_strength_item",
  ".bvr_warning_item",
  ".bvr_vcm_priority_item",
  /* Text / line atoms — never mid-chop a line or short paragraph */
  "p",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  ".report_exec_brief_para",
  ".report_exec_brief_bullet",
  ".report_exec_brief_section_title",
  ".report_framework_notice_text",
  ".report_roi_sub",
  ".report_roi_value",
  ".report_roi_label",
  ".report_deployment_value",
  ".report_deployment_label",
  ".bvr_reco_title",
  ".bvr_reco_desc",
  ".bvr_reco_time",
  ".bvr_risk_summary",
  ".bvr_exec_text",
  /* Tables — keep header + body rows intact across slices */
  ".report_table_wrap thead tr",
  ".report_table_wrap tbody tr",
  ".report_appendix_table_wrap thead tr",
  ".report_appendix_table_wrap tbody tr",
  ".map_action_table_wrap thead tr",
  ".map_action_table_wrap tbody tr",
  ".bvr_matrix_table thead tr",
  ".bvr_matrix_table tbody tr",
  ".report_risk_assessment_table thead tr",
  ".report_risk_assessment_table tbody tr",
  ".report_framework_table thead tr",
  ".report_framework_table tbody tr",
  ".crs_risk_item",
  ".crs_mapping_table thead tr",
  ".crs_mapping_table tbody tr",
  ".report_appendix_risk_table thead tr",
  ".report_appendix_risk_table tbody tr",
].join(", ");

/** Elements we treat as text/line units (keep whole when they fit on one page). */
const REPORT_PDF_TEXT_ATOMIC_SELECTOR = [
  "p",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  ".report_exec_brief_para",
  ".report_exec_brief_bullet",
  ".report_exec_brief_section_title",
  ".report_section_heading",
  ".report_framework_notice_text",
  ".report_roi_sub",
  ".report_roi_value",
  ".report_roi_label",
  ".report_deployment_value",
  ".report_deployment_label",
  ".bvr_reco_title",
  ".bvr_reco_desc",
  ".bvr_reco_time",
  ".bvr_risk_summary",
  ".bvr_exec_text",
].join(", ");

function readCaptureScale(root: HTMLElement): number {
  const raw = getComputedStyle(root)
    .getPropertyValue("--report-pdf-uniform-scale")
    .trim();
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0.1 ? n : 1;
}

function innerHeightWidthRatio(
  marginMm: [number, number, number, number],
  jsPdfOpts: { unit?: string; format?: string | number[]; orientation?: string },
): number {
  const pdf = new jsPDF({
    unit: (jsPdfOpts.unit as "mm") ?? "mm",
    format: (jsPdfOpts.format as string | number[]) ?? "a4",
    orientation: (jsPdfOpts.orientation as "portrait") ?? "portrait",
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const innerW = pageW - marginMm[1] - marginMm[3];
  const innerH = pageH - marginMm[0] - marginMm[2];
  return innerH / innerW;
}

/**
 * Layout Y relative to the capture root in *unscaled* CSS pixels.
 * `getBoundingClientRect` returns post-transform (scaled) coords; html2canvas
 * measures pre-transform layout — divide by the capture scale to match.
 */
function yRelativeToRoot(
  el: HTMLElement,
  root: HTMLElement,
  captureScale: number,
): { top: number; bottom: number } {
  const er = el.getBoundingClientRect();
  const rr = root.getBoundingClientRect();
  const scale = captureScale > 0 ? captureScale : 1;
  const top = (er.top - rr.top) / scale + root.scrollTop;
  const bottom = (er.bottom - rr.top) / scale + root.scrollTop;
  return { top, bottom };
}

function isTableRow(el: HTMLElement): el is HTMLTableRowElement {
  return el.tagName === "TR";
}

function isTextAtomic(el: HTMLElement): boolean {
  try {
    return el.matches(REPORT_PDF_TEXT_ATOMIC_SELECTOR);
  } catch {
    return false;
  }
}

function tableColumnCount(row: HTMLTableRowElement): number {
  const table = row.closest("table");
  if (!table) return Math.max(1, row.cells.length);
  const headRow = table.querySelector("thead tr");
  if (headRow) {
    let n = 0;
    for (const cell of Array.from(headRow.children)) {
      if (!(cell instanceof HTMLTableCellElement)) continue;
      n += Number(cell.colSpan) || 1;
    }
    if (n > 0) return n;
  }
  let n = 0;
  for (const cell of row.cells) {
    n += Number(cell.colSpan) || 1;
  }
  return Math.max(1, n);
}

function hasNestedAtomic(el: HTMLElement): boolean {
  for (const child of Array.from(el.querySelectorAll(REPORT_PDF_ATOMIC_SELECTOR))) {
    if (child instanceof HTMLElement && child !== el && el.contains(child)) {
      return true;
    }
  }
  return false;
}

/**
 * Prefer moving a parent as one unit only when it sits cleanly on a page, or when
 * pushing it would leave only a small empty gap. Otherwise let nested atomics fill
 * the remaining space (avoids half-blank pages).
 */
function skipNestedUnderFittingAncestor(
  el: HTMLElement,
  root: HTMLElement,
  captureScale: number,
  html2canvasScale: number,
  sliceCanvasPx: number,
  bottomSafetyPx: number,
  maxPadFracForAncestor: number,
): boolean {
  let parent = el.parentElement;
  while (parent && parent !== root) {
    if (parent.matches(REPORT_PDF_ATOMIC_SELECTOR)) {
      const { top, bottom } = yRelativeToRoot(parent, root, captureScale);
      const topC = top * html2canvasScale;
      const bottomC = (bottom + bottomSafetyPx) * html2canvasScale;
      const heightC = bottomC - topC;
      if (heightC > sliceCanvasPx + 2) {
        parent = parent.parentElement;
        continue;
      }
      const startSlice = Math.floor(topC / sliceCanvasPx);
      const endSlice = Math.floor((bottomC - 1e-6) / sliceCanvasPx);
      if (startSlice === endSlice) return true;
      const offsetInSlice = topC % sliceCanvasPx;
      const padFrac = (sliceCanvasPx - offsetInSlice) / sliceCanvasPx;
      const parentMaxFrac = isTextAtomic(parent)
        ? MAX_TEXT_EMPTY_PAD_FRAC
        : maxPadFracForAncestor;
      if (padFrac <= parentMaxFrac) return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/** Insert a spacer that stays in flow correctly for both blocks and table rows. */
function insertSpacerBefore(el: HTMLElement, padLayoutPx: number): void {
  if (isTableRow(el)) {
    const spacerRow = document.createElement("tr");
    spacerRow.setAttribute(REPORT_PDF_FLOW_SPACER_ATTR, "true");
    spacerRow.setAttribute("aria-hidden", "true");
    const td = document.createElement("td");
    td.colSpan = tableColumnCount(el);
    td.style.cssText =
      "height:" +
      padLayoutPx +
      "px;padding:0;margin:0;border:none;line-height:0;font-size:0;background:transparent;";
    spacerRow.appendChild(td);
    el.parentNode?.insertBefore(spacerRow, el);
    return;
  }

  const pad = document.createElement("div");
  pad.setAttribute(REPORT_PDF_FLOW_SPACER_ATTR, "true");
  pad.setAttribute("aria-hidden", "true");
  pad.style.cssText =
    "display:block;margin:0;padding:0;border:0;clear:both;width:100%;height:" +
    padLayoutPx +
    "px;flex-shrink:0;";
  el.parentNode?.insertBefore(pad, el);
}

export function removeReportPdfFlowSpacers(root: HTMLElement): void {
  root.querySelectorAll(`[${REPORT_PDF_FLOW_SPACER_ATTR}]`).forEach((n) => n.remove());
}

/**
 * Inserts spacers before cards/rows/lines that would straddle an html2pdf canvas slice,
 * using the same slice height as `Worker.prototype.toPdf`.
 *
 * Policy:
 * - Keep leaf / mid-size blocks whole when they fit on one page.
 * - Text / line atoms always move intact when they fit (higher empty-pad allowance).
 * - Cap empty pad for non-text blocks; nested units fill remaining space when needed.
 */
export function insertReportPdfFlowSpacers(
  root: HTMLElement,
  marginMm: [number, number, number, number],
  html2canvasScale: number,
  jsPdfOpts: { unit?: string; format?: string | number[]; orientation?: string },
): void {
  removeReportPdfFlowSpacers(root);
  const captureScale = readCaptureScale(root);
  const ratio = innerHeightWidthRatio(marginMm, jsPdfOpts);
  const layoutWidth = Math.max(1, root.scrollWidth, root.offsetWidth);
  const sliceCanvasPx = Math.floor(layoutWidth * html2canvasScale * ratio);
  if (sliceCanvasPx <= 1) return;

  const pageLayoutPx = sliceCanvasPx / html2canvasScale;
  const maxPadLayout = Math.floor(pageLayoutPx * MAX_EMPTY_PAD_FRAC);
  const maxTextPadLayout = Math.floor(pageLayoutPx * MAX_TEXT_EMPTY_PAD_FRAC);
  /**
   * ~1 line of body text — keeps the last line on a page from being clipped by
   * anti-alias / subpixel slice edges.
   */
  const bottomSafetyPx = 16;

  const maxIters = 3000;
  for (let iter = 0; iter < maxIters; iter++) {
    const nodes = root.querySelectorAll(REPORT_PDF_ATOMIC_SELECTOR);
    let fixed = false;
    for (const node of nodes) {
      const el = node as HTMLElement;
      if (!(el instanceof HTMLElement) || !root.contains(el)) continue;
      if (el.getAttribute(REPORT_PDF_FLOW_SPACER_ATTR) === "true") continue;
      if (
        skipNestedUnderFittingAncestor(
          el,
          root,
          captureScale,
          html2canvasScale,
          sliceCanvasPx,
          bottomSafetyPx,
          MAX_EMPTY_PAD_FRAC,
        )
      ) {
        continue;
      }

      const { top, bottom } = yRelativeToRoot(el, root, captureScale);
      const height = bottom - top;
      if (height <= 1) continue;

      const topC = top * html2canvasScale;
      const bottomC = (bottom + bottomSafetyPx) * html2canvasScale;
      const startSlice = Math.floor(topC / sliceCanvasPx);
      const endSlice = Math.floor((bottomC - 1e-6) / sliceCanvasPx);
      const offsetInSlice = topC % sliceCanvasPx;
      const tallerThanPage = bottomC - topC > sliceCanvasPx + 2;
      const textUnit = isTextAtomic(el);

      if (startSlice === endSlice) continue;

      const padC = sliceCanvasPx - offsetInSlice;
      if (padC < 2) continue;
      const padLayout = Math.max(1, Math.ceil(padC / html2canvasScale));
      const padCap = textUnit ? maxTextPadLayout : maxPadLayout;

      if (tallerThanPage) {
        /*
         * Oversized block: only nudge to a page start when the empty gap is small.
         * Otherwise nested atomics (including text lines) fill the remaining space.
         */
        if (offsetInSlice < 2) continue;
        if (padLayout > padCap) continue;
        insertSpacerBefore(el, padLayout);
        fixed = true;
        break;
      }

      /*
       * Fits on one page:
       * - Text/line atoms: always keep whole (up to text pad cap).
       * - Other atoms: keep whole when the empty gap is modest; otherwise let
       *   nested text/rows fill the page.
       */
      if (padLayout > padCap) {
        if (textUnit) {
          /* Still keep short text together even near the cap; skip only if pad is nearly a full page. */
          if (padLayout > pageLayoutPx * 0.92) continue;
        } else {
          if (hasNestedAtomic(el)) continue;
          if (height > pageLayoutPx * 0.4) continue;
        }
      }

      insertSpacerBefore(el, Math.min(padLayout, Math.floor(pageLayoutPx)));
      fixed = true;
      break;
    }
    if (!fixed) break;
  }
}
