/**
 * Auth / anonymity separation — founder canon (Ray, 2026-10-30).
 *
 * Anonymous mode has NOTHING to do with signing in. Two separate systems:
 *   1. Account authentication — sign up / sign in / sign out, email+password
 *      or magic link, account recovery. NO anonymous-login option.
 *   2. Anonymous participation — signed-in users may participate anonymously
 *      in Circle. Public identity is hidden; the private account stays
 *      intact; participation never creates or replaces an account.
 *
 * Launch requirement: the two must work independently. These tests pin the
 * separation in source so the systems cannot silently re-couple.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function walkSources(dir) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) return [];
  const out = [];
  for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
    const full = path.join(base, entry.name);
    if (entry.isDirectory()) out.push(...walkSources(path.join(dir, entry.name)));
    else if (entry.isFile() && /\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

// ── (a) No anonymous-login option anywhere in the client ────────────────────

test('no client source file can create an anonymous session', () => {
  const offenders = [];
  for (const dir of ['app', 'src', 'components', 'screens']) {
    for (const file of walkSources(dir)) {
      if (fs.readFileSync(file, 'utf8').includes('signInAnonymously')) {
        offenders.push(path.relative(root, file));
      }
    }
  }
  assert.deepEqual(offenders, [], `signInAnonymously must not exist in client code: ${offenders}`);
});

test('session service exposes permanent-account helpers only', () => {
  const session = read('src/services/session.ts');
  assert.doesNotMatch(session, /signInAnonymously/);
  assert.doesNotMatch(session, /ensureAnonymousSession/);
  assert.match(session, /export async function getCurrentSessionUserId/);
  assert.match(session, /export async function endAuthenticatedSession/);
});

test('auth screens offer no anonymous sign-in path', () => {
  const login = read('app/(auth)/login.tsx');
  const signup = read('app/(auth)/signup.tsx');
  assert.doesNotMatch(login, /signInAnonymously/);
  assert.doesNotMatch(signup, /signInAnonymously/);
  // An anonymous session is never treated as a completed sign-in.
  assert.match(login, /session\.user\.is_anonymous/);
});

test('entry routing treats an anonymous session as no account, never a skip-in', () => {
  const entry = read('app/index.tsx');
  assert.match(entry, /user\.is_anonymous/);
  assert.match(entry, /setRequiresAccountUpgrade\(true\)/);
  assert.match(entry, /setHasPermanentSession\(false\)/);
});

// ── (c) Authentication state and public identity state stay separate ────────

test('session resolution rejects anonymous sessions instead of adopting them', () => {
  const session = read('src/services/session.ts');
  const fn = session.slice(session.indexOf('export async function getCurrentSessionUserId'));
  assert.match(fn, /user\.is_anonymous\) return null/);
});

test('app auth state derives only from the permanent session, never from Circle identity', () => {
  const context = read('src/context/AppContext.tsx');
  assert.match(context, /session && !session\.user\.is_anonymous \? session\.user\.id : null/);
  assert.doesNotMatch(context, /teen_circle_identity/);
  assert.doesNotMatch(context, /circleName/);
});

test('Circle public identity is its own store, distinct from the private profile', () => {
  const identity = read('src/features/identity/profileIdentity.ts');
  assert.match(identity, /TeenCircleIdentity/);
  assert.match(identity, /'teen_circle_identity'/);
  assert.match(identity, /'teen_profile_data'/);
  assert.doesNotMatch(identity, /supabase/);
  assert.doesNotMatch(identity, /signIn|signOut/);
});

// ── (b) Anonymous controls live inside Circle, not in authentication ────────

test('anonymous participation controls live in Circle surfaces', () => {
  const circleScreen = read('screens/CircleScreen.tsx');
  assert.match(circleScreen, /posting anonymously/);
  const identity = read('src/features/identity/profileIdentity.ts');
  assert.match(identity, /circleName: 'anonymous bip'/);
  const repo = read('src/features/circle/circleRepository.ts');
  assert.match(repo, /'anonymous bip'/);
});

// ── (d) Anonymous posts expose no account identifiers ───────────────────────

test('public Circle feed items carry no author account identifier', () => {
  const repo = read('src/features/circle/circleRepository.ts');
  const iface = repo.slice(
    repo.indexOf('export interface PublicCircleFeedItem'),
    repo.indexOf('type PublicFeedRpcRow'),
  );
  assert.doesNotMatch(iface, /userId/);
  assert.doesNotMatch(iface, /author/);

  const mapper = repo.slice(
    repo.indexOf('function mapFeedItem'),
    repo.indexOf('export async function loadPublicCircleFeed'),
  );
  assert.doesNotMatch(mapper, /userId:/);
  // The account id is used only transiently to resolve the pseudonymous
  // profile through the hardened RPC.
  assert.match(repo, /get_public_circle_profiles/);
  assert.match(mapper, /profiles\.get\(row\.author_user_id\)/);
});

test('public Circle participation still requires a permanent account', () => {
  const repo = read('src/features/circle/circleRepository.ts');
  assert.match(repo, /if \(!user \|\| user\.is_anonymous\) return null/);
  assert.match(repo, /Create a permanent Bip account before opening Circle\./);
});

test('legacy public Circle feed read never selects the author account id', () => {
  const sync = read('src/utils/sync.ts');
  assert.match(sync, /from\(TABLES\.publicCirclePosts\)\s*\.select\('id, text, post_mood, media_kind, reactions, created_at'\)/);
});

// ── (e) Toggling anonymity never touches the session or the account ─────────

test('Circle anonymity UI cannot sign anyone out or create a session', () => {
  const circleScreen = read('screens/CircleScreen.tsx');
  assert.doesNotMatch(circleScreen, /signOut/);
  assert.doesNotMatch(circleScreen, /signInAnonymously/);
  assert.doesNotMatch(circleScreen, /endAuthenticatedSession/);
  assert.doesNotMatch(circleScreen, /supabase\.auth/);
});

test('the only sign-out in the session service is the explicit logout path', () => {
  const session = read('src/services/session.ts');
  const signOutUses = session.match(/signOut/g) ?? [];
  assert.equal(signOutUses.length, 1, 'signOut is called exactly once, inside endAuthenticatedSession');
  const logout = session.slice(session.indexOf('export async function endAuthenticatedSession'));
  assert.match(logout, /await supabase\.auth\.signOut\(\)/);
  assert.ok(session.indexOf('await disableCurrentPushToken()') < session.indexOf('await supabase.auth.signOut()'));
});
