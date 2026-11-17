import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildEvidenceReview, renderMarkdown, type EvidenceBaseline, type EvidenceReview } from "./core.js";
import { parseLinkedInWorkbook } from "./xlsx.js";

export const FIRST_ZAP_AUTOMATION = {
  id: "founder-evidence-linkedin-review-v1",
  name: "Founder Evidence — LinkedIn XLSX Review",
  mode: "REVIEW_ONLY",
  trigger: "NEW_LINKEDIN_ANALYTICS_XLSX",
  stages: [
    "FINGERPRINT_SOURCE",
    "VALIDATE_WORKBOOK",
    "EXTRACT_METRICS",
    "COMPARE_BASELINE",
    "GENERATE_REVIEW_PACKET",
    "STOP_FOR_FOUNDER_APPROVAL",
  ],
  downstreamWritesBeforeApproval: 0,
} as const;

export interface AutomationInput {
  workbookPath: string;
  baseline: EvidenceBaseline;
  period?: { start: string; end: string };
  topTopics?: string[];
  audienceSignals?: string[];
  outputPrefix?: string;
}

export interface AutomationResult {
  automationId: typeof FIRST_ZAP_AUTOMATION.id;
  review: EvidenceReview;
  outputs: string[];
  stoppedAt: "FOUNDER_APPROVAL";
}

export async function runFounderEvidenceAutomation(input: AutomationInput): Promise<AutomationResult> {
  const workbook = await parseLinkedInWorkbook(input.workbookPath);
  const period = input.period ?? workbook.period;
  if (!period) {
    throw new Error("Workbook filename does not contain two ISO dates; supply period explicitly.");
  }

  const review = buildEvidenceReview({
    sourceFilename: workbook.sourceFilename,
    sourceBytes: workbook.sourceBytes,
    period,
    metrics: workbook.metrics,
    baseline: input.baseline,
    topTopics: input.topTopics ?? [],
    audienceSignals: input.audienceSignals ?? [],
  });

  const outputPrefix = resolve(input.outputPrefix ?? input.workbookPath.replace(/\.xlsx$/i, ""));
  const outputs = [`${outputPrefix}.review.json`, `${outputPrefix}.review.md`];
  await writeFile(outputs[0], `${JSON.stringify({ automation: FIRST_ZAP_AUTOMATION, review }, null, 2)}\n`, "utf8");
  await writeFile(outputs[1], renderMarkdown(review), "utf8");

  return {
    automationId: FIRST_ZAP_AUTOMATION.id,
    review,
    outputs,
    stoppedAt: "FOUNDER_APPROVAL",
  };
}
