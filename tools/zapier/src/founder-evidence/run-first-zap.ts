import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { runFounderEvidenceAutomation } from "./automation.js";
import type { EvidenceBaseline } from "./core.js";

interface AutomationManifest {
  workbookFile: string;
  baseline: EvidenceBaseline;
  period?: { start: string; end: string };
  topTopics?: string[];
  audienceSignals?: string[];
  outputPrefix?: string;
}

async function main(): Promise<void> {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    throw new Error("Usage: npm run evidence:first-zap -- <automation-manifest.json>");
  }

  const absoluteManifest = resolve(manifestPath);
  const manifest = JSON.parse(await readFile(absoluteManifest, "utf8")) as AutomationManifest;
  const workbookPath = resolve(absoluteManifest, "..", manifest.workbookFile);
  const result = await runFounderEvidenceAutomation({
    workbookPath,
    baseline: manifest.baseline,
    period: manifest.period,
    topTopics: manifest.topTopics,
    audienceSignals: manifest.audienceSignals,
    outputPrefix: manifest.outputPrefix
      ? resolve(absoluteManifest, "..", manifest.outputPrefix)
      : undefined,
  });

  console.log(JSON.stringify({
    automationId: result.automationId,
    approvalStatus: result.review.approvalStatus,
    externalWrites: result.review.externalWrites,
    stoppedAt: result.stoppedAt,
    fingerprint: result.review.source.sha256,
    outputs: result.outputs,
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
