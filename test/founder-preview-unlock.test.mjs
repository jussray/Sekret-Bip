import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

function routeValues(source) {
  return [...source.matchAll(/:\s*'([^']+)'/g)].map(match => match[1]);
}

test('Founder Preview is native-development first and cannot be enabled in production', () => {
  const preview = read('src/constants/founderPreview.ts');
  const env = read('.env.example');

  assert.match(preview, /const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__/);
  assert.match(preview, /if \(!isDevelopment\) return false/);
  assert.match(preview, /if \(explicit === 'false'\) return false/);
  assert.match(preview, /if \(explicit === 'true'\) return true/);
  assert.match(preview, /return Platform\.OS !== 'web'/);
  assert.match(env, /EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW=true/);
  assert.match(env, /Production builds always ignore this flag and remain closed/);
});

test('the catalog covers every canonical Teen and Parent route', () => {
  const preview = read('src/constants/founderPreview.ts');
  const teenRoutes = routeValues(read('src/teen/routes.ts'));
  const parentRoutes = routeValues(read('src/parent/routes.ts'));
  const parameterizedOrCanonicalRedirects = new Set([
    '/(teen)/user-room',
    '/(teen)/companion-chat',
  ]);

  for (const route of [...teenRoutes, ...parentRoutes]) {
    if (parameterizedOrCanonicalRedirects.has(route)) continue;
    assert.equal(preview.includes(route), true, `Founder Preview catalog is missing ${route}`);
  }

  assert.match(preview, /\/\(dev\)\/feature-preview/);
  assert.match(preview, /\/\(dev\)\/scrapbook-preview/);
  assert.match(preview, /Bridge AI Summaries/);
  assert.match(preview, /Approved Companion Memory/);
});

