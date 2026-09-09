#!/usr/bin/env node

import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const NON_PRODUCTION_PREFIXES = Object.freeze([
  '.agents/',
  '.ai-skills/',
  '.claude/',
  '.control-room/',
  '.cursor/',
  '.devcontainer/',
  '.figma/',
  '.security/',
  '.vscode/',
  'design/',
  'design-handoff/',
  'design-references/',
  'docs/',
  'e2e/',
  'e2e-founder-operator/',
  'e2e-founder-preview/',
  'figma/',
  'implementation-ledger.extensions/',
  'prototypes/',
  'reports/',
  'test/',
]);

const NON_PRODUCTION_EXACT_PATHS = new Set([
  '.coderabbit.yaml',
  'implementation-ledger.json',
  'opencode.json',
  'skills-lock.json',
  'sonar-project.properties',
]);

function isRootMarkdown(path) {
  return !path.includes('/') && path.endsWith('.md');
}

export function isKnownNonProductionPath(path) {
  if (typeof path !== 'string' || path.length === 0) return false;
  if (path.startsWith('/') || path.includes('\\') || path.split('/').includes('..')) return false;
  if (isRootMarkdown(path)) return true;
  if (NON_PRODUCTION_EXACT_PATHS.has(path)) return true;
  return NON_PRODUCTION_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function classifyProductionImpact(paths) {
  const normalized = Array.from(new Set(paths.map((path) => path.trim()).filter(Boolean)));

  if (normalized.length === 0) {
    return {
      productionImpact: true,
      reason: 'no-changed-paths',
      productionPaths: [],
      nonProductionPaths: [],
    };
  }

  const productionPaths = [];
  const nonProductionPaths = [];

  for (const path of normalized) {
    if (isKnownNonProductionPath(path)) nonProductionPaths.push(path);
    else productionPaths.push(path);
  }

  return {
    productionImpact: productionPaths.length > 0,
    reason: productionPaths.length > 0 ? 'production-or-unknown-path' : 'verified-non-production-only',
    productionPaths,
    nonProductionPaths,
  };
}

async function readStdin() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const input = await readStdin();
  const result = classifyProductionImpact(input.split(/\r?\n/u));
  process.stdout.write(`${result.productionImpact ? 'true' : 'false'}\n`);
}
