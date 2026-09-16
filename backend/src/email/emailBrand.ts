/** Shared brand styles for transactional HTML emails (matches app primary CTA). */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

/** App / email primary blue — headings, buttons, and links. */
export const EMAIL_BRAND_PRIMARY = "#225bff";

export const EMAIL_PAGE_BG = "#f4f4f4";

/** Current calendar year for email footers (updates automatically each year). */
export function emailCopyrightYear(): number {
  return new Date().getFullYear();
}

export const EMAIL_SIGNATORY_NAME = "Asad";
export const EMAIL_SIGNATORY_EMAIL = "asad@accelerateai.io";

/** Content-ID for Accelerate AI logo (use with nodemailer `attachments`). */
export const ACCELERATE_AI_LOGO_CID = "accelerate-ai-logo@aiq";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveAccelerateAiLogoPath(): string {
  const candidates = [
    path.join(__dirname, "assets", "Accelerateai.png"),
    path.join(process.cwd(), "src", "email", "assets", "Accelerateai.png"),
    path.join(process.cwd(), "dist", "email", "assets", "Accelerateai.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Accelerate AI logo not found for email signature");
}

/** Nodemailer inline image attachment for the Accelerate AI logo. */
export function getAccelerateAiLogoAttachment(): {
  filename: string;
  path: string;
  cid: string;
} {
  return {
    filename: "Accelerateai.png",
    path: resolveAccelerateAiLogoPath(),
    cid: ACCELERATE_AI_LOGO_CID,
  };
}

/** @deprecated Prefer `emailClosingSignatureHtml` — kept for older templates. */
export function emailSignatureCheckmarkHtml(): string {
  return `<p style="margin:8px 0 16px;font-size:18px;line-height:1;color:${EMAIL_BRAND_PRIMARY};"></p>`;
}

/**
 * Closing block: salutation, then logo | Asad signature (team + email).
 * Headings/buttons/links use EMAIL_BRAND_PRIMARY (#225bff).
 */
export function emailClosingSignatureHtml(
  platformName = "AI-Q Platform",
  closingWord = "Cheers",
): string {
  return `
            <p style="margin:0 0 18px;font-size:16px;line-height:1.5;color:#333333;">${closingWord},</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;border-collapse:collapse;">
              <tr>
                <td style="padding:0 14px 0 0;vertical-align:middle;">
                  <img src="cid:${ACCELERATE_AI_LOGO_CID}" alt="Accelerate AI" width="96" style="display:block;border:0;outline:none;text-decoration:none;height:auto;max-width:96px;" />
                </td>
                <td style="width:1px;border-left:1px solid #d0d5dd;padding:0;font-size:0;line-height:0;">&nbsp;</td>
                <td style="padding:2px 0 2px 14px;vertical-align:middle;">
                  <p style="margin:0 0 6px;font-size:15px;line-height:1.3;font-weight:700;color:#1a1f36;font-family:Helvetica,Arial,sans-serif;">${EMAIL_SIGNATORY_NAME}</p>
                  <div style="height:1px;line-height:1px;font-size:1px;background-color:#d0d5dd;margin:0 0 8px;">&nbsp;</div>
                  <p style="margin:0 0 4px;font-size:13px;line-height:1.4;color:#667085;font-family:Helvetica,Arial,sans-serif;">The ${platformName} Team</p>
                  <p style="margin:0;font-size:13px;line-height:1.45;font-family:Helvetica,Arial,sans-serif;">
                    <a href="mailto:${EMAIL_SIGNATORY_EMAIL}" style="color:${EMAIL_BRAND_PRIMARY};text-decoration:underline;">${EMAIL_SIGNATORY_EMAIL}</a>
                  </p>
                </td>
              </tr>
            </table>`;
}
