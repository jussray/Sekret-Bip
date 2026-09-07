import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsDir = path.join(root, 'supabase', 'migrations');
const contractPath = path.join(migrationsDir, '20260907223000_bridge_family_visit_mode.sql');
const hardeningPath = path.join(migrationsDir, '20260907223100_harden_bridge_family_visit_mode.sql');

const contract = fs.readFileSync(contractPath, 'utf8');
const hardening = fs.readFileSync(hardeningPath, 'utf8');
const combined = `${contract}\n${hardening}`;

function tableBlock(name) {
  const start = contract.indexOf(`create table if not exists public.${name}`);
  assert.notEqual(start, -1, `${name} table must exist`);
  const end = contract.indexOf('\n);', start);
  assert.notEqual(end, -1, `${name} table must terminate`);
  return contract.slice(start, end + 3);
}

function functionBlock(source, name) {
  const start = source.lastIndexOf(`create or replace function public.${name}(`);
  assert.notEqual(start, -1, `${name} function must exist`);
  const end = source.indexOf('\n$$;', start);
  assert.notEqual(end, -1, `${name} function must terminate`);
  return source.slice(start, end + 4);
}

test('family visit migrations exist at ordered authority paths', () => {
  assert.equal(fs.existsSync(contractPath), true);
  assert.equal(fs.existsSync(hardeningPath), true);
});

test('Family Visit Mode is structurally no-recording and cannot store passive media or transcripts', () => {
  const session = tableBlock('bridge_family_visit_sessions');
  const markers = tableBlock('bridge_family_visit_markers');
  const reflections = tableBlock('bridge_family_visit_reflections');

  assert.match(session, /capture_mode text not null default 'none'/i);
  assert.match(session, /check \(capture_mode = 'none'\)/i);
  for (const block of [session, markers, reflections]) {
    assert.doesNotMatch(block, /\b(audio|video|transcript|recording|microphone|camera)_/i);
    assert.doesNotMatch(block, /\b(raw_text|free_text|body|message|note)\b/i);
  }
});

test('a session cannot activate until teen, parent, and professional each acknowledge it', () => {
  const ack = functionBlock(hardening, 'acknowledge_bridge_family_visit_session');
  assert.match(ack, /teen_acknowledged_at is not null/i);
  assert.match(ack, /parent_acknowledged_at is not null/i);
  assert.match(ack, /professional_acknowledged_at is not null/i);
  assert.match(ack, /state = 'active'/i);
  assert.match(ack, /capture_mode <> 'none'/i);
});

test('professional authority is server-reviewed and cannot be self-selected', () => {
  const review = functionBlock(hardening, 'review_bridge_professional_access');
  assert.match(review, /v_reviewer_role not in \('founder','admin'\)/i);
  assert.match(review, /completed permanent adult account required/i);
  assert.match(contract, /revoke insert, update, delete on table public\.bridge_professional_profiles from authenticated/i);
  assert.doesNotMatch(combined, /alter table public\.app_profiles[\s\S]{0,300}account_side/i);
});

test('case assignments are separately authorized and do not inherit ordinary parent_link power', () => {
  const createAssignment = functionBlock(hardening, 'create_bridge_case_assignment');
  assert.match(createAssignment, /v_creator_role not in \('founder','admin'\)/i);
  assert.match(createAssignment, /verified professional required/i);
  assert.match(createAssignment, /completed teen-side account required/i);
  assert.match(createAssignment, /completed parent-side account required/i);
  assert.doesNotMatch(createAssignment, /parent_links/i);
});

test('professional suspension or revocation fails closed across active assignments', () => {
  const review = functionBlock(hardening, 'review_bridge_professional_access');
  assert.match(review, /p_verification_status in \('suspended','revoked'\)/i);
  assert.match(review, /update public\.bridge_case_assignments/i);
  assert.match(review, /set status = 'revoked'/i);
  assert.match(review, /update public\.bridge_family_visit_sessions/i);
  assert.match(review, /set state = 'revoked'/i);
});

test('assignment revocation preserves the assignment mutation receipt even when no session row changes', () => {
  const revoke = functionBlock(hardening, 'revoke_bridge_case_assignment');
  assert.match(revoke, /v_revoked boolean := false/i);
  assert.match(revoke, /v_revoked := found/i);
  assert.match(revoke, /if v_revoked then/i);
  assert.match(revoke, /return v_revoked/i);
});

test('raw markers and reflections remain submitter-only instead of becoming a shared dossier', () => {
  assert.match(hardening, /bridge_family_visit_markers_owner_select/i);
  assert.match(hardening, /bridge_family_visit_reflections_owner_select/i);
  assert.match(hardening, /actor_user_id = auth\.uid\(\)/i);
  assert.doesNotMatch(combined, /bridge_family_visit_markers_(parent|professional)_select/i);
  assert.doesNotMatch(combined, /bridge_family_visit_reflections_(parent|professional)_select/i);
});

test('parent and professional summaries are audience-isolated while teen transparency remains explicit', () => {
  const policyStart = hardening.indexOf('create policy bridge_family_visit_summaries_audience_select');
  assert.notEqual(policyStart, -1);
  const policy = hardening.slice(policyStart, hardening.indexOf('\n);', policyStart) + 3);
  assert.match(policy, /a\.teen_user_id = auth\.uid\(\)/i);
  assert.match(policy, /audience = 'parent'.*a\.parent_user_id = auth\.uid\(\)/is);
  assert.match(policy, /audience = 'professional'.*a\.professional_user_id = auth\.uid\(\)/is);
  assert.match(policy, /verification_status = 'verified'/i);
});

test('authenticated clients cannot directly mutate family visit tables', () => {
  for (const table of [
    'bridge_professional_profiles',
    'bridge_case_assignments',
    'bridge_family_visit_sessions',
    'bridge_family_visit_markers',
    'bridge_family_visit_reflections',
    'bridge_family_visit_summaries',
  ]) {
    assert.match(contract, new RegExp(`revoke insert, update, delete on table public\\.${table} from authenticated`, 'i'));
  }
});

test('participant submissions accept constrained enums only, never a narrative field', () => {
  const marker = functionBlock(hardening, 'record_bridge_family_visit_marker');
  const reflection = functionBlock(hardening, 'submit_bridge_family_visit_reflection');
  assert.match(marker, /p_marker_key not in \(/i);
  assert.match(reflection, /professional reflection must use only review_signal/i);
  assert.match(reflection, /invalid participant reflection/i);
  assert.doesNotMatch(`${marker}\n${reflection}`, /p_(text|body|message|note|transcript)/i);
});
