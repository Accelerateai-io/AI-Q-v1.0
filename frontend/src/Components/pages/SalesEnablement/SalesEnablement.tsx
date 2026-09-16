import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  BarChart3,
  BotIcon,
  CheckCircle2,
  Clock3,
  FileCheck,
  Lightbulb,
  Loader2,
  Sparkles,
  Square,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  X,
} from "lucide-react";
import Select from "../../UI/Select";
import Input from "../../UI/Input";
import Button from "../../UI/Button";
import LoadingMessage from "../../UI/LoadingMessage";
import ChatMessage from "../../UI/ChatMessage";
import ToolCallsSummary, {
  type ToolCallStep,
} from "./ToolCallsSummary";
import aiQLogoBlue from "../../../assets/images/mainLogo/new_logo/ai_q_logo_blue.png";
import aiQLogoGray from "../../../assets/images/mainLogo/new_logo/ai_q_logo_gray.png";
import "../UserManagement/user_management.css";
import "./sales_enablement.css";
import { apiErrorMessage, errorToUserMessage } from "../../../utils/tokenQuotaError";

const BASE_URL =
  import.meta.env.VITE_BASE_URL ?? "http://localhost:5003/api/v1";

/** Strip Markdown (# headings, **bold**, etc.) so Sales Agent answers show as plain text. */
function stripMarkdownFromSalesReply(text: string): string {
  return String(text ?? "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/_([^_\n]+)_/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .trim();
}

interface AssessmentRow {
  assessmentId: number;
  type: string;
  status: string;
  organizationId?: string | null;
  productName?: string | null;
  vendorProductName?: string | null;
  vendorName?: string | null;
  customerOrganizationName?: string | null;
  customerSector?: string | null;
  product_in_scope?: string | null;
  productInScope?: string | null;
  expiryAt?: string | null;
  /** When in the past, linked attestation is expired (exclude from dropdown). */
  attestationExpiryAt?: string | null;
  [key: string]: unknown;
}

interface SwotData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface BattleCardQa {
  question: string;
  answer: string;
}

interface BattleCardData {
  title: string;
  keyDifferentiators?: string[];
  complianceHighlights?: string[];
  objectionHandling?: { question: string; answer: string };
  qaBlocks?: BattleCardQa[];
  idealCustomerProfile?: string;
  /** Legacy: simple bullets if new fields not provided */
  bullets?: string[];
}

type SystemIconKind = "session" | "check" | "thinking" | "none";

interface ChatMessageItem {
  role: "agent" | "user" | "system" | "date";
  text?: string;
  /** Icon for centered system status lines (ignored for date / chat roles). */
  systemIcon?: SystemIconKind;
  swot?: SwotData;
  battleCard?: BattleCardData;
  toolCalls?: ToolCallStep[];
}

function systemMessage(
  text: string,
  systemIcon: SystemIconKind = "none"
): ChatMessageItem {
  return { role: "system", text, systemIcon };
}

function dateSeparator(label = "Today"): ChatMessageItem {
  return { role: "date", text: label };
}

function formatSessionTime(d = new Date()): string {
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function SystemStatusIcon({ kind }: { kind?: SystemIconKind }) {
  if (kind === "session") return <Clock3 size={14} strokeWidth={1.75} aria-hidden />;
  if (kind === "check") return <CheckCircle2 size={14} strokeWidth={1.75} aria-hidden />;
  if (kind === "thinking") return <Sparkles size={14} strokeWidth={1.75} aria-hidden />;
  return null;
}

function AiQChatIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`sales_enablement_aiq_icon_wrap ${className}`.trim()}>
      <img
        src={aiQLogoBlue}
        alt=""
        className="sales_enablement_aiq_icon sales_enablement_aiq_icon--light"
        aria-hidden
      />
      <img
        src={aiQLogoGray}
        alt=""
        className="sales_enablement_aiq_icon sales_enablement_aiq_icon--dark"
        aria-hidden
      />
    </span>
  );
}

type GeneratingKind = "chat" | "swot" | "battlecard";

const THINKING_PHASES: Record<GeneratingKind, string[]> = {
  chat: [
    "Agent is thinking…",
    "Retrieving assessment context…",
    "Generating an answer…",
  ],
  swot: [
    "Agent is thinking…",
    "Analyzing positioning signals…",
    "Generating SWOT analysis…",
  ],
  battlecard: [
    "Agent is thinking…",
    "Extracting differentiators…",
    "Generating battle card…",
  ],
};

type SalesToolCallKind = "chat" | "swot" | "battlecard";

function jitter(base: number, spread = 0.35): number {
  const delta = base * spread;
  return Math.max(28, Math.round(base - delta + Math.random() * delta * 2));
}

