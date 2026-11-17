#!/usr/bin/env node

// Safely inspect and optionally repair the exact legacy literal-backslash-n bug.
// No scanning, silent writes, deletions, or fallback repairs.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { safeProjectPath } from './room-production-foreman.mjs';

const RUN_ID = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z$/;

export function inspectLegacyReport(raw) {
  if (typeof raw !== 'string') throw new Error('Room report must be UTF-8 text.');
  try {
    return { status: 'valid', text: raw, report: JSON.parse(raw) };
  } catch {
    if (!raw.endsWith('\\n')) throw new Error('Unrecognized room report corruption.');
    const text = raw.slice(0, -2) + '\n';
    try {
      return { status: 'repairable', text, report: JSON.parse(text) };
    } catch {
      throw new Error('Unrecognized room report corruption.');
    }
  }
}

function main(argv) {
  const [flag, runId, action, ...rest] = argv;
  if (flag !== '--run-id' || !RUN_ID.test(runId ?? '') || rest.length ||
      (action !== undefined && action !== '--apply')) {
    throw new Error('Usage: node scripts/room-report-recovery.mjs --run-id RUN_ID [--apply]');
  }

  const parts = ['.room-foreman', 'runs', runId];
  const reportFile = safeProjectPath(...parts, 'run-report.json');
  const raw = fs.readFileSync(reportFile, 'utf8');
  const result = inspectLegacyReport(raw);
  if (!result.report || typeof result.report !== 'object' ||
      result.report.runId !== runId || !Array.isArray(result.report.results)) {
    throw new Error('Run identity or report structure mismatch.');
  }

  if (result.status === 'valid') {
    console.log('ROOM_FOREMAN_REPORT_ALREADY_VALID');
    return;
  }
  if (action !== '--apply') {
    console.log('ROOM_FOREMAN_LEGACY_REPAIRABLE');
    return;
  }

  // Exclusive backup protects the original. A failed repeat never overwrites it.
  const backupFile = safeProjectPath(...parts, 'run-report.json.legacy.bak');
  const temporaryFile = safeProjectPath(...parts, 'run-report.json.repaired.tmp');
  fs.writeFileSync(backupFile, raw, { flag: 'wx', mode: 0o600 });
  fs.writeFileSync(temporaryFile, result.text, { flag: 'wx', mode: 0o600 });
  fs.renameSync(temporaryFile, reportFile);
  console.log('ROOM_FOREMAN_LEGACY_REPAIRED');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    main(process.argv.slice(2));
  } catch {
    console.error('ROOM_FOREMAN_RECOVERY_REJECTED');
    process.exitCode = 1;
  }
}
