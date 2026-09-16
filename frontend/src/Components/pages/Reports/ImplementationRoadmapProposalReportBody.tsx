import {
  Boxes,
  CalendarCheck,
  Layers,
  ShieldCheck,
  Users2,
  Workflow,
} from "lucide-react";
import { ShowMoreText } from "../../UI/ShowMoreText";
import { ensureSpaceAfterColon } from "../../../utils/summarizeRiskPoints";
import "../Assessments/BuyerAssessment/buyer_vendor_risk_report.css";

export type IrpPhase = {
  name: string;
  goals: string;
  bullets: string[];
};

export type IrpRiskGate = {
  name: string;
  notes: string;
};

export type IrpPayload = {
  version?: number;
  deployment?: {
    model?: string;
    architectureSummary?: string;
    notes?: string[];
  };
  phases?: IrpPhase[];
  integrations?: {
    items?: string[];
    dataFlows?: string[];
  };
  resources?: {
    vendorRoles?: string[];
    customerRoles?: string[];
    timeCommitments?: string[];
  };
  riskGates?: IrpRiskGate[];
  timeline?: {
    estimate?: string;
    assumptions?: string[];
  };
};

const DEFAULT_PHASES = ["Pilot", "Limited Production", "Full Production"];
const DEFAULT_GATES = ["SSO/SCIM", "Security review", "UAT", "Data readiness"];

function asStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) return [raw.trim()];
  return [];
}

function stripMarkdown(s: string): string {
  return String(s ?? "")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/__([^_]*)__/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/, "")
    .trim();
}

function splitLooseList(value: string): string[] {
  const t = stripMarkdown(value);
  if (!t) return [];
  if (/[;\n|]/.test(t) || (t.includes(",") && t.length < 280 && !/\s(and|with|from|that)\s/i.test(t))) {
    return t
      .split(/[\n;|]+|,(?=\s)/)
      .map((x) => stripMarkdown(x))
      .filter(Boolean);
  }
  return [t];
}

function parseLabeledLine(line: string): { label: string; value: string } | null {
  const raw = stripMarkdown(line.replace(/^\s*[-*]\s+/, ""));
  const idx = raw.indexOf(":");
  if (idx < 1) return null;
  const label = raw.slice(0, idx).trim();
  const value = raw.slice(idx + 1).trim();
  if (!label || label.length > 80) return null;
  return { label, value };
}

function parseMarkdownSections(markdown: string): Array<{ title: string; body: string }> {
  const sections: Array<{ title: string; body: string }> = [];
  const lines = markdown.split(/\r?\n/);
  let currentTitle = "";
  let currentBody: string[] = [];
  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      if (currentTitle) sections.push({ title: currentTitle, body: currentBody.join("\n").trim() });
      currentTitle = stripMarkdown(heading[1]);
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentTitle) sections.push({ title: currentTitle, body: currentBody.join("\n").trim() });
  if (sections.length === 0 && markdown.trim()) {
    sections.push({ title: "Roadmap", body: markdown.trim() });
  }
  return sections;
}

function classifySection(title: string): "deploy" | "phases" | "integrations" | "resources" | "gates" | "timeline" | "other" {
  const t = title.replace(/^\d+\.\s*/, "").toLowerCase();
  if (/deployment|architecture/.test(t)) return "deploy";
  if (/phase/.test(t) || /pilot/.test(t)) return "phases";
  if (/integrat|data flow/.test(t)) return "integrations";
  if (/resource|roles|commitment/.test(t)) return "resources";
  if (/risk gate|gate/.test(t)) return "gates";
  if (/timeline|assumption/.test(t)) return "timeline";
  return "other";
}

function collectLabeled(body: string): { labeled: Record<string, string>; unlabeled: string[] } {
  const labeled: Record<string, string> = {};
  const unlabeled: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parsed = parseLabeledLine(line);
    if (parsed) {
      labeled[parsed.label.toLowerCase()] = parsed.value;
    } else {
      const text = stripMarkdown(line);
      if (text) unlabeled.push(text);
    }
  }
  return { labeled, unlabeled };
}

function findLabeled(labeled: Record<string, string>, ...keys: string[]): string {
  for (const [lk, value] of Object.entries(labeled)) {
    if (keys.some((k) => lk.includes(k))) return value;
  }
  return "";
}

