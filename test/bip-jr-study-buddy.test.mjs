import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  getMissionAfter,
  getNextStudyMission,
  getStudyMissions,
  getSubjectCompletion,
  isCorrectStudyChoice,
} from '../src/bipJr/study/curriculum.ts';
import { STUDY_MODE_POLICIES, STUDY_SUBJECTS } from '../src/bipJr/study/modes.ts';
import {
  EMPTY_STUDY_PROGRESS,
  STUDY_PROGRESS_KEY,
  applyStudyAttempt,
  isStudyProgressKey,
  normalizeActiveStudyChild,
  normalizeStudyProgress,
  studyProgressKey,
} from '../src/bipJr/study/progress.ts';
import { CHILD_SAFETY_CONTRACT } from '../src/bipJr/safetyContract.ts';

const AGE_BANDS = ['5-7', '8-10', '11-12'];
const SUBJECTS = STUDY_SUBJECTS.map((subject) => subject.id);
const STABLE_MISSION_IDS = [
  '5-7-reading-1=Sound detective',
  '5-7-reading-2=Letter match',
  '5-7-math-1=Count and add',
  '5-7-math-2=Which has more?',
  '5-7-science-1=Living or not?',
  '5-7-science-2=Weather watcher',
  '5-7-language-1=Hello around the world',
  '5-7-language-2=Count in Spanish',
  '5-7-study_skills-1=Ready-to-learn check',
  '5-7-study_skills-2=One thing first',
  '8-10-reading-1=Main idea finder',
  '8-10-reading-2=Context clue search',
  '8-10-math-1=Build twelve',
  '8-10-math-2=Equal groups',
  '8-10-science-1=Plant power',
  '8-10-science-2=State of matter',
  '8-10-language-1=Introduce yourself',
  '8-10-language-2=Polite words',
  '8-10-study_skills-1=Break it into three',
  '8-10-study_skills-2=Distraction plan',
  '11-12-reading-1=Claim and evidence',
  '11-12-reading-2=Author’s purpose',
  '11-12-math-1=Explain the operation',
  '11-12-math-2=Percent sense',
  '11-12-science-1=Testable question',
  '11-12-science-2=Energy transfer',
  '11-12-language-1=Useful conversation',
  '11-12-language-2=Choose the response',
  '11-12-study_skills-1=Focus sprint',
  '11-12-study_skills-2=Check your source',
];

test('every age band has a warm-up then practice mission for every subject (30 total)', () => {
  let total = 0;
  for (const band of AGE_BANDS) {
    for (const subject of SUBJECTS) {
      const missions = getStudyMissions(band, subject);
      assert.equal(missions.length, 2, `${band}/${subject}`);
      assert.deepEqual(missions.map((m) => m.level), ['warm_up', 'practice']);
      assert.deepEqual(missions.map((m) => m.id), [`${band}-${subject}-1`, `${band}-${subject}-2`]);
      total += missions.length;
    }
  }
  assert.equal(total, 30);
});

test('each mission has exactly one valid answer and complete child-facing guidance', () => {
  const seen = new Set();
  for (const band of AGE_BANDS) {
    for (const subject of SUBJECTS) {
      for (const mission of getStudyMissions(band, subject)) {
        assert.ok(!seen.has(mission.id), `duplicate id ${mission.id}`);
        seen.add(mission.id);
        const ids = mission.choices.map((c) => c.id);
        assert.equal(new Set(ids).size, ids.length, `${mission.id} choice ids unique`);
        assert.ok(ids.includes(mission.correctChoiceId), `${mission.id} answer is a listed choice`);
        assert.equal(isCorrectStudyChoice(mission, mission.correctChoiceId), true);
        for (const wrong of ids.filter((id) => id !== mission.correctChoiceId)) {
          assert.equal(isCorrectStudyChoice(mission, wrong), false, `${mission.id} rejects ${wrong}`);
        }
        assert.equal(isCorrectStudyChoice(mission, 'not-a-choice'), false);
        for (const field of ['title', 'goal', 'prompt', 'hint', 'explanation', 'offlineFinish']) {
          assert.ok(mission[field].trim().length > 0, `${mission.id}.${field}`);
        }
      }
    }
  }
});

test('next mission advances past mastered work and wraps to the warm-up when all are done', () => {
  const [first, second] = getStudyMissions('8-10', 'math');
  assert.equal(getNextStudyMission('8-10', 'math', EMPTY_STUDY_PROGRESS).id, first.id);

  const afterFirst = applyStudyAttempt(EMPTY_STUDY_PROGRESS, first.id, 'math', true);
  assert.equal(getNextStudyMission('8-10', 'math', afterFirst).id, second.id);
  assert.deepEqual(getSubjectCompletion('8-10', 'math', afterFirst), { completed: 1, total: 2 });

  const afterBoth = applyStudyAttempt(afterFirst, second.id, 'math', true);
  assert.equal(getNextStudyMission('8-10', 'math', afterBoth).id, first.id);
  assert.deepEqual(getSubjectCompletion('8-10', 'math', afterBoth), { completed: 2, total: 2 });
});

