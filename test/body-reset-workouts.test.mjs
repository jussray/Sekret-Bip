import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Body Reset exposes real timed workout routines instead of alert placeholders', () => {
  const catalog = read('src/features/reset/catalog.ts');
  const screen = read('screens/MindBodyResetScreen.tsx');

  for (const routineId of [
    'one-minute-release',
    'three-minute-burn',
    'five-minute-mood-lift',
    'seven-minute-power',
  ]) {
    assert.equal(catalog.includes(`id: '${routineId}'`), true);
  }

  assert.equal(catalog.includes("exercise('jumping-jacks'"), true);
  assert.equal(catalog.includes("exercise('squats'"), true);
  assert.equal(catalog.includes("exercise('push-ups'"), true);
  assert.equal(catalog.includes("exercise('side-plank'"), true);
  assert.equal(screen.includes('Actual body workouts'), true);
  assert.equal(screen.includes("Alert.alert('Stretch'"), false);
});

test('the dedicated workout route records a minimal Supabase-backed completion event', () => {
  const route = read('app/(teen)/body-workout.tsx');
  const events = read('src/features/activity/events.ts');

  assert.equal(route.includes("emitEvent('comfort_completed'"), true);
  assert.equal(route.includes('routineId: routine.id'), true);
  assert.equal(route.includes("completionKind: 'workout'"), true);
  assert.equal(route.includes('exerciseCount: routine.exercises.length'), true);
  assert.equal(events.includes('routineId?: string'), true);
  assert.equal(events.includes("resetMode?: 'mind' | 'body'"), true);
});

test('workout flow includes low-impact, pause, skip, rest, safety, and anti-skip completion controls', () => {
  const flow = read('src/features/reset/ResetFlows.tsx');
  assert.equal(flow.includes('Low-impact mode'), true);
  assert.equal(flow.includes("{paused ? 'Resume' : 'Pause'}"), true);
  assert.equal(flow.includes("{nextExercise ? 'Skip' : 'Finish'}"), true);
  assert.equal(flow.includes("phase === 'rest'"), true);
  assert.equal(flow.includes('Stop for pain, chest pressure, trouble breathing, faintness, or dizziness.'), true);
  assert.equal(flow.includes('minimumMeaningfulSeconds'), true);
});

test('Expo Router keeps the workout route hidden from the teen tab bar', () => {
  const layout = read('app/(teen)/_layout.tsx');
  const routes = read('src/teen/routes.ts');
  assert.match(layout, /<Tabs\.Screen\s+name="body-workout"\s+options=\{\{\s*href:\s*null\s*\}\}\s*\/>/);
  assert.match(routes, /bodyWorkout:\s*'\/\(teen\)\/body-workout'/);
});

test('reset shell uses the selected character room and real Night art', () => {
  const screen = read('screens/MindBodyResetScreen.tsx');
  assert.match(screen, /IMAGES\.nightNeutral/);
  assert.match(screen, /IMAGES\.cloudAvatarNeutral/);
  assert.match(screen, /selectedSekret as Character/);
});

test('Supabase migration restores the existing event-to-points trigger without a parallel table', () => {
  const migration = read('supabase/migrations/20260713052511_restore_bip_events_points_trigger.sql');
  assert.match(migration, /create trigger bip_events_award_points/i);
  assert.match(migration, /after insert on public\.bip_events/i);
  assert.match(migration, /execute function public\.handle_bip_event_points\(\)/i);
  assert.doesNotMatch(migration, /create table/i);
});