function payloadFromMarkdown(markdown: string): IrpPayload {
  const payload: IrpPayload = {
    version: 1,
    deployment: { model: "", architectureSummary: "", notes: [] },
    phases: DEFAULT_PHASES.map((name) => ({ name, goals: "", bullets: [] })),
    integrations: { items: [], dataFlows: [] },
    resources: { vendorRoles: [], customerRoles: [], timeCommitments: [] },
    riskGates: DEFAULT_GATES.map((name) => ({ name, notes: "" })),
    timeline: { estimate: "", assumptions: [] },
  };

  for (const section of parseMarkdownSections(markdown)) {
    const kind = classifySection(section.title);
    const { labeled, unlabeled } = collectLabeled(section.body);

    if (kind === "deploy") {
      const model = findLabeled(labeled, "deployment model", "deployment");
      const architectureSummary = findLabeled(labeled, "architecture");
      payload.deployment = {
        model,
        architectureSummary,
        notes: unlabeled.filter((n) => n !== model && n !== architectureSummary),
      };
    } else if (kind === "phases") {
      const phases: IrpPhase[] = DEFAULT_PHASES.map((name) => ({ name, goals: "", bullets: [] }));
      for (const [label, value] of Object.entries(labeled)) {
        const idx = phases.findIndex((p) => p.name.toLowerCase() === label || label.includes(p.name.toLowerCase()));
        if (idx >= 0) {
          phases[idx] = { ...phases[idx], goals: value };
        } else if (value) {
          phases.push({ name: label.replace(/\b\w/g, (c) => c.toUpperCase()), goals: value, bullets: [] });
        }
      }
      if (unlabeled.length) {
        const firstEmpty = phases.find((p) => !p.goals);
        if (firstEmpty) firstEmpty.bullets = unlabeled;
      }
      payload.phases = phases.filter((p) => p.goals || p.bullets.length > 0 || DEFAULT_PHASES.includes(p.name));
    } else if (kind === "integrations") {
      const itemsRaw = findLabeled(labeled, "integration");
      const flowsRaw = findLabeled(labeled, "data flow", "dataflow");
      payload.integrations = {
        items: itemsRaw ? splitLooseList(itemsRaw) : unlabeled.filter((_, i) => i % 2 === 0),
        dataFlows: flowsRaw ? splitLooseList(flowsRaw) : unlabeled.filter((_, i) => i % 2 === 1),
      };
      if (!itemsRaw && !flowsRaw && unlabeled.length) {
        payload.integrations.items = unlabeled;
        payload.integrations.dataFlows = [];
      }
    } else if (kind === "resources") {
      const vendor = findLabeled(labeled, "vendor");
      const customer = findLabeled(labeled, "customer", "buyer");
      const time = findLabeled(labeled, "time");
      payload.resources = {
        vendorRoles: vendor ? splitLooseList(vendor) : [],
        customerRoles: customer ? splitLooseList(customer) : [],
        timeCommitments: time ? splitLooseList(time) : unlabeled,
      };
    } else if (kind === "gates") {
      const gates: IrpRiskGate[] = [];
      for (const name of DEFAULT_GATES) {
        const notes = findLabeled(
          labeled,
          name.toLowerCase(),
          name === "SSO/SCIM" ? "sso" : name.toLowerCase().split(" ")[0],
        );
        gates.push({ name, notes });
      }
      for (const [label, value] of Object.entries(labeled)) {
        if (!gates.some((g) => g.name.toLowerCase() === label || label.includes(g.name.toLowerCase().split("/")[0]))) {
          gates.push({ name: label.replace(/\b\w/g, (c) => c.toUpperCase()), notes: value });
        }
      }
      payload.riskGates = gates;
    } else if (kind === "timeline") {
      payload.timeline = {
        estimate: findLabeled(labeled, "timeline"),
        assumptions: (() => {
          const a = findLabeled(labeled, "assumption");
          return a ? splitLooseList(a) : unlabeled;
        })(),
      };
    }
  }
  return payload;
}

function looksLikeIrp(j: Record<string, unknown>): boolean {
  return Boolean(j.deployment || j.phases || j.riskGates || j.timeline || j.integrations || j.resources);
}