/** Build Cursor-style tool-call steps that mirror what the sales agent did. */
function buildSalesToolCalls(
  kind: SalesToolCallKind,
  opts?: { assessmentLabel?: string; cached?: boolean; question?: string }
): ToolCallStep[] {
  const label = (opts?.assessmentLabel ?? "vendor assessment").slice(0, 64);
  const questionSnippet = (opts?.question ?? "").trim().slice(0, 48);
  const cached = Boolean(opts?.cached);

  if (kind === "swot") {
    return [
      {
        name: "retrieve",
        detail: cached ? `cache://${label}` : `assessment://${label}`,
        durationMs: jitter(cached ? 42 : 280),
        status: "success",
      },
      {
        name: "analyze",
        detail: "positioning · strengths · risks",
        durationMs: jitter(cached ? 55 : 410),
        status: "success",
      },
      {
        name: "compose",
        detail: "swot_analysis.md",
        durationMs: jitter(cached ? 68 : 520),
        status: "success",
      },
    ];
  }

  if (kind === "battlecard") {
    return [
      {
        name: "retrieve",
        detail: cached ? `cache://${label}` : `assessment://${label}`,
        durationMs: jitter(cached ? 38 : 310),
        status: "success",
      },
      {
        name: "extract",
        detail: "differentiators · compliance · objections",
        durationMs: jitter(cached ? 60 : 390),
        status: "success",
      },
      {
        name: "compose",
        detail: "battle_card.md",
        durationMs: jitter(cached ? 72 : 480),
        status: "success",
      },
    ];
  }

  return [
    {
      name: "retrieve",
      detail: `assessment://${label}`,
      durationMs: jitter(260),
      status: "success",
    },
    {
      name: "read",
      detail: questionSnippet
        ? `question · ${questionSnippet}${opts?.question && opts.question.trim().length > 48 ? "…" : ""}`
        : "complete report context",
      durationMs: jitter(95),
      status: "success",
    },
    {
      name: "compose",
      detail: "sales_reply.md",
      durationMs: jitter(340),
      status: "success",
    },
  ];
}

/** Progressive tool-call steps shown while the agent is generating. */
function buildLiveToolCalls(
  kind: GeneratingKind,
  phaseIndex: number,
  opts?: { assessmentLabel?: string; question?: string }
): ToolCallStep[] {
  const blueprint = buildSalesToolCalls(kind, opts);
  return blueprint.map((step, index) => {
    if (index < phaseIndex) {
      return { ...step, status: "success" as const };
    }
    if (index === phaseIndex) {
      return {
        ...step,
        status: "running" as const,
        durationMs: undefined,
        additions: undefined,
        deletions: undefined,
      };
    }
    return {
      ...step,
      status: "running" as const,
      durationMs: undefined,
      additions: undefined,
      deletions: undefined,
      detail: undefined,
    };
  }).filter((_, index) => index <= phaseIndex);
}

/** Dropdown label: "Org Name - Product Name" (customer org + attestation product name) */
function getSalesAgentAssessmentLabel(a: AssessmentRow): string {
  const orgName = (a.customerOrganizationName ?? "").toString().trim();
  const productName = (a.vendorProductName ?? a.productName ?? "").toString().trim();
  if (orgName && productName) return `${orgName} - ${productName}`;
  if (productName) return productName;
  if (orgName) return orgName;
  return `Vendor assessment #${a.assessmentId}`;
}

function isAssessmentExpired(row: AssessmentRow): boolean {
  const expiryAt = row.expiryAt;
  if (expiryAt == null || String(expiryAt).trim() === "") return false;
  const expiry = new Date(expiryAt);
  if (Number.isNaN(expiry.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  return expiry.getTime() < today.getTime();
}

/** True when the linked attestation has an expiry date and it has passed. */
function isAttestationExpired(row: AssessmentRow): boolean {
  const attestationExpiryAt = row?.attestationExpiryAt;
  if (attestationExpiryAt == null || String(attestationExpiryAt).trim() === "") return false;
  try {
    const expiry = new Date(attestationExpiryAt);
    if (Number.isNaN(expiry.getTime())) return false;
    const today = new Date();
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return expiry.getTime() < today.getTime();
  } catch {
    return false;
  }
}

const GREETING =
  "Hello! I'm your AI Sales Enablement Agent. Select a vendor assessment from your completed evaluations and I can help you with SWOT analysis, battle card generation, or answer questions about their compliance posture.";

const QUICK_ACTIONS = [
  { label: "SWOT Analysis", icon: BarChart3, key: "swot" as const },
  { label: "Battle Card", icon: Swords, key: "battlecard" as const },
];

const EXAMPLE_QUESTIONS = [
  {
    id: "security",
    label: "Buyer security concerns",
    question:
      "How should I address buyer concerns about data security and compliance?",
  },
  {
    id: "certs",
    label: "Compliance certifications",
    question:
      "What compliance certifications can I highlight to this customer?",
  },
  {
    id: "ai-risk",
    label: "AI risk objections",
    question: "How do I handle objections about AI risk from buyers?",
  },
];

const SWOT_QUESTION = "Generate a SWOT analysis for my sales positioning.";
const BATTLE_CARD_QUESTION = "Create a battle card for my sales positioning.";

/** Detect if user is asking for SWOT (natural language: "swot", "swot analysis", etc.) */
function isSwotRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return false;
  if (lower.includes("swot") && lower.includes("analysis")) return true;
  if (/\bswot\b/.test(lower)) return true;
  return false;
}

/** Detect if user is asking for Battle Card (natural language: "battle card", "battlecard", etc.) */
function isBattleCardRequest(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower) return false;
  if (/\bbattle\s*card\b/.test(lower)) return true;
  if (/\bbattlecard\b/.test(lower)) return true;
  return false;
}

