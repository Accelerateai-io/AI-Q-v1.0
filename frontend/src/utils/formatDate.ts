/**
 * Format a date as DD-MMM-YYYY (e.g. 05-Mar-2026).
 * Returns "—" for invalid or missing input.
 * Use this throughout the application for consistent date display.
 */
export function formatDateDDMMMYYYY(dateStr: string | null | undefined | unknown): string {
  if (dateStr == null) return "—";
  const asString = typeof dateStr === "string" ? dateStr : String(dateStr);
  if (asString.trim() === "") return "—";
  try {
    const d = new Date(asString);
    if (Number.isNaN(d.getTime())) return "—";
    const day = d.getDate().toString().padStart(2, "0");
    const month = d.toLocaleDateString("en-GB", { month: "short" });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return "—";
  }
}

/**
 * Format a date+time as DD-MMM-YYYY HH:MM (e.g. 11-Aug-2026 14:35), local time.
 * Returns "—" for invalid or missing input.
 */
export function formatDateTimeDDMMMYYYY(dateStr: string | null | undefined): string {
  if (dateStr == null || String(dateStr).trim() === "") return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    const datePart = formatDateDDMMMYYYY(dateStr);
    if (datePart === "—") return "—";
    const hours = d.getHours().toString().padStart(2, "0");
    const minutes = d.getMinutes().toString().padStart(2, "0");
    return `${datePart} ${hours}:${minutes}`;
  } catch {
    return "—";
  }
}
