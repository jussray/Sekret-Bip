import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  getNextStudyMission,
  getStudyMissions,
  getSubjectCompletion,
  isCorrectStudyChoice,
} from '../src/bipJr/study/curriculum.ts';
import { STUDY_MODE_POLICIES, STUDY_SUBJECTS } from '../src/bipJr/study/modes.ts';
import {
  EMPTY_STUDY_PROGRESS,
  applyStudyAttempt,
  normalizeStudyProgress,
} from '../src/bipJr/study/progress.ts';
import { CHILD_SAFETY_CONTRACT } from '../src/bipJr/safetyContract.ts';

const AGE_BANDS = ['5-7', '8-10', '11-12'];
const SUBJECTS = STUDY_SUBJECTS.map((subject) => subject.id);

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