function hasSwotData(d: SwotData | null | undefined): boolean {
  return !!(
    d &&
    (d.strengths?.length > 0 ||
      d.weaknesses?.length > 0 ||
      d.opportunities?.length > 0 ||
      d.threats?.length > 0)
  );
}

function hasBattleCardData(d: BattleCardData | null | undefined): boolean {
  return !!(d && (d.title || d.keyDifferentiators?.length || d.complianceHighlights?.length));
}

/** Same initials avatar as the top-nav user chip. */
function getUserInitialsFromSession(): string {
  const first = (sessionStorage.getItem("userFirstName") ?? "").trim();
  const last = (sessionStorage.getItem("userLastName") ?? "").trim();
  if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (first) return first.slice(0, 2).toUpperCase();
  const userName = (sessionStorage.getItem("userName") ?? "").trim();
  if (userName.length >= 2) return userName.slice(0, 2).toUpperCase();
  if (userName.length === 1) return userName.toUpperCase();
  const email = (sessionStorage.getItem("userEmail") ?? "").trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return "UN";
}

export function SalesEnablement() {
  useEffect(() => {
    document.title = "AI-Q | Sales Agent";
  }, []);
  const [userInitials, setUserInitials] = useState(getUserInitialsFromSession);
  const [assessmentsList, setAssessmentsList] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageItem[]>(() => [
    dateSeparator("Today"),
    systemMessage(
      `Session started at ${formatSessionTime()}`,
      "session"
    ),
    {
      role: "agent",
      text: GREETING,
    },
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingKind, setGeneratingKind] = useState<GeneratingKind | null>(null);
  const [thinkingPhaseIndex, setThinkingPhaseIndex] = useState(0);
  const pendingAgentMessageRef = useRef<ChatMessageItem | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  /** Cached SWOT and Battle Card for the selected assessment (after user clicks the button) */
  const [generatedSwot, setGeneratedSwot] = useState<SwotData | null>(null);
  const [generatedBattleCard, setGeneratedBattleCard] = useState<BattleCardData | null>(null);
  const [generatedForAssessmentId, setGeneratedForAssessmentId] = useState<string>("");
  const [dismissedExampleIds, setDismissedExampleIds] = useState<string[]>([]);

  useEffect(() => {
    const syncInitials = () => setUserInitials(getUserInitialsFromSession());
    window.addEventListener("userProfileUpdated", syncInitials);
    return () => window.removeEventListener("userProfileUpdated", syncInitials);
  }, []);

  const quickActionsEnabled = !!selectedAssessmentId;
  const visibleExamples = EXAMPLE_QUESTIONS.filter(
    (q) => !dismissedExampleIds.includes(q.id)
  );

  const startGenerating = useCallback((kind: GeneratingKind) => {
    setGeneratingKind(kind);
    setThinkingPhaseIndex(0);
    setIsGenerating(true);
  }, []);

  const stopGenerating = useCallback(() => {
    setIsGenerating(false);
    setGeneratingKind(null);
    setThinkingPhaseIndex(0);
  }, []);

  useEffect(() => {
    if (!isGenerating || !generatingKind) return;
    const phases = THINKING_PHASES[generatingKind];
    if (phases.length <= 1) return;
    const id = window.setInterval(() => {
      setThinkingPhaseIndex((prev) =>
        prev < phases.length - 1 ? prev + 1 : prev
      );
    }, 1400);
    return () => window.clearInterval(id);
  }, [isGenerating, generatingKind]);

  const thinkingStatusText =
    generatingKind != null
      ? THINKING_PHASES[generatingKind][
          Math.min(thinkingPhaseIndex, THINKING_PHASES[generatingKind].length - 1)
        ]
      : "Agent is thinking…";

  const scrollMessagesToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const run = () => {
      if (typeof container.scrollTo === "function") {
        container.scrollTo({ top: container.scrollHeight, behavior });
      } else {
        container.scrollTop = container.scrollHeight;
      }
    };
    // Wait a frame so newly rendered answers (SWOT / battle cards) have layout height.
    requestAnimationFrame(run);
  }, []);

  useEffect(() => {
    scrollMessagesToBottom("smooth");
  }, [messages, isGenerating, thinkingPhaseIndex, scrollMessagesToBottom]);

  const selectedAssessmentLabel = (() => {
    const row = assessmentsList.find(
      (a) => String(a.assessmentId) === String(selectedAssessmentId)
    );
    return row ? getSalesAgentAssessmentLabel(row) : selectedAssessmentId || "vendor assessment";
  })();

  const liveToolCalls =
    isGenerating && generatingKind
      ? buildLiveToolCalls(generatingKind, thinkingPhaseIndex, {
          assessmentLabel: selectedAssessmentLabel,
        })
      : null;

  const fetchAssessments = useCallback(() => {
    const token = sessionStorage.getItem("bearerToken");
    if (!token) {
      setLoading(false);
      return;
    }
    const organizationId = sessionStorage.getItem("organizationId");
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    fetch(`${BASE_URL}/assessments${query}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((result) => {
        if (result?.data?.assessments != null) {
          setAssessmentsList(result.data.assessments as AssessmentRow[]);
        } else {
          setAssessmentsList([]);
        }
      })
      .catch(() => setAssessmentsList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const completedVendorAssessments = assessmentsList.filter(
    (a) =>
      (a.type ?? "").toLowerCase() === "cots_vendor" &&
      (a.status ?? "").toLowerCase() !== "draft" &&
      !isAssessmentExpired(a) &&
      !isAttestationExpired(a),
  );

  const selectOptions = completedVendorAssessments.map((a) => ({
    value: String(a.assessmentId),
    label: getSalesAgentAssessmentLabel(a),
  }));

  useEffect(() => {
    if (
      selectedAssessmentId &&
      !completedVendorAssessments.some(
        (a) => String(a.assessmentId) === String(selectedAssessmentId),
      )
    ) {
      setSelectedAssessmentId("");
    }
  }, [selectedAssessmentId, completedVendorAssessments]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedAssessmentId(value);
    if (value !== generatedForAssessmentId) {
      setGeneratedSwot(null);
      setGeneratedBattleCard(null);
      setGeneratedForAssessmentId("");
    }
    if (value) {
      const row = assessmentsList.find(
        (a) => String(a.assessmentId) === String(value)
      );
      const topic = row
        ? getSalesAgentAssessmentLabel(row)
        : `Assessment #${value}`;
      setMessages((prev) => [
        ...prev,
        systemMessage(`Topic changed to "${topic}"`),
      ]);
    } else {
      setMessages((prev) => [
        ...prev,
        systemMessage("Topic cleared — select an assessment to continue"),
      ]);
    }
  };

  const fetchSalesEnablement = useCallback(
    (
      assessmentId: string,
      type: "swot" | "battlecard"
    ): Promise<{ swot?: SwotData; battleCard?: BattleCardData } | null> => {
      const token = sessionStorage.getItem("bearerToken");
      if (!token) return Promise.resolve(null);
      return fetch(`${BASE_URL}/salesEnablement`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assessmentId, type }),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result?.success && result?.data) {
            return {
              swot: result.data.swot,
              battleCard: result.data.battleCard,
            };
          }
          throw new Error(apiErrorMessage(result, "Failed to generate"));
        });
    },
    []
  );

  const fetchSalesAgentChat = useCallback(
    (assessmentId: string, question: string): Promise<string> => {
      const token = sessionStorage.getItem("bearerToken");
      if (!token) return Promise.reject(new Error("Not authenticated"));
      return fetch(`${BASE_URL}/salesEnablement/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assessmentId, question }),
      })
        .then((res) => res.json())
        .then((result) => {
          if (result?.success && result?.data?.answer != null) {
            return String(result.data.answer);
          }
          throw new Error(apiErrorMessage(result, "Failed to get answer"));
        });
    },
    []
  );

  const handleSend = () => {
    const text = messageInput.trim();
    if (!text || isGenerating) return;

    const isSwot = isSwotRequest(text);
    const isBattleCard = isBattleCardRequest(text);

    setMessages((prev) => [...prev, { role: "user", text }]);
    setMessageInput("");

    // User asked for SWOT (via NLP in textarea)
    if (isSwot) {
      if (!selectedAssessmentId) {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: "Please select a vendor assessment above, then ask again or click the SWOT Analysis button to generate from the complete report.",
          },
        ]);
        return;
      }
      if (hasSwotData(generatedSwot) && generatedForAssessmentId === selectedAssessmentId) {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: "Here's your sales positioning SWOT analysis - use these insights when engaging with prospects:",
            swot: generatedSwot!,
            toolCalls: buildSalesToolCalls("swot", {
              assessmentLabel: selectedAssessmentLabel,
              cached: true,
            }),
          },
          systemMessage("SWOT analysis ready", "check"),
        ]);
        return;
      }
      startGenerating("swot");
      fetchSalesEnablement(selectedAssessmentId, "swot")
        .then((data) => {
          if (!data?.swot) return;
          setGeneratedSwot(data.swot);
          setGeneratedForAssessmentId(selectedAssessmentId);
          setMessages((prev) => [
            ...prev,
            {
              role: "agent" as const,
              text: "Here's your sales positioning SWOT analysis - use these insights when engaging with prospects:",
              swot: data.swot!,
              toolCalls: buildSalesToolCalls("swot", {
                assessmentLabel: selectedAssessmentLabel,
              }),
            },
            systemMessage("SWOT analysis ready", "check"),
          ]);
        })
        .catch((err) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "agent" as const,
              text: errorToUserMessage(err, "Failed to generate SWOT analysis. Please try again."),
            },
          ]);
        })
        .finally(() => stopGenerating());
      return;
    }

    // User asked for Battle Card (via NLP in textarea)
    if (isBattleCard) {
      if (!selectedAssessmentId) {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: "Please select a vendor assessment above, then ask again or click the Battle Card button to generate from the complete report.",
          },
        ]);
        return;
      }
      if (hasBattleCardData(generatedBattleCard) && generatedForAssessmentId === selectedAssessmentId) {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: "Here's your battle card for sales conversations:",
            battleCard: generatedBattleCard!,
            toolCalls: buildSalesToolCalls("battlecard", {
              assessmentLabel: selectedAssessmentLabel,
              cached: true,
            }),
          },
          systemMessage("Battle card ready", "check"),
        ]);
        return;
      }
      startGenerating("battlecard");
      fetchSalesEnablement(selectedAssessmentId, "battlecard")
        .then((data) => {
          if (!data?.battleCard) return;
          setGeneratedBattleCard(data.battleCard);
          setGeneratedForAssessmentId(selectedAssessmentId);
          setMessages((prev) => [
            ...prev,
            {
              role: "agent" as const,
              text: "Here's your battle card for sales conversations:",
              battleCard: data.battleCard!,
              toolCalls: buildSalesToolCalls("battlecard", {
                assessmentLabel: selectedAssessmentLabel,
              }),
            },
            systemMessage("Battle card ready", "check"),
          ]);
        })
        .catch((err) => {
          setMessages((prev) => [
            ...prev,
            {
              role: "agent" as const,
              text: errorToUserMessage(err, "Failed to generate battle card. Please try again."),
            },
          ]);
        })
        .finally(() => stopGenerating());
      return;
    }

    // General question about the selected assessment
    if (!selectedAssessmentId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent" as const,
          text: "Please select a vendor assessment above to ask questions about it.",
        },
      ]);
      return;
    }

    startGenerating("chat");
    fetchSalesAgentChat(selectedAssessmentId, text)
      .then((answer) => {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: stripMarkdownFromSalesReply(answer),
            toolCalls: buildSalesToolCalls("chat", {
              assessmentLabel: selectedAssessmentLabel,
              question: text,
            }),
          },
        ]);
      })
      .catch((err) => {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: errorToUserMessage(err, "Sorry, I couldn't answer that. Please try again."),
          },
        ]);
      })
      .finally(() => stopGenerating());
  };

  const handleExampleClick = (question: string) => {
    setMessageInput(question);
  };

  const dismissExample = (id: string) => {
    setDismissedExampleIds((prev) =>
      prev.includes(id) ? prev : [...prev, id]
    );
  };

  function handleQuickActionSwot() {
    if (!quickActionsEnabled || isGenerating) return;
    setMessages((prev) => [...prev, { role: "user", text: SWOT_QUESTION }]);
    if (hasSwotData(generatedSwot) && generatedForAssessmentId === selectedAssessmentId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent" as const,
          text: "Here's your sales positioning SWOT analysis - use these insights when engaging with prospects:",
          swot: generatedSwot!,
          toolCalls: buildSalesToolCalls("swot", {
            assessmentLabel: selectedAssessmentLabel,
            cached: true,
          }),
        },
        systemMessage("SWOT analysis ready", "check"),
      ]);
      return;
    }
    startGenerating("swot");
    fetchSalesEnablement(selectedAssessmentId, "swot")
      .then((data) => {
        if (!data?.swot) return;
        setGeneratedSwot(data.swot);
        setGeneratedForAssessmentId(selectedAssessmentId);
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: "Here's your sales positioning SWOT analysis - use these insights when engaging with prospects:",
            swot: data.swot,
            toolCalls: buildSalesToolCalls("swot", {
              assessmentLabel: selectedAssessmentLabel,
            }),
          },
          systemMessage("SWOT analysis ready", "check"),
        ]);
      })
      .catch((err) => {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: errorToUserMessage(err, "Failed to generate SWOT analysis. Please try again."),
          },
        ]);
      })
      .finally(() => stopGenerating());
  }

  function handleQuickActionBattleCard() {
    if (!quickActionsEnabled || isGenerating) return;
    setMessages((prev) => [...prev, { role: "user", text: BATTLE_CARD_QUESTION }]);
    if (hasBattleCardData(generatedBattleCard) && generatedForAssessmentId === selectedAssessmentId) {
      setMessages((prev) => [
        ...prev,
        {
          role: "agent" as const,
          text: "Here's your battle card for sales conversations:",
          battleCard: generatedBattleCard!,
          toolCalls: buildSalesToolCalls("battlecard", {
            assessmentLabel: selectedAssessmentLabel,
            cached: true,
          }),
        },
        systemMessage("Battle card ready", "check"),
      ]);
      return;
    }
    startGenerating("battlecard");
    fetchSalesEnablement(selectedAssessmentId, "battlecard")
      .then((data) => {
        if (!data?.battleCard) return;
        setGeneratedBattleCard(data.battleCard);
        setGeneratedForAssessmentId(selectedAssessmentId);
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: "Here's your battle card for sales conversations:",
            battleCard: data.battleCard,
            toolCalls: buildSalesToolCalls("battlecard", {
              assessmentLabel: selectedAssessmentLabel,
            }),
          },
          systemMessage("Battle card ready", "check"),
        ]);
      })
      .catch((err) => {
        setMessages((prev) => [
          ...prev,
          {
            role: "agent" as const,
            text: errorToUserMessage(err, "Failed to generate battle card. Please try again."),
          },
        ]);
      })
      .finally(() => stopGenerating());
  }

  function handleQuickAction(key: string) {
    if (key === "swot") handleQuickActionSwot();
    else if (key === "battlecard") handleQuickActionBattleCard();
    // else if (key === "reports")
    //   setMessageInput("View sales reports and briefs");
  }

  return (
    <div className="sec_user_page org_settings_page sales_enablement_page">
      <div className="heading_user_page page_header_align sales_enablement_page_header">
        <div className="headers page_header_row">
          <span className="icon_size_header" aria-hidden>
            <BotIcon size={22} className="header_icon_svg" />
          </span>
          <div className="page_header_title_block">
            <h1 className="page_header_title">Sales Enablement Agent</h1>
            <p className="sub_title page_header_subtitle">
              SWOT, battle cards, and guided answers from your assessments
            </p>
          </div>
        </div>
      </div>

      <div className="sales_enablement_section">
        <div className="sales_enablement_chat_layout">
          <aside className="sales_enablement_rail" aria-label="Sales agent tools">
            <div className="sales_enablement_rail_block">
              <p className="sales_enablement_rail_label">Context</p>
              <div className="sales_enablement_select_wrapper">
                {loading ? (
                  <LoadingMessage
                    message="Loading assessments…"
                    compact
                    className="sales_enablement_header_loading"
                  />
                ) : (
                  <Select
                    id="vendor_assessment"
                    name="vendor_assessment"
                    labelName=""
                    value={selectedAssessmentId}
                    default_option="Select assessment"
                    options={selectOptions}
                    onChange={handleSelectChange}
                  />
                )}
              </div>
              {!loading && !selectedAssessmentId && (
                <p className="sales_enablement_rail_hint">
                  Choose an assessment to unlock SWOT, battle cards, and grounded answers.
                </p>
              )}
            </div>

            <div className="sales_enablement_rail_block">
              <p className="sales_enablement_rail_label">Quick actions</p>
              <div className="sales_enablement_rail_actions" role="group" aria-label="Quick actions">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  const isDisabled =
                    ((action.key === "swot" || action.key === "battlecard") &&
                      !quickActionsEnabled) ||
                    isGenerating;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      className="sales_enablement_rail_action"
                      disabled={isDisabled}
                      title={
                        isDisabled && !quickActionsEnabled
                          ? "Select a vendor assessment first"
                          : action.label
                      }
                      onClick={() => handleQuickAction(action.key)}
                    >
                      <span className="sales_enablement_rail_action_icon" aria-hidden>
                        <Icon size={16} />
                      </span>
                      <span className="sales_enablement_rail_action_copy">
                        <span className="sales_enablement_rail_action_title">{action.label}</span>
                        <span className="sales_enablement_rail_action_desc">
                          {action.key === "swot"
                            ? "Positioning strengths, gaps, and risks"
                            : "Differentiators, objections, and ICP"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {visibleExamples.length > 0 && (
              <div className="sales_enablement_rail_block sales_enablement_rail_block--prompts">
                <p className="sales_enablement_rail_label">Try asking</p>
                <div className="sales_enablement_rail_prompts" aria-label="Example questions">
                  {visibleExamples.map((ex) => (
                    <div key={ex.id} className="sales_enablement_rail_prompt">
                      <button
                        type="button"
                        className="sales_enablement_rail_prompt_btn"
                        title={ex.question}
                        onClick={() => handleExampleClick(ex.question)}
                      >
                        {ex.label}
                      </button>
                      <button
                        type="button"
                        className="sales_enablement_rail_prompt_dismiss"
                        aria-label={`Dismiss ${ex.label}`}
                        onClick={() => dismissExample(ex.id)}
                      >
                        <X size={12} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <div className="sales_enablement_chat_main">
            <div className="sales_enablement_chat_header">
              <div className="sales_enablement_assistant_lockup">
                <span className="chat_message_icon sales_enablement_assistant_icon">
                  <AiQChatIcon />
                </span>
                <div className="sales_enablement_assistant_meta">
                  <span className="chat_message_title">AI Sales Assistant</span>
                  <p className="chat_message_subtitle">
                    {selectedAssessmentId
                      ? selectedAssessmentLabel
                      : "Powered by vendor attestations & risk data"}
                  </p>
                </div>
              </div>
              <span
                className={`sales_enablement_status_pill${selectedAssessmentId ? " sales_enablement_status_pill--ready" : ""}`}
              >
                {selectedAssessmentId ? "Ready" : "Select context"}
              </span>
            </div>

            <div className="sales_enablement_messages" ref={messagesContainerRef}>
              {messages.map((msg, i) => {
                if (msg.role === "date") {
                  return (
                    <div key={i} className="sales_enablement_date_sep" role="separator">
                      <span className="sales_enablement_date_sep_line" aria-hidden />
                      <span className="sales_enablement_date_sep_label">{msg.text}</span>
                      <span className="sales_enablement_date_sep_line" aria-hidden />
                    </div>
                  );
                }
                if (msg.role === "system") {
                  return (
                    <div key={i} className="sales_enablement_system_msg" role="status">
                      {msg.systemIcon && msg.systemIcon !== "none" ? (
                        <span className="sales_enablement_system_msg_icon">
                          <SystemStatusIcon kind={msg.systemIcon} />
                        </span>
                      ) : null}
                      <span className="sales_enablement_system_msg_text">{msg.text}</span>
                    </div>
                  );
                }
                return (
                <ChatMessage
                  key={i}
                  role={msg.role}
                  icon={
                    msg.role === "user" ? (
                      <span
                        className="sales_enablement_user_avatar"
                        aria-hidden
                      >
                        {userInitials}
                      </span>
                    ) : undefined
                  }
                >
                  {msg.role === "agent" && msg.swot ? (
                    <>
                      <div className="sales_enablement_agent_answer_wrap">
                        <span className="chat_message_icon sales_enablement_agent_icon">
                          <AiQChatIcon />
                        </span>
                        <div className="bot_answer_sec">
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <ToolCallsSummary
                              calls={msg.toolCalls}
                              autoCollapse
                            />
                          )}
                          {msg.text && (
                            <p className="sales_enablement_agent_intro">
                              {msg.text}
                            </p>
                          )}
                          <div className="sales_enablement_swot">
                            <div className="sales_enablement_swot_block sales_enablement_swot--strengths">
                              <div className="sales_enablement_swot_title">
                                <span>
                                  <TrendingUp className="swot_title_icons" />
                                </span>
                                <span>Strengths</span>
                              </div>
                              <ul>
                                {msg.swot.strengths.map((s, j) => (
                                  <li key={j}>{s}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="sales_enablement_swot_block sales_enablement_swot--weaknesses">
                              <div className="sales_enablement_swot_title">
                                <span><TrendingDown className="swot_title_icons"/></span>
                                <span>Weaknesses</span>
                              </div>
                              <ul>
                                {msg.swot.weaknesses.map((s, j) => (
                                  <li key={j}>{s}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="sales_enablement_swot_block sales_enablement_swot--opportunities">
                              <div className="sales_enablement_swot_title">
                                <span>
                                  <Lightbulb className="swot_title_icons" />
                                </span>
                                <span>Opportunities</span>
                              </div>
                              <ul>
                                {msg.swot.opportunities.map((s, j) => (
                                  <li key={j}>{s}</li>
                                ))}
                              </ul>
                            </div>
                            <div className="sales_enablement_swot_block sales_enablement_swot--threats">
                              <div className="sales_enablement_swot_title">
                                <span>
                                  <TriangleAlert className="swot_title_icons" />
                                </span>
                                <span>Threats</span>
                              </div>
                              <ul>
                                {msg.swot.threats.map((s, j) => (
                                  <li key={j}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : msg.role === "agent" && msg.battleCard ? (
                    <div className="sales_enablement_agent_answer_wrap">
                      <span className="chat_message_icon sales_enablement_agent_icon">
                        <AiQChatIcon />
                      </span>
                      <div className="bot_answer_sec">
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <ToolCallsSummary
                            calls={msg.toolCalls}
                            autoCollapse
                          />
                        )}
                        {msg.text && (
                          <p className="sales_enablement_agent_intro">
                            {msg.text}
                          </p>
                        )}
                        <div className="sales_enablement_battle_card">
                          <h4 className="sales_enablement_battle_card_title">
                            {msg.battleCard.title}
                          </h4>
                          {(msg.battleCard.keyDifferentiators != null ||
                            msg.battleCard.complianceHighlights != null ||
                            msg.battleCard.objectionHandling != null) && (
                            <div className="sales_enablement_battle_card_grid">
                              {msg.battleCard.keyDifferentiators != null &&
                                msg.battleCard.keyDifferentiators.length > 0 && (
                                  <div className="sales_enablement_battle_card_section sales_enablement_battle_card--differentiators">
                                    <div className="sales_enablement_battle_card_section_header">
                                      <Target
                                        className="sales_enablement_battle_card_section_icon sales_enablement_battle_card_icon--blue"
                                        size={18}
                                        aria-hidden
                                      />
                                      <span>Key Differentiators</span>
                                    </div>
                                    <ul>
                                      {msg.battleCard.keyDifferentiators.map(
                                        (b, j) => (
                                          <li key={j}>{b}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                              {msg.battleCard.complianceHighlights != null &&
                                msg.battleCard.complianceHighlights.length >
                                  0 && (
                                  <div className="sales_enablement_battle_card_section sales_enablement_battle_card--compliance">
                                    <div className="sales_enablement_battle_card_section_header">
                                      <FileCheck
                                        className="sales_enablement_battle_card_section_icon sales_enablement_battle_card_icon--green"
                                        size={18}
                                        aria-hidden
                                      />
                                      <span>Compliance Highlights</span>
                                    </div>
                                    <ul className="sales_enablement_battle_card_highlights">
                                      {msg.battleCard.complianceHighlights.map(
                                        (b, j) => (
                                          <li key={j}>{b}</li>
                                        )
                                      )}
                                    </ul>
                                  </div>
                                )}
                              {msg.battleCard.objectionHandling != null && (
                                <div className="sales_enablement_battle_card_section sales_enablement_battle_card--objection">
                                  <div className="sales_enablement_battle_card_section_header">
                                    <Square
                                      className="sales_enablement_battle_card_section_icon sales_enablement_battle_card_icon--orange"
                                      size={18}
                                      aria-hidden
                                    />
                                    <span>Objection Handling</span>
                                  </div>
                                  <div className="sales_enablement_battle_card_qa">
                                    <p className="sales_enablement_battle_card_q">
                                      Q:{" "}
                                      {
                                        msg.battleCard.objectionHandling
                                          .question
                                      }
                                    </p>
                                    <p className="sales_enablement_battle_card_a">
                                      A:{" "}
                                      {
                                        msg.battleCard.objectionHandling
                                          .answer
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {msg.battleCard.qaBlocks != null &&
                            msg.battleCard.qaBlocks.length > 0 && (
                              <div className="sales_enablement_battle_card_qa_blocks">
                                {msg.battleCard.qaBlocks.map((qa, j) => (
                                  <div
                                    key={j}
                                    className="sales_enablement_battle_card_qa_card"
                                  >
                                    <p className="sales_enablement_battle_card_q">
                                      Q: {qa.question}
                                    </p>
                                    <p className="sales_enablement_battle_card_a">
                                      A: {qa.answer}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          {msg.battleCard.idealCustomerProfile != null && (
                            <div className="sales_enablement_battle_card_icp">
                              <h5 className="sales_enablement_battle_card_icp_title">
                                Ideal Customer Profile
                              </h5>
                              <p>
                                {msg.battleCard.idealCustomerProfile}
                              </p>
                            </div>
                          )}
                          {msg.battleCard.bullets != null &&
                            msg.battleCard.bullets.length > 0 && (
                              <ul>
                                {msg.battleCard.bullets.map((b, j) => (
                                  <li key={j}>{b}</li>
                                ))}
                              </ul>
                            )}
                        </div>
                      </div>
                    </div>
                  ) : msg.role === "agent" ? (
                    <div className="sales_enablement_agent_answer_wrap">
                      <span className="chat_message_icon sales_enablement_agent_icon">
                        <AiQChatIcon />
                      </span>
                      <div className="bot_answer_sec">
                        {msg.toolCalls && msg.toolCalls.length > 0 && (
                          <ToolCallsSummary
                            calls={msg.toolCalls}
                            autoCollapse
                          />
                        )}
                        {msg.text && (
                          <div
                            className={
                              msg.text.length > 300
                                ? "sales_enablement_agent_text sales_enablement_agent_text--long"
                                : "sales_enablement_agent_text"
                            }
                          >
                            {msg.text}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    msg.text
                  )}
                </ChatMessage>
                );
              })}
              {isGenerating && (
                <div
                  className="sales_enablement_agent_answer_wrap sales_enablement_generating_block"
                  role="status"
                  aria-live="polite"
                  aria-label={thinkingStatusText}
                >
                  <span className="chat_message_icon sales_enablement_agent_icon">
                    <AiQChatIcon />
                  </span>
                  <div className="sales_enablement_generating_panel">
                    {liveToolCalls && liveToolCalls.length > 0 && (
                      <ToolCallsSummary
                        calls={liveToolCalls}
                        defaultOpen
                        className="tool_calls_summary--live"
                      />
                    )}
                    <div className="sales_enablement_agent_thinking">
                      <span className="sales_enablement_agent_thinking_text">
                        {thinkingStatusText}
                      </span>
                      <span className="sales_enablement_thinking_dots" aria-hidden>
                        <span />
                        <span />
                        <span />
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="sales_enablement_messages_end" aria-hidden />
            </div>

            <div className="sales_enablement_composer">
              <div className="sales_enablement_input_shell">
                <Input
                  id="sales_enablement_message"
                  labelName=""
                  name="message"
                  type="textarea"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  required={false}
                  rows={2}
                  placeholder={
                    selectedAssessmentId
                      ? "Ask about positioning, objections, or compliance…"
                      : "Select an assessment to start chatting…"
                  }
                />
                <Button
                  type="button"
                  className={`sales_enablement_send_btn${messageInput.trim() && !isGenerating ? " sales_enablement_send_btn--ready" : ""}`}
                  onClick={handleSend}
                  disabled={isGenerating || !messageInput.trim()}
                  aria-label="Send message"
                >
                  {isGenerating ? (
                    <Loader2 size={18} className="sales_enablement_send_loader" aria-hidden />
                  ) : (
                    <ArrowUp size={18} strokeWidth={2.25} aria-hidden />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
