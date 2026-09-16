import { DATA_SENSITIVITY_OPTIONS } from "./buyerCotsOptions";

function parseList(raw: unknown): string[] {
  if (raw == null || raw === "") return [];
  if (Array.isArray(raw)) return raw.map(String);
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) return parsed.map(String);
    if (parsed && typeof parsed === "object") {
      const o = parsed as Record<string, unknown>;
      const buckets = [o.public_sector, o.private_sector, o.non_profit_sector];
      const out: string[] = [];
      for (const bucket of buckets) {
        if (!Array.isArray(bucket)) continue;
        for (const item of bucket) {
          const s = String(item ?? "").trim();
          if (s) out.push(s);
        }
      }
      if (out.length) return out;
    }
  } catch {
    /* fall through */
  }
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const SENSITIVITY_RANK = [
  "Public - No sensitive data",
  "Internal - Business confidential only",
  "Sensitive - PII or business critical data",
  "Highly Sensitive - PHI, financial records, or PCI data",
  "Extremely Sensitive - National security, ITAR, or CUI",
] as const;

function maxBand(current: string, next: string): string {
  return SENSITIVITY_RANK.indexOf(next as (typeof SENSITIVITY_RANK)[number]) >
    SENSITIVITY_RANK.indexOf(current as (typeof SENSITIVITY_RANK)[number])
    ? next
    : current;
}

/** Derive the sensitivity band from selected data classes (spec E-B7). */
export function deriveDataSensitivity(dataClassesRaw: unknown): string {
  const classes = parseList(dataClassesRaw);
  if (classes.length === 0) return "";
  if (classes.includes("None of the above")) {
    return "Public - No sensitive data";
  }
  let band = "Public - No sensitive data";
  for (const item of classes) {
    if (item === "Children's data" || item === "Biometric data") {
      band = maxBand(band, "Extremely Sensitive - National security, ITAR, or CUI");
    } else if (
      item === "Health information" ||
      item === "Financial account data" ||
      item === "Payment card data" ||
      item === "Government identifiers"
    ) {
      band = maxBand(band, "Highly Sensitive - PHI, financial records, or PCI data");
    } else if (item === "Customer PII" || item === "Employee HR records") {
      band = maxBand(band, "Sensitive - PII or business critical data");
    } else if (item === "Internal business documents" || item === "Source code") {
      band = maxBand(band, "Internal - Business confidential only");
    }
  }
  return DATA_SENSITIVITY_OPTIONS.some((o) => o.value === band) ? band : "";
}

/** Candidate regulations from sector + jurisdictions + data + decision domains (spec E-B6). */
export function deriveRegulatoryRequirements(formData: Record<string, string>): string[] {
  const sectors = parseList(formData.industrySector).map((s) => s.toLowerCase());
  const jurisdictions = parseList(formData.dataSubjectJurisdictions);
  const classes = parseList(formData.dataClasses);
  const domains = parseList(formData.decisionDomains);
  const out = new Set<string>();

  const sectorHas = (token: string) => sectors.some((s) => s.includes(token));
  const hasClass = (...names: string[]) => names.some((n) => classes.includes(n));
  const hasDomain = (...names: string[]) => names.some((n) => domains.includes(n));

  if (sectorHas("health") || hasClass("Health information") || hasDomain("Medical or clinical")) {
    out.add("HIPAA (Healthcare)");
    out.add("HITECH (Healthcare Technology)");
  }
  if (sectorHas("finance") || sectorHas("bank") || sectorHas("insurance")) {
    out.add("SOX (Financial Reporting)");
    out.add("GLBA (Financial Privacy)");
  }
  if (hasClass("Payment card data")) out.add("PCI DSS (Payment Cards)");
  if (hasClass("Financial account data")) out.add("GLBA (Financial Privacy)");
  if (sectorHas("federal") || sectorHas("defense") || sectorHas("gov")) {
    out.add("FedRAMP (Federal Government)");
    out.add("FISMA (Federal Systems)");
  }
  if (sectorHas("education") || hasDomain("Education or admissions")) {
    out.add("FERPA (Education Privacy)");
  }
  if (jurisdictions.includes("EU/EEA") || jurisdictions.includes("UK")) {
    out.add("GDPR (EU Data Protection)");
    out.add("EU AI Act");
  }
  if (jurisdictions.includes("US") || jurisdictions.includes("Other")) {
    out.add("CCPA (California Privacy)");
  }
  if (hasDomain("Hiring or promotion")) {
    out.add("NYC Local Law 144");
    out.add("Colorado AI Act");
  }
  if (hasDomain("Credit or lending") || hasDomain("Insurance pricing or claims")) {
    out.add("Colorado AI Act");
  }
  if (domains.some((d) => d !== "None of these") && domains.length > 0) {
    out.add("NIST AI RMF (AI Risk Management)");
  }

  if (
    jurisdictions.includes("No personal data") &&
    (classes.includes("None of the above") || classes.length === 0) &&
    (domains.includes("None of these") || domains.length === 0)
  ) {
    return ["None/Not Applicable"];
  }

  return Array.from(out);
}

