import assert from "node:assert/strict";
import test from "node:test";
import { buildEvidenceReview, fingerprint } from "./core.js";

const sourceBytes = new TextEncoder().encode("verified-linkedin-export");

function validInput() {
  return {
    sourceFilename: "AggregateAnalytics_2026-07-22_2026-07-28.xlsx",
    sourceBytes,
    period: { start: "2026-07-22", end: "2026-07-28" },
    metrics: { impressions: 805, membersReached: 438, engagements: 29, followers: 28 },
    baseline: {
      id: "Build-in-Evidence Baseline 001",
      period: { start: "2026-07-21", end: "2026-07-27" },
      metrics: { impressions: 584, membersReached: 297, engagements: 29, followers: 28 },
    },
    topTopics: ["AI engineering", "Cloudflare", "Founder journey"],
    audienceSignals: ["Senior 38%", "IT Services and IT Consulting 24%"],
  };
}

test("creates a pending review with zero external writes", () => {
  const review = buildEvidenceReview(validInput());
  assert.equal(review.approvalStatus, "PENDING");
  assert.equal(review.externalWrites, 0);
  assert.equal(review.deltas.impressions.absolute, 221);
  assert.equal(review.deltas.impressions.percent, 37.8);
  assert.equal(review.deltas.membersReached.absolute, 141);
  assert.equal(review.deltas.membersReached.percent, 47.5);
  assert.equal(review.deltas.followers.percent, 0);
  assert.equal(review.source.sha256, fingerprint(sourceBytes));
});

test("returns null percent when the baseline is zero", () => {
  const input = validInput();
  input.baseline.metrics.engagements = 0;
  assert.equal(buildEvidenceReview(input).deltas.engagements.percent, null);
});

test("rejects malformed metric values", () => {
  const input = validInput();
  input.metrics.impressions = -1;
  assert.throws(() => buildEvidenceReview(input), /non-negative integer/);
});

test("rejects reversed reporting periods", () => {
  const input = validInput();
  input.period = { start: "2026-07-29", end: "2026-07-28" };
  assert.throws(() => buildEvidenceReview(input), /cannot be after/);
});

test("does not infer conversions from distribution metrics", () => {
  const review = buildEvidenceReview(validInput());
  assert.match(review.truthBoundary, /does not prove revenue, partnerships, investor interest, or conversion/);
});