test('a wrong answer counts an attempt but never marks the mission mastered', () => {
  const after = applyStudyAttempt(EMPTY_STUDY_PROGRESS, '5-7-reading-1', 'reading', false);
  assert.deepEqual(after.completedMissionIds, []);
  assert.equal(after.attemptsByMission['5-7-reading-1'], 1);
  assert.equal(after.lastSubject, 'reading');
  assert.deepEqual(EMPTY_STUDY_PROGRESS.attemptsByMission, {}, 'input is not mutated');
});

test('attempts cap at 99 and repeat mastery is not duplicated', () => {
  let progress = EMPTY_STUDY_PROGRESS;
  for (let i = 0; i < 120; i += 1) progress = applyStudyAttempt(progress, 'm', 'math', true);
  assert.equal(progress.attemptsByMission.m, 99);
  assert.deepEqual(progress.completedMissionIds, ['m']);
});

test('stored progress is normalized to the minimal allow-listed shape', () => {
  assert.deepEqual(normalizeStudyProgress(null), EMPTY_STUDY_PROGRESS);
  assert.deepEqual(normalizeStudyProgress('garbage'), EMPTY_STUDY_PROGRESS);

  const normalized = normalizeStudyProgress({
    completedMissionIds: ['5-7-math-1', 42, null],
    attemptsByMission: { ok: 3, negative: -1, fractional: 1.5, text: '2', [`${'x'.repeat(90)}`]: 1 },
    lastSubject: 'circle',
    email: 'kid@example.com',
    journal: 'private',
  });
  assert.deepEqual(normalized, {
    completedMissionIds: ['5-7-math-1'],
    attemptsByMission: { ok: 3 },
    lastSubject: null,
  });
  assert.deepEqual(Object.keys(normalized).sort(), ['attemptsByMission', 'completedMissionIds', 'lastSubject']);

  const many = normalizeStudyProgress({ completedMissionIds: Array.from({ length: 150 }, (_, i) => `m${i}`) });
  assert.equal(many.completedMissionIds.length, 100);
});

test('only private scripted practice is enabled; adult and classroom modes stay locked', () => {
  const byMode = Object.fromEntries(STUDY_MODE_POLICIES.map((p) => [p.mode, p]));
  assert.equal(byMode.solo_ai.enabledInPrototype, true);
  assert.equal(byMode.adult_mission.enabledInPrototype, false);
  assert.equal(byMode.classroom_activity.enabledInPrototype, false);
  for (const policy of STUDY_MODE_POLICIES) assert.equal(policy.allowsChildToChildCommunication, false);
});

test('child safety contract is frozen and keeps child-risk capabilities off', () => {
  assert.equal(Object.isFrozen(CHILD_SAFETY_CONTRACT), true);
  for (const key of [
    'childMayCreateAccount', 'publicProfiles', 'publicFeed', 'userSearch', 'unrestrictedDirectMessages',
    'locationSharing', 'targetedAdvertising', 'sellChildData', 'circleExistsInChildProduct',
    'childToChildFreeText', 'childToChildVoice', 'childToChildVideo', 'classmateDiscovery',
    'productionAiCallsEnabled', 'adultAssignedStudyMissions', 'companionMayPromiseSecrecy',
  ]) {
    assert.equal(CHILD_SAFETY_CONTRACT[key], false, key);
  }
  for (const key of ['adultCreatedAccountsOnly', 'companionMustDiscloseAI', 'studyProgressIsLocalAndMinimal']) {
    assert.equal(CHILD_SAFETY_CONTRACT[key], true, key);
  }
});

