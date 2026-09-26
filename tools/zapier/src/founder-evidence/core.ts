import { createHash } from "node:crypto";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "STALE";

export interface EvidenceMetrics {
  impressions: number;
  membersReached: number;
  engagements: number;
  followers: number;
}

export interface EvidencePeriod {
  start: string;
  end: string;
}

export interface EvidenceBaseline {
  id: string;
  period: EvidencePeriod;
  metrics: EvidenceMetrics;
}

export interface EvidenceInput {
  sourceFilename: string;
  sourceBytes: Uint8Array;
  period: EvidencePeriod;
  metrics: EvidenceMetrics;
  baseline: EvidenceBaseline;
  topTopics: string[];
  audienceSignals: string[];
}

export interface MetricDelta {
  absolute: number;
  percent: number | null;
}

export interface EvidenceReview {
  source: { filename: string; sha256: string };
  period: EvidencePeriod;
  metrics: EvidenceMetrics;
  baselineId: string;
  deltas: Record<keyof EvidenceMetrics, MetricDelta>;
  topTopics: string[];
  audienceSignals: string[];
  truthBoundary: string;
  nextHypothesis: string;
  approvalStatus: ApprovalStatus;
  externalWrites: 0;
}

const metricKeys: Array<keyof EvidenceMetrics> = [
  "impressions",
  "membersReached",
  "engagements",
  "followers",
];

function assertIsoDate(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error(`${field} must be an ISO date (YYYY-MM-DD).`);
  }
}

function validateMetrics(metrics: EvidenceMetrics, field: string): void {
  for (const key of metricKeys) {
    const value = metrics[key];
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throw new Error(`${field}.${key} must be a non-negative integer.`);
    }
  }
}

export function validateEvidenceInput(input: EvidenceInput): void {
  if (!input.sourceFilename.trim()) throw new Error("sourceFilename is required.");
  if (input.sourceBytes.byteLength === 0) throw new Error("sourceBytes cannot be empty.");
  assertIsoDate(input.period.start, "period.start");
  assertIsoDate(input.period.end, "period.end");
  if (input.period.start > input.period.end) throw new Error("period.start cannot be after period.end.");
  assertIsoDate(input.baseline.period.start, "baseline.period.start");
  assertIsoDate(input.baseline.period.end, "baseline.period.end");
  if (!input.baseline.id.trim()) throw new Error("baseline.id is required.");
  validateMetrics(input.metrics, "metrics");
  validateMetrics(input.baseline.metrics, "baseline.metrics");
}

export function fingerprint(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function delta(current: number, previous: number): MetricDelta {
  return {
    absolute: current - previous,
    percent: previous === 0 ? null : Number((((current - previous) / previous) * 100).toFixed(1)),
  };
}

export function buildEvidenceReview(input: EvidenceInput): EvidenceReview {
  validateEvidenceInput(input);

  const deltas = Object.fromEntries(
    metricKeys.map((key) => [key, delta(input.metrics[key], input.baseline.metrics[key])]),
  ) as Record<keyof EvidenceMetrics, MetricDelta>;

  const strongestGrowth = metricKeys
    .filter((key) => deltas[key].percent !== null)
    .sort((a, b) => (deltas[b].percent ?? -Infinity) - (deltas[a].percent ?? -Infinity))[0];

  return {
    source: { filename: input.sourceFilename, sha256: fingerprint(input.sourceBytes) },
    period: input.period,
    metrics: input.metrics,
    baselineId: input.baseline.id,
    deltas,
    topTopics: [...input.topTopics],
    audienceSignals: [...input.audienceSignals],
    truthBoundary:
      "This packet proves only the supplied export, deterministic calculations, and stated signals. It does not prove revenue, partnerships, investor interest, or conversion without traceable downstream evidence.",
    nextHypothesis: strongestGrowth
      ? `Test whether evidence-led technical posts can sustain ${strongestGrowth} growth while improving meaningful conversations.`
      : "Collect another verified baseline before selecting a growth hypothesis.",
    approvalStatus: "PENDING",
    externalWrites: 0,
  };
}

export function renderMarkdown(review: EvidenceReview): string {
  const lines = [
    "# Founder Evidence Review",
    "",
    `- Period: ${review.period.start} through ${review.period.end}`,
    `- Source: ${review.source.filename}`,
    `- SHA-256: \`${review.source.sha256}\``,
    `- Baseline: ${review.baselineId}`,
    `- Approval: **${review.approvalStatus}**`,
    `- External writes: **${review.externalWrites}**`,
    "",
    "## Metrics",
    "",
    "| Metric | Current | Absolute delta | Percent delta |",
    "|---|---:|---:|---:|",
  ];

  for (const key of metricKeys) {
    const item = review.deltas[key];
    lines.push(`| ${key} | ${review.metrics[key]} | ${item.absolute} | ${item.percent === null ? "n/a" : `${item.percent}%`} |`);
  }

  lines.push(
    "",
    "## Top topics",
    ...review.topTopics.map((topic) => `- ${topic}`),
    "",
    "## Audience signals",
    ...review.audienceSignals.map((signal) => `- ${signal}`),
    "",
    "## Truth boundary",
    review.truthBoundary,
    "",
    "## Next hypothesis",
    review.nextHypothesis,
    "",
  );

  return lines.join("\n");
}