function normalizeJson(j: Record<string, unknown>): IrpPayload {
  const dep = (j.deployment as Record<string, unknown> | undefined) ?? {};
  const integ = (j.integrations as Record<string, unknown> | undefined) ?? {};
  const res = (j.resources as Record<string, unknown> | undefined) ?? {};
  const tl = (j.timeline as Record<string, unknown> | undefined) ?? {};
  const phasesRaw = Array.isArray(j.phases) ? j.phases : [];
  const gatesRaw = Array.isArray(j.riskGates) ? j.riskGates : [];

  const phases: IrpPhase[] =
    phasesRaw.length > 0
      ? phasesRaw.map((p, i) => {
          const o = (p ?? {}) as Record<string, unknown>;
          return {
            name: String(o.name ?? DEFAULT_PHASES[i] ?? `Phase ${i + 1}`),
            goals: String(o.goals ?? o.scope ?? ""),
            bullets: asStringArray(o.bullets),
          };
        })
      : DEFAULT_PHASES.map((name) => ({ name, goals: "", bullets: [] }));

  const riskGates: IrpRiskGate[] =
    gatesRaw.length > 0
      ? gatesRaw.map((g, i) => {
          const o = (g ?? {}) as Record<string, unknown>;
          return {
            name: String(o.name ?? DEFAULT_GATES[i] ?? `Gate ${i + 1}`),
            notes: String(o.notes ?? o.status ?? ""),
          };
        })
      : DEFAULT_GATES.map((name) => ({ name, notes: "" }));

  return {
    version: typeof j.version === "number" ? j.version : 1,
    deployment: {
      model: String(dep.model ?? ""),
      architectureSummary: String(dep.architectureSummary ?? dep.summary ?? ""),
      notes: asStringArray(dep.notes),
    },
    phases,
    integrations: {
      items: asStringArray(integ.items ?? integ.integrations),
      dataFlows: asStringArray(integ.dataFlows ?? integ.dataFlow),
    },
    resources: {
      vendorRoles: asStringArray(res.vendorRoles),
      customerRoles: asStringArray(res.customerRoles),
      timeCommitments: asStringArray(res.timeCommitments),
    },
    riskGates,
    timeline: {
      estimate: String(tl.estimate ?? tl.timelineEstimate ?? ""),
      assumptions: asStringArray(tl.assumptions),
    },
  };
}

export function parseImplementationRoadmapProposal(
  raw: string | Record<string, unknown> | undefined | null,
): IrpPayload | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return looksLikeIrp(raw) ? normalizeJson(raw) : null;
  }
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  if (s.startsWith("{")) {
    try {
      const j = JSON.parse(s) as Record<string, unknown>;
      if (looksLikeIrp(j)) return normalizeJson(j);
    } catch {
      /* fall through to markdown */
    }
  }
  if (s.includes("#") || /deployment|phases|pilot|timeline/i.test(s)) {
    return payloadFromMarkdown(s);
  }
  return payloadFromMarkdown(s);
}

function displayOrDash(value: string | undefined): string {
  const t = (value ?? "").trim();
  return t || "Not specified";
}

function gateTone(notes: string): "ready" | "watch" | "open" | "unknown" {
  const n = notes.trim().toLowerCase();
  if (!n || /not specified|to be (defined|confirmed)|unknown|n\/a/.test(n)) return "unknown";
  if (/\b(ready|complete|in place|done|passed|yes|available)\b/.test(n)) return "ready";
  if (/\b(gap|missing|blocker|not ready|fail|absent|no)\b/.test(n)) return "open";
  return "watch";
}

function gateLabel(tone: ReturnType<typeof gateTone>): string {
  if (tone === "ready") return "Ready";
  if (tone === "open") return "Open";
  if (tone === "watch") return "In progress";
  return "TBC";
}

function FieldList({ items, empty = "Not specified" }: { items: string[]; empty?: string }) {
  if (!items.length) {
    return <p className="irp_body_text irp_muted">{empty}</p>;
  }
  return (
    <ul className="irp_list">
      {items.map((item, i) => (
        <li key={i}>{ensureSpaceAfterColon(item)}</li>
      ))}
    </ul>
  );
}