test('recovered study modules make no network, Supabase, or AI calls', () => {
  for (const file of ['curriculum.ts', 'modes.ts', 'progress.ts', 'progressStore.ts', 'types.ts']) {
    const source = fs.readFileSync(new URL(`../src/bipJr/study/${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bfetch\(|getSupabase|\.rpc\(|openai|anthropic/i, file);
  }
});

test('progress keys are scoped per child profile and reject unsafe scopes', () => {
  const a = studyProgressKey('2f1c6c1e-1111-4a2b-9c3d-000000000001');
  const b = studyProgressKey('2f1c6c1e-1111-4a2b-9c3d-000000000002');
  assert.notEqual(a, b);
  assert.equal(a, `${STUDY_PROGRESS_KEY}:2f1c6c1e-1111-4a2b-9c3d-000000000001`);
  for (const unsafe of ['', '../other', 'a:b', 'x'.repeat(65), 'with space']) {
    assert.equal(studyProgressKey(unsafe), `${STUDY_PROGRESS_KEY}:device`, JSON.stringify(unsafe));
  }
  assert.equal(isStudyProgressKey(a), true);
  assert.equal(isStudyProgressKey(STUDY_PROGRESS_KEY), true);
  assert.equal(isStudyProgressKey('jr_study_progress_v10'), false);
  assert.equal(isStudyProgressKey('mood'), false);
});

test('signing out clears every Bip Jr study progress key', () => {
  const storage = fs.readFileSync(new URL('../src/utils/storage.ts', import.meta.url), 'utf8');
  const clear = storage.slice(storage.indexOf('export async function clearPrivateAccountCache'));
  assert.match(clear, /await clearAllStudyProgress\(\);/);
  const store = fs.readFileSync(new URL('../src/bipJr/study/progressStore.ts', import.meta.url), 'utf8');
  assert.match(store, /getAllKeys\(\)[\s\S]*filter\(key => isStudyProgressKey\(key\)[\s\S]*multiRemove\(studyKeys\)/);
});

test('after a subject is finished, Next moves through every mission instead of repeating the warm-up', () => {
  const [first, second] = getStudyMissions('11-12', 'science');
  let progress = applyStudyAttempt(EMPTY_STUDY_PROGRESS, first.id, 'science', true);
  progress = applyStudyAttempt(progress, second.id, 'science', true);
  assert.equal(getMissionAfter('11-12', 'science', progress, first.id).id, second.id);
  assert.equal(getMissionAfter('11-12', 'science', progress, second.id).id, first.id);

  const halfDone = applyStudyAttempt(EMPTY_STUDY_PROGRESS, second.id, 'science', true);
  assert.equal(getMissionAfter('11-12', 'science', halfDone, second.id).id, first.id);
  assert.equal(getMissionAfter('11-12', 'science', halfDone, 'unknown').id, first.id);
});

test('persisted mission IDs stay stable (stored progress depends on them)', () => {
  const ids = [];
  for (const band of AGE_BANDS) for (const subject of SUBJECTS) {
    for (const mission of getStudyMissions(band, subject)) ids.push(`${mission.id}=${mission.title}`);
  }
  // Changing this list re-points saved mastery to different lessons. Add new
  // missions at the end of a subject, and migrate stored IDs if one must change.
  assert.deepEqual(ids, STABLE_MISSION_IDS);
});

test('the device handoff accepts only a valid child id and age band', () => {
  const id = '2f1c6c1e-1111-4a2b-9c3d-000000000001';
  assert.deepEqual(normalizeActiveStudyChild({ id, ageBand: '8-10', extra: 'dropped' }), { id, ageBand: '8-10' });
  for (const bad of [null, 'text', { id }, { id, ageBand: '13-17' }, { id: '../x', ageBand: '5-7' }, { id: '', ageBand: '5-7' }]) {
    assert.equal(normalizeActiveStudyChild(bad), null, JSON.stringify(bad));
  }
});

test('the selected child never travels in the Study Buddy URL and is cleared on sign-out', () => {
  const page = fs.readFileSync(new URL('../app/(parent)/bip-jr.tsx', import.meta.url), 'utf8');
  const screen = fs.readFileSync(new URL('../app/(parent)/bip-jr-study.tsx', import.meta.url), 'utf8');
  const store = fs.readFileSync(new URL('../src/bipJr/study/progressStore.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /bipJrStudy\}\?|bip-jr-study\?/);
  assert.doesNotMatch(screen, /useLocalSearchParams/);
  assert.match(store, /isStudyProgressKey\(key\) \|\| key === ACTIVE_STUDY_CHILD_KEY/);
});

test('switching child resets subject and age range before that child\'s progress loads', () => {
  const screen = fs.readFileSync(new URL('../app/(parent)/bip-jr-study.tsx', import.meta.url), 'utf8');
  const hydrate = screen.slice(screen.indexOf('if (!childResolved) return;'));
  const load = hydrate.indexOf('loadStudyProgress(scope)');
  assert.ok(hydrate.indexOf("setSubject('math')") > -1 && hydrate.indexOf("setSubject('math')") < load);
  assert.ok(hydrate.indexOf("setAgeBand(child?.ageBand ?? '5-7')") > -1 && hydrate.indexOf("setAgeBand(child?.ageBand ?? '5-7')") < load);
  assert.match(screen, /useFocusEffect\(useCallback\(/);
});
