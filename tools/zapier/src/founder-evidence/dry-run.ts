import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { buildEvidenceReview, renderMarkdown, type EvidenceBaseline, type EvidenceMetrics, type EvidencePeriod } from "./core.js";

interface DryRunManifest {
  sourceFile: string;
  period: EvidencePeriod;
  metrics: EvidenceMetrics;
  baseline: EvidenceBaseline;
  topTopics?: string[];
  audienceSignals?: string[];
}

async function main(): Promise<void> {
  const manifestPath = process.argv[2];
  if (!manifestPath) throw new Error("Usage: npm run evidence:dry-run -- <manifest.json>");

  const absoluteManifest = resolve(manifestPath);
  const manifest = JSON.parse(await readFile(absoluteManifest, "utf8")) as DryRunManifest;
  const absoluteSource = resolve(absoluteManifest, "..", manifest.sourceFile);
  const sourceBytes = await readFile(absoluteSource);

  const review = buildEvidenceReview({
    sourceFilename: basename(absoluteSource),
    sourceBytes,
    period: manifest.period,
    metrics: manifest.metrics,
    baseline: manifest.baseline,
    topTopics: manifest.topTopics ?? [],
    audienceSignals: manifest.audienceSignals ?? [],
  });

  const outputRoot = absoluteManifest.replace(/\.json$/i, "");
  await writeFile(`${outputRoot}.review.json`, `${JSON.stringify(review, null, 2)}\n`, "utf8");
  await writeFile(`${outputRoot}.review.md`, renderMarkdown(review), "utf8");

  console.log(JSON.stringify({
    approvalStatus: review.approvalStatus,
    externalWrites: review.externalWrites,
    fingerprint: review.source.sha256,
    outputs: [`${outputRoot}.review.json`, `${outputRoot}.review.md`],
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