export default function ImplementationRoadmapProposalReportBody({ data }: { data: IrpPayload }) {
  const deployment = data.deployment ?? {};
  const phases =
    Array.isArray(data.phases) && data.phases.length > 0
      ? data.phases
      : DEFAULT_PHASES.map((name) => ({ name, goals: "", bullets: [] as string[] }));
  const integrations = data.integrations ?? {};
  const resources = data.resources ?? {};
  const gates =
    Array.isArray(data.riskGates) && data.riskGates.length > 0
      ? data.riskGates
      : DEFAULT_GATES.map((name) => ({ name, notes: "" }));
  const timeline = data.timeline ?? {};
  const phasePri = ["bvr_pri_high", "bvr_pri_med", "bvr_pri_low"] as const;

  return (
    <div className="report_vcm_wrap irp_wrap">
      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon" style={{ marginTop: 0 }}>
          <Boxes className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Target deployment model</span>
        </h2>
        <dl className="irp_fields">
          <div className="irp_field">
            <dt>Deployment model</dt>
            <dd className="irp_deploy_model">{displayOrDash(deployment.model)}</dd>
          </div>
          <div className="irp_field">
            <dt>Architecture summary</dt>
            <dd className="irp_body_text">{displayOrDash(deployment.architectureSummary)}</dd>
          </div>
          {(deployment.notes ?? []).length > 0 ? (
            <div className="irp_field">
              <dt>Notes</dt>
              <dd>
                <FieldList items={deployment.notes ?? []} empty="None listed" />
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <Layers className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Phases with goals</span>
        </h2>
        <div
          className="bvr_reco_priority_table irp_phase_table"
          role="table"
          aria-label="Phase goals"
          style={{ ["--irp-cols" as string]: String(Math.max(1, phases.length)) }}
        >
          <div className="bvr_reco_priority_head" role="rowgroup">
            {phases.map((phase, i) => (
              <div key={`h-${phase.name}`} className="bvr_reco_priority_cell" role="columnheader">
                <span className={`bvr_risk_scope_tag ${phasePri[i] ?? "bvr_pri_low"}`}>
                  {i + 1}. {phase.name}
                </span>
              </div>
            ))}
          </div>
          <div className="bvr_reco_priority_body" role="row">
            {phases.map((phase) => (
              <div key={`c-${phase.name}`} className="bvr_reco_priority_col irp_phase_col" role="cell">
                <ShowMoreText lines={5} className="irp_phase_show_more">
                  <p className="irp_body_text">{displayOrDash(phase.goals)}</p>
                  {phase.bullets.length > 0 ? (
                    <FieldList items={phase.bullets} empty="None listed" />
                  ) : null}
                </ShowMoreText>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <Workflow className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Integrations &amp; data flow</span>
        </h2>
        <div className="bvr_reco_priority_table ira_timeline_table" role="table" aria-label="Integrations and data flow">
          <div className="bvr_reco_priority_head" role="rowgroup">
            <div className="bvr_reco_priority_cell" role="columnheader">
              <span className="bvr_risk_scope_tag bvr_pri_high">Integrations</span>
            </div>
            <div className="bvr_reco_priority_cell" role="columnheader">
              <span className="bvr_risk_scope_tag bvr_pri_med">Data flow</span>
            </div>
          </div>
          <div className="bvr_reco_priority_body" role="row">
            <div className="bvr_reco_priority_col" role="cell">
              <FieldList items={integrations.items ?? []} />
            </div>
            <div className="bvr_reco_priority_col" role="cell">
              <FieldList items={integrations.dataFlows ?? []} />
            </div>
          </div>
        </div>
      </section>

      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <Users2 className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Resources</span>
        </h2>
        <div className="bvr_reco_priority_table" role="table" aria-label="Vendor and customer resources">
          <div className="bvr_reco_priority_head" role="rowgroup">
            <div className="bvr_reco_priority_cell" role="columnheader">
              <span className="bvr_risk_scope_tag bvr_pri_high">Vendor roles</span>
            </div>
            <div className="bvr_reco_priority_cell" role="columnheader">
              <span className="bvr_risk_scope_tag bvr_pri_med">Customer roles</span>
            </div>
            <div className="bvr_reco_priority_cell" role="columnheader">
              <span className="bvr_risk_scope_tag bvr_pri_low">Time commitments</span>
            </div>
          </div>
          <div className="bvr_reco_priority_body" role="row">
            <div className="bvr_reco_priority_col" role="cell">
              <FieldList items={resources.vendorRoles ?? []} />
            </div>
            <div className="bvr_reco_priority_col" role="cell">
              <FieldList items={resources.customerRoles ?? []} />
            </div>
            <div className="bvr_reco_priority_col" role="cell">
              <FieldList items={resources.timeCommitments ?? []} />
            </div>
          </div>
        </div>
      </section>

      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <ShieldCheck className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Risk gates</span>
        </h2>
        <div className="irp_table_wrap">
          <table className="bvr_matrix_table irp_gates_table">
            <thead>
              <tr>
                <th scope="col">Gate</th>
                <th scope="col">Status</th>
                <th scope="col">Notes</th>
              </tr>
            </thead>
            <tbody>
              {gates.map((gate) => {
                const tone = gateTone(gate.notes);
                return (
                  <tr key={gate.name}>
                    <td className="irp_gate_name_cell">{gate.name}</td>
                    <td>
                      <span className={`irp_gate_badge irp_gate_badge_${tone}`}>{gateLabel(tone)}</span>
                    </td>
                    <td className="irp_body_text">{displayOrDash(gate.notes)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bvr_card">
        <h2 className="bvr_section_title bvr_title_with_icon">
          <CalendarCheck className="bvr_title_icon" size={22} strokeWidth={2} aria-hidden />
          <span>Timeline</span>
        </h2>
        <dl className="irp_fields">
          <div className="irp_field">
            <dt>Estimate</dt>
            <dd className="irp_body_text irp_estimate">{displayOrDash(timeline.estimate)}</dd>
          </div>
          <div className="irp_field">
            <dt>Assumptions</dt>
            <dd>
              <FieldList items={timeline.assumptions ?? []} empty="None listed" />
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
