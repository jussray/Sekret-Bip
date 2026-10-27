import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('age assurance model keeps age proof privacy-minimal and blocks under-13 teen entry', async () => {
  const model = await read('src/features/onboarding/ageAssurance.ts');

  assert.match(model, /AgeVerificationStatus/);
  assert.match(model, /'guardian_required'/);
  assert.match(model, /'third_party_required'/);
  assert.match(model, /'blocked'/);
  assert.match(model, /id:\s*'under-13'/);
  assert.match(model, /allowed:\s*false/);
  assert.match(model, /nextRoute:\s*'\/\(onboarding\)\/parental-consent'/);
  assert.match(model, /rawEvidenceStored:\s*'bip_age_raw_evidence_stored'/);

  assert.doesNotMatch(model, /raw_id|id_image|selfie_video|face_scan|date_of_birth|full_dob/i);
});

test('age onboarding screen stores assurance metadata instead of raw evidence', async () => {
  const screen = await read('app/(onboarding)/age.tsx');

  assert.match(screen, /decideAgeAssurance/);
  assert.match(screen, /AGE_ASSURANCE_STORAGE_KEYS\.status/);
  assert.match(screen, /AGE_ASSURANCE_STORAGE_KEYS\.method/);
  assert.match(screen, /AGE_ASSURANCE_STORAGE_KEYS\.guardianRequired/);
  assert.match(screen, /AGE_ASSURANCE_STORAGE_KEYS\.rawEvidenceStored, 'false'/);
  assert.match(screen, /age_verification_status/);
  assert.match(screen, /age_verification_method/);
  assert.match(screen, /guardian_required/);
  assert.match(screen, /raw_evidence_stored:\s*false/);

  // Match actual collection-request phrasing ("upload your ID", "take a
  // selfie"), not the screen's own reassurance copy that mentions these
  // words only to say they are NOT collected (e.g. "No ID image, selfie,
  // video, or raw proof is stored").
  assert.doesNotMatch(screen, /(upload|submit|take|record|capture|scan|provide|enter)\s+(a |an |your )?(id|selfie|video proof|date of birth)/i);
});

test('welcome is a one-page onboarding entry without bypassing age assurance', async () => {
  const welcome = await read('app/(onboarding)/welcome.tsx');

  assert.match(welcome, /One page/);
  assert.match(welcome, /AGE_OPTIONS/);
  assert.match(welcome, /decideAgeAssurance/);
  assert.match(welcome, /persistDecision/);
  assert.match(welcome, /AGE_ASSURANCE_STORAGE_KEYS\.rawEvidenceStored, 'false'/);
  assert.match(welcome, /advance\('age_verified'/);
  assert.match(welcome, /guardian_required/);
  assert.match(welcome, /router\.push\(decision\.nextRoute as never\)/);
  assert.match(welcome, /handleParent/);

  assert.doesNotMatch(welcome, /router\.push\('\/\(onboarding\)\/age'/);
  // Same rationale as the age screen test above: match actual
  // collection-request phrasing, not welcome.tsx's own reassurance copy
  // ("No raw ID, selfie, video, or full birth date is collected here").
  assert.doesNotMatch(welcome, /(upload|submit|take|record|capture|scan|provide|enter)\s+(a |an |your )?(id|selfie|video proof|date of birth)/i);
});

test('auth layout prevents direct teen signup before age assurance', async () => {
  const layout = await read('app/(auth)/_layout.tsx');

  assert.match(layout, /AGE_ASSURANCE_STORAGE_KEYS/);
  assert.match(layout, /isSignupRoute/);
  assert.match(layout, /params\.side === 'parent'/);
  assert.match(layout, /needs-age/);
  assert.match(layout, /needs-parental-consent/);
  assert.match(layout, /<Redirect href="\/\(onboarding\)\/welcome"/);
  assert.match(layout, /<Redirect href="\/\(onboarding\)\/parental-consent"/);
  assert.match(layout, /ALLOWED_TEEN_AGE_STATUSES/);
});

test('parental consent request collects only a guardian email before parent flow', async () => {
  const consent = await read('app/(onboarding)/parental-consent.tsx');

  assert.match(consent, /parentEmail/);
  assert.match(consent, /PARENTAL_CONSENT_EMAIL_KEY/);
  assert.match(consent, /ONBOARDING_SIDE_KEY, 'parent'/);
  assert.match(consent, /No child account was created/);
  assert.match(consent, /No child account, username, password, profile, or private content is collected/);

  assert.doesNotMatch(consent, /signUp\(|createUser|childName|child_name|dateOfBirth|birthYear|password\s*=|username\s*=/i);
});

test('onboarding documentation and ledger describe the one-page shell without claiming production proof', async () => {
  const docs = await read('ONBOARDING.md');
  const ledger = await read('implementation-ledger.extensions/auth-onboarding-runtime.json');

  assert.match(docs, /one-page entry/i);
  assert.match(docs, /UX shell, not a single unchecked backend event/i);
  assert.match(docs, /raw_evidence_stored = false/);
  assert.match(docs, /legal, privacy, storage, deletion, and vendor review/);

  assert.match(ledger, /one-page age\/account-side choice/);
  assert.match(ledger, /app\/\(onboarding\)\/welcome\.tsx/);
  assert.match(ledger, /src\/features\/onboarding\/ageAssurance\.ts/);
  assert.match(ledger, /test\/age-assurance-model\.test\.mjs/);
  assert.match(ledger, /"state":\s*"not-run"/);
});