export function applyBuyerCotsDerivedFields(
  prev: Record<string, string>,
  patch: Record<string, string> = {},
): Record<string, string> {
  const next = { ...prev, ...patch };
  next.dataSensitivity = deriveDataSensitivity(next.dataClasses);

  const derivedRegs = deriveRegulatoryRequirements(next);
  const currentRegs = parseList(next.regulatoryRequirements);
  const lastDerived = parseList(next.regulatoryRequirementsDerived);
  const managerTouched =
    currentRegs.length > 0 &&
    JSON.stringify([...currentRegs].sort()) !== JSON.stringify([...lastDerived].sort());
  if (!managerTouched) {
    next.regulatoryRequirements = JSON.stringify(derivedRegs);
  }
  next.regulatoryRequirementsDerived = JSON.stringify(derivedRegs);

  const added = currentRegs.filter((x) => !derivedRegs.includes(x));
  const removed = derivedRegs.filter((x) => !currentRegs.includes(x));
  next.regulatoryRequirementsAdded = JSON.stringify(managerTouched ? added : []);
  next.regulatoryRequirementsRemoved = JSON.stringify(managerTouched ? removed : []);

  const metric = (next.targetOutcomeMetric ?? "").trim();
  const baseline = (next.targetOutcomeBaseline ?? "").trim();
  const target = (next.targetOutcomeTarget ?? "").trim();
  if (metric || baseline || target) {
    next.expectedOutcomes = [metric, baseline && `today: ${baseline}`, target && `year one: ${target}`]
      .filter(Boolean)
      .join(" | ");
  }

  if (next.currentUsageState) next.requirementGaps = next.currentUsageState;
  if (next.unavailabilityImpact) next.criticality = next.unavailabilityImpact;
  if (next.cloudProvider) next.techStack = next.cloudProvider;
  if (next.pilotStatus) next.pilotRolloutPlan = next.pilotStatus;
  if (next.implementationCapacity) next.implementationTeamComposition = next.implementationCapacity;
  if (next.vendorEvidenceReceived) next.vendorCertifications = next.vendorEvidenceReceived;

  const vendorLinked = String(next.vendorAttestationId ?? next.selectedProductId ?? "").trim();
  next.unlinkedVendor = vendorLinked ? "false" : next.vendorName?.trim() ? "true" : "";

  return next;
}

export function defaultReviewDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
}

export function parseEvidenceFilesByCategory(raw: unknown): Record<string, string[]> {
  if (raw == null || raw === "") return {};
  const parsed =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.map(String).filter(Boolean) : value ? [String(value)] : [],
      ]),
    );
  }
  return {};
}

export function pruneEvidenceFilesByCategory(
  selected: string[],
  byCategory: Record<string, string[]>,
  exclusiveValue = "Nothing yet",
): Record<string, string[]> {
  return selected
    .filter((cat) => cat !== exclusiveValue)
    .reduce<Record<string, string[]>>((acc, cat) => {
      acc[cat] = byCategory[cat] ?? [];
      return acc;
    }, {});
}

export function sessionAssessorName(): string {
  const first = String(sessionStorage.getItem("userFirstName") ?? "").trim();
  const last = String(sessionStorage.getItem("userLastName") ?? "").trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return String(sessionStorage.getItem("userName") ?? "").trim();
}
