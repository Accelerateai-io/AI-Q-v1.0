/**
 * Format a date as DD-MMM-YYYY (e.g. 05-Mar-2026).
 * Returns "—" for invalid or missing input.
 * Use this throughout the application for consistent date display.
 */
export function formatDateDDMMMYYYY(dateStr: string | null | undefined): string {
  if (dateStr == null || String(dateStr).trim() === "") return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    const day = d.getDate().toString().padStart(2, "0");
    const month = d.toLocaleDateString("en-GB", { month: "short" });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "—";
  }
}
