import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const screen = fs.readFileSync(path.join(root, 'src/features/bridge/BridgeFamilyVisitScreen.tsx'), 'utf8');
const service = fs.readFileSync(path.join(root, 'src/services/bridgeFamilyVisitService.ts'), 'utf8');
const bootstrap = fs.readFileSync(path.join(root, 'src/services/auth/postAuthBootstrap.ts'), 'utf8');
const parentLayout = fs.readFileSync(path.join(root, 'app/(parent)/_layout.tsx'), 'utf8');
const signup = fs.readFileSync(path.join(root, 'src/features/identity/accountProfile.ts'), 'utf8');

test('Family Visit UI says plainly that the session is visible and not recording', () => {
  assert.match(screen, /A visit support space, not surveillance\./);
  assert.match(screen, /Se’kret is not recording\./);
  assert.match(screen, /VISIBLE SESSION • NO RECORDING/);
  assert.match(screen, /does not secretly record, investigate, diagnose, or decide custody/i);
});

test('Family Visit client imports no microphone, camera, media recorder, or transcription APIs', () => {
  const combined = `${screen}\n${service}`;
  assert.doesNotMatch(combined, /expo-av|expo-camera|MediaRecorder|getUserMedia|microphone|transcrib/i);
  assert.doesNotMatch(combined, /audioBase64|videoUri|recordingUri|transcript/i);
});

test('child transparency renders both audience summaries while adult roles render only their own', () => {
  assert.match(screen, /role === 'parent' && parentSummary/);
  assert.match(screen, /role === 'professional' && professionalSummary/);
  assert.match(screen, /role === 'teen' && parentSummary/);
  assert.match(screen, /role === 'teen' && professionalSummary/);
  assert.match(screen, /WHAT YOUR PARENT CAN SEE/);
  assert.match(screen, /WHAT THE PROFESSIONAL CAN SEE/);
});

test('raw markers and reflections are never fetched into the shared client bundle', () => {
  assert.doesNotMatch(service, /from\('bridge_family_visit_markers'\)/);
  assert.doesNotMatch(service, /from\('bridge_family_visit_reflections'\)/);
  assert.match(service, /from\('bridge_family_visit_summaries'\)/);
});

test('public client cannot mint professional verification or case assignment authority', () => {
  assert.doesNotMatch(service, /review_bridge_professional_access/);
  assert.doesNotMatch(service, /create_bridge_case_assignment/);
  assert.doesNotMatch(screen, /create_bridge_case_assignment|review_bridge_professional_access/);
});

test('verified professional routing is discovered from server capability, never a public account-side enum', () => {
  assert.match(bootstrap, /fetchProfessionalBridgeCapability/);
  assert.match(bootstrap, /verificationStatus === 'verified'/);
  assert.match(bootstrap, /professionalBridgeAvailable/);
  assert.match(parentLayout, /fetchProfessionalBridgeCapability/);
  assert.match(parentLayout, /Redirect href=\{'\/bridge-family-visit'/);
  assert.doesNotMatch(signup, /'cys'|'professional'/);
});

test('professional account still completes normal consent and onboarding before Family Visit landing', () => {
  const routeStart = bootstrap.indexOf('function routeForBootstrap');
  const routeEnd = bootstrap.indexOf('async function hydrateAccountProfileForRouting', routeStart);
  const route = bootstrap.slice(routeStart, routeEnd);
  assert.ok(route.indexOf('!requiredConsentsComplete') < route.indexOf('professionalBridgeAvailable'));
  assert.ok(route.indexOf('!profile?.onboardingComplete') < route.indexOf('professionalBridgeAvailable'));
});

test('professional summary generation uses the existing authenticated Bridge endpoint', () => {
  assert.match(service, /\/api\/bridge\/summary\/generate/);
  assert.match(service, /JSON\.stringify\(\{ sessionId \}\)/);
});

test('professional gets a specific wait state until all three reflections exist', () => {
  assert.match(service, /participant_reflections_required/);
  assert.match(service, /Waiting for the child, parent, and professional to each save a structured reflection\./);
});
