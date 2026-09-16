import html2pdf from "html2pdf.js";
import { jsPDF } from "jspdf";
import "../styles/reportPdfCapture.css";
import { insertReportPdfFlowSpacers, removeReportPdfFlowSpacers } from "./reportPdfFlowSpacers";
import { formatDateTimeDDMMMYYYY } from "./formatDate";
import accelerateAiLogo from "../assets/images/mainLogo/Accelerateai.png";

/** Share of sampled pixels that may be non-white before a trailing slice is considered "real" content. */
const PDF_TRAILING_SLICE_MAX_NONWHITE = 0.004;

/** Header logo size on A4 (mm). Source asset is 142×70. */
const PDF_LOGO_WIDTH_MM = 28;
const PDF_LOGO_HEIGHT_MM = (PDF_LOGO_WIDTH_MM * 70) / 142;

async function loadImageAsDataUrl(src: string): Promise<string> {
  const res = await fetch(src);
  if (!res.ok) {
    throw new Error(`Failed to load PDF logo (${res.status})`);
  }
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read PDF logo"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Stamp Accelerate AI logo (top-right), export date+time (bottom-left), and page numbers (bottom-right).
 */
async function stampPdfHeaderFooter(
  pdf: InstanceType<typeof jsPDF>,
  exportedAt: Date,
): Promise<void> {
  const logoDataUrl = await loadImageAsDataUrl(accelerateAiLogo);
  const pageCount = pdf.getNumberOfPages();
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const exportedLabel = `Exported: ${formatDateTimeDDMMMYYYY(exportedAt.toISOString())}`;
  const logoX = Math.max(8, pageW - 8 - PDF_LOGO_WIDTH_MM);

  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    try {
      pdf.addImage(
        logoDataUrl,
        "PNG",
        logoX,
        3.5,
        PDF_LOGO_WIDTH_MM,
        PDF_LOGO_HEIGHT_MM,
      );
    } catch {
      /* keep footer even if logo stamp fails */
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(exportedLabel, 8, pageH - 6, { align: "left" });
    pdf.text(`Page ${i} of ${pageCount}`, pageW - 8, pageH - 6, { align: "right" });
  }
}

/** Safe single segment for a downloaded PDF filename (no path chars). */
export function sanitizePdfSlug(raw: string, maxLen = 48): string {
  const t = String(raw ?? "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\.+$/g, "")
    .trim();
  if (!t) return "";
  return t
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLen);
}

/**
 * Filename: report name, organization, product (in that order), `.pdf`.
 * PDF document metadata title is set to the same stem without extension.
 */
export function buildReportPdfFilename(parts: {
  reportName: string;
  orgName: string;
  productName: string;
}): string {
  const reportName = sanitizePdfSlug(parts.reportName, 44) || "Report";
  const orgName = sanitizePdfSlug(parts.orgName, 44);
  const productName = sanitizePdfSlug(parts.productName, 44);
  const segments = [reportName, orgName, productName].filter((s) => s.length > 0);
  return `${segments.join("-")}.pdf`;
}

/** Strip "Analysis Report: " then split "Org - Product" from stored report titles. */
export function splitCompleteReportTitle(title: string): { org: string; product: string } {
  const cleaned = String(title ?? "")
    .replace(/^Analysis Report:\s*/i, "")
    .trim();
  const idx = cleaned.indexOf(" - ");
  if (idx >= 0) {
    return {
      org: cleaned.slice(0, idx).trim(),
      product: cleaned.slice(idx + 3).trim(),
    };
  }
  return { org: cleaned, product: "" };
}

/** Parse assessment labels like "Org - Product" or "Org and Product". */
export function splitAssessmentLabelForPdf(label: string): { org: string; product: string } {
  const s = String(label ?? "").trim();
  if (!s) return { org: "", product: "" };
  const dashParts = s.split(/\s+-\s+/).map((x) => x.trim()).filter(Boolean);
  if (dashParts.length >= 2) {
    return { org: dashParts[0] ?? "", product: dashParts.slice(1).join("-") };
  }
  const andParts = s.split(/\s+and\s+/i).map((x) => x.trim()).filter(Boolean);
  if (andParts.length >= 2) {
    return { org: andParts[0] ?? "", product: andParts.slice(1).join("-and-") };
  }
  return { org: s, product: "" };
}

/**
 * html2pdf splits the canvas with `ceil(height / sliceHeight)`, so a tall canvas whose
 * last slice is only background often becomes an extra full blank PDF page. Detect that
 * slice on the source canvas (before JPEG) and drop blank trailing pages.
 */
function isCanvasSliceMostlyBlank(
  canvas: HTMLCanvasElement,
  sliceTop: number,
  sliceH: number,
): boolean {
  if (sliceH < 4) return true;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;

  let img: ImageData;
  try {
    img = ctx.getImageData(0, sliceTop, canvas.width, sliceH);
  } catch {
    return false;
  }

  const d = img.data;
  const w = canvas.width;
  const step = 5;
  const rgbTol = 16;
  let sampled = 0;
  let nonWhite = 0;
  for (let sy = 0; sy < sliceH; sy += step) {
    for (let sx = 0; sx < w; sx += step) {
      const i = (sy * w + sx) * 4;
      const r = d[i] ?? 255;
      const g = d[i + 1] ?? 255;
      const b = d[i + 2] ?? 255;
      sampled++;
      if (r < 255 - rgbTol || g < 255 - rgbTol || b < 255 - rgbTol) nonWhite++;
    }
  }
  return nonWhite / Math.max(1, sampled) < PDF_TRAILING_SLICE_MAX_NONWHITE;
}

/** Drop every trailing blank PDF page (not just the last one). */
function deleteTrailingBlankPdfPages(
  pdf: InstanceType<typeof jsPDF>,
  canvas: HTMLCanvasElement,
  innerRatio: number,
): void {
  const pxPageHeight = Math.floor(canvas.width * innerRatio);
  if (pxPageHeight < 8) return;

  while (pdf.getNumberOfPages() > 1) {
    const nPages = Math.ceil(canvas.height / pxPageHeight);
    const pageIndex = pdf.getNumberOfPages();
    if (pageIndex > nPages) {
      pdf.deletePage(pageIndex);
      continue;
    }
    const lastTop = (pageIndex - 1) * pxPageHeight;
    const lastH = Math.min(pxPageHeight, canvas.height - lastTop);
    if (!isCanvasSliceMostlyBlank(canvas, Math.max(0, lastTop), Math.max(0, lastH))) {
      break;
    }
    pdf.deletePage(pageIndex);
  }
}

function waitNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/** PDFs always use light tokens; do not persist this to theme storage. */
function forceDocumentLightTheme(doc: Document): string | null {
  const root = doc.documentElement;
  const previousTheme = root.getAttribute("data-theme");
  root.setAttribute("data-theme", "light");
  root.style.setProperty("color-scheme", "light");
  return previousTheme;
}

function restoreDocumentTheme(doc: Document, previousTheme: string | null): void {
  const root = doc.documentElement;
  if (previousTheme) {
    root.setAttribute("data-theme", previousTheme);
  } else {
    root.removeAttribute("data-theme");
  }
  root.style.removeProperty("color-scheme");
}

/** Renders the given element to a PDF and triggers a browser download. */
export async function downloadElementAsPdf(element: HTMLElement, filename: string): Promise<void> {
  const previousTheme = forceDocumentLightTheme(document);
  try {
    removeReportPdfFlowSpacers(element);
    element.classList.add("report_pdf_capture");
    await waitNextPaint();
    /* Second frame: layout settles after light theme + capture class (scale/width) apply. */
    await waitNextPaint();

    const marginMm = [26, 8, 14, 8] as [number, number, number, number];
    const html2canvasScale = 2;
    const jsPdfOpts = {
      unit: "mm",
      format: "a4",
      orientation: "portrait" as const,
    };

    insertReportPdfFlowSpacers(element, marginMm, html2canvasScale, jsPdfOpts);
    /* Second pass after spacers reflow layout (nested blocks, shifted Y). */
    await waitNextPaint();
    insertReportPdfFlowSpacers(element, marginMm, html2canvasScale, jsPdfOpts);

    const opt = {
      margin: marginMm,
      filename,
      image: { type: "jpeg" as const, quality: 0.94 },
      html2canvas: {
        scale: html2canvasScale,
        useCORS: true,
        logging: false,
        scrollY: -window.scrollY,
        scrollX: 0,
        windowWidth: element.scrollWidth,
        letterRendering: true,
        backgroundColor: "#ffffff",
        onclone: (clonedDoc: Document) => {
          forceDocumentLightTheme(clonedDoc);
        },
      },
      jsPDF: jsPdfOpts,
      /**
       * Built-in pagebreak uses viewport rects without subtracting the container offset
       * (see html2pdf `pagebreaks.js`), which splits cards when the capture root is scaled.
       * Custom spacers in `insertReportPdfFlowSpacers` use root-relative Y and the same
       * slice height as `toPdf` (`floor(canvas.width * inner.ratio)`).
       */
      pagebreak: {
        mode: [] as string[],
        before: [] as string[],
        after: [] as string[],
        avoid: [] as string[],
      },
    };

    const exportedAt = new Date();
    const worker = html2pdf().set(opt).from(element);
    await worker.toPdf();
    const pdf = (await worker.get("pdf")) as InstanceType<typeof jsPDF>;
    const canvas = (await worker.get("canvas")) as HTMLCanvasElement;
    const pageSize = (await worker.get("pageSize")) as { inner: { ratio: number } };
    deleteTrailingBlankPdfPages(pdf, canvas, pageSize.inner.ratio);
    await stampPdfHeaderFooter(pdf, exportedAt);
    const stem = filename.replace(/\.pdf$/i, "");
    try {
      pdf.setProperties({ title: stem });
    } catch {
      /* ignore metadata failures */
    }
    pdf.save(filename);
  } finally {
    removeReportPdfFlowSpacers(element);
    element.classList.remove("report_pdf_capture");
    restoreDocumentTheme(document, previousTheme);
  }
}