test('preview points unlock UI without touching the real economy', () => {
  const ledger = read('src/features/activity/ledger.ts');

  assert.match(ledger, /FOUNDER_PREVIEW_POINTS/);
  assert.match(ledger, /Math\.max\(ledger\.total, FOUNDER_PREVIEW_POINTS\)/);
  assert.match(ledger, /isPreview: true/);
  assert.match(ledger, /actualTotal: ledger\.total/);
  assert.doesNotMatch(ledger, /preview[\s\S]{0,200}point_transactions/);
  assert.doesNotMatch(ledger, /preview[\s\S]{0,200}\.insert\(/);
});

test('implemented and founder-only prototype features receive development override without L4', () => {
  const flags = read('src/constants/relationshipFeatureFlags.ts');

  assert.match(flags, /FOUNDER_PREVIEWABLE_FEATURES/);
  assert.match(flags, /'bridgeSummaries'/);
  assert.match(flags, /'crewAccountability'/);
  const previewSet = flags.slice(
    flags.indexOf('const FOUNDER_PREVIEWABLE_FEATURES'),
    flags.indexOf('export function isRelationshipFeatureAvailable'),
  );
  assert.match(previewSet, /emotionalScrapbook/);
  assert.doesNotMatch(previewSet, /companionMemory/);
});

test('route visibility opens in development while side and Quiet Bip safety boundaries remain', () => {
  const teenLayout = read('app/(teen)/_layout.tsx');
  const parentLayout = read('app/(parent)/_layout.tsx');

  assert.match(teenLayout, /if \(founderPreview && devSideOverride === 'parent'\)/);
  assert.match(teenLayout, /if \(founderPreview\) \{/);
  assert.match(teenLayout, /if \(!sleepLoaded\) return <TeenLoadingSurface \/>/);
  assert.match(teenLayout, /if \(sleepActive && !quietRouteAllowed\) return <Redirect href="\/\(teen\)\/quiet" \/>/);
  assert.match(teenLayout, /return <TeenTabs selectedSekret=\{selectedSekret \?\? 'raylene'\} quietActive=\{sleepActive\} \/>/);
  assert.match(teenLayout, /SafetyExperienceSheet/);
  assert.match(teenLayout, /useSafetyCheck/);
  assert.match(parentLayout, /if \(founderPreview\) return <ParentTabs/);
  assert.match(parentLayout, /resolveParentEntryState/);
  assert.match(parentLayout, /Screen-level RLS, linkage, consent, account, and safety requirements/);
});

test('Crew preview is local-only and the live path uses accepted-only identity', () => {
  const entry = read('src/screens/CrewAccountabilityScreen.tsx');
  const crew = read('src/screens/CrewAccountabilityScreenV3.tsx');
  const service = read('src/services/crewAccountabilityServiceV2.ts');

  assert.match(entry, /CrewAccountabilityScreenV3/);
  assert.match(crew, /PREVIEW_PROFILES/);
  assert.match(crew, /PREVIEW_MINE/);
  assert.match(crew, /PREVIEW_FEED/);
  assert.match(crew, /if \(previewSample\)/);
  assert.match(crew, /setMyCheckIns/);
  assert.match(crew, /setFeed/);
  assert.match(crew, /rpc\('get_crew_connection_profiles'/);
  assert.doesNotMatch(crew, /get_public_circle_profiles/);
  assert.doesNotMatch(crew, /\.from\('circle_profiles'\)/);
  assert.match(crew, /Nothing is written to Supabase/);
  assert.match(crew, /leave Crew/);
  assert.match(service, /rpc\('create_crew_check_in'/);
  assert.doesNotMatch(service, /MAX_SHARES/);
});

test('Bridge and Scrapbook samples are labeled and do not pretend to be backend proof', () => {
  const bridge = read('src/features/bridge/ParentBridgeSummaryInbox.tsx');
  const scrapbook = read('app/(dev)/scrapbook-preview.tsx');
  const wrangler = read('wrangler.toml');

  assert.match(bridge, /FOUNDER PREVIEW SAMPLE/);
  assert.match(bridge, /No teen content was read, summarized, or written to Supabase/);
  assert.match(scrapbook, /UI PROTOTYPE/);
  assert.match(scrapbook, /It does not save, upload, share, or expose private media yet/);
  assert.match(scrapbook, /What still has to be built/);
  assert.match(wrangler, /BRIDGE_SUMMARIES_ROLLOUT = "disabled"/);
  assert.doesNotMatch(wrangler, /BRIDGE_SUMMARIES_ROLLOUT = "enabled"/);
});

test('OpenAI and Anthropic share one truthful preview handoff and Crew addendum', () => {
  const handoff = read('docs/OPENAI_ANTHROPIC_FOUNDER_PREVIEW.md');
  const crewAddendum = read('docs/OPENAI_ANTHROPIC_CREW_ADDENDUM.md');

  assert.match(handoff, /OpenAI \+ Anthropic Handoff/);
  assert.match(handoff, /OpenAI implementation boundary/);
  assert.match(handoff, /Anthropic implementation boundary/);
  assert.match(handoff, /Claude Code as a coding agent and Anthropic as a runtime provider are separate decisions/);
  assert.match(handoff, /Never set it to `enabled` merely for founder testing/);
  assert.match(handoff, /age verification/);
  assert.match(handoff, /Row Level Security/);
  assert.match(handoff, /fake preview points/);

  assert.match(crewAddendum, /supersedes its older Crew sample paragraph/);
  assert.match(crewAddendum, /get_crew_connection_profiles/);
  assert.match(crewAddendum, /There is no numeric Crew cap/);
  assert.match(crewAddendum, /create_crew_check_in/);
  assert.match(crewAddendum, /set_crew_connection_status/);
});

test('both More screens expose the all-features launcher only in Founder Preview', () => {
  const teenMore = read('screens/MoreScreen.tsx');
  const teenRoute = read('app/(teen)/more.tsx');
  const parentMore = read('app/(parent)/more.tsx');

  assert.match(teenMore, /Open every Bip feature/);
  assert.match(teenMore, /founderPreview \?/);
  assert.match(teenRoute, /dev-feature-preview/);
  assert.match(teenRoute, /\/\(dev\)\/feature-preview/);
  assert.match(parentMore, /Open every Bip feature/);
  assert.match(parentMore, /\/\(dev\)\/feature-preview/);
});