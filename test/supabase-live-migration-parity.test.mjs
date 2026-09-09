import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const migrationsRoot = path.join(root, 'supabase', 'migrations');

const pointsFunctionPath = path.join(
  migrationsRoot,
  '20260704014518_create_bip_event_points_function.sql',
);
const pointsTriggerPath = path.join(
  migrationsRoot,
  '20260713052511_restore_bip_events_points_trigger.sql',
);
const notificationPath = path.join(
  migrationsRoot,
  '20260713052603_harden_notification_delivery_ledger.sql',
);
const staleNotificationPath = path.join(
  migrationsRoot,
  '20260713054000_harden_notification_delivery_ledger.sql',
);

const pointsFunction = fs.readFileSync(pointsFunctionPath, 'utf8');
const pointsTrigger = fs.readFileSync(pointsTriggerPath, 'utf8');
const notification = fs.readFileSync(notificationPath, 'utf8');

test('restored points function matches the live server-owned idempotent contract', () => {
  assert.match(pointsFunction, /create or replace function public\.handle_bip_event_points\(\)/i);
  assert.match(pointsFunction, /returns trigger/i);
  assert.match(pointsFunction, /security definer/i);
  assert.match(pointsFunction, /set search_path = public/i);
  assert.match(pointsFunction, /when 'journal_saved' then 5/i);
  assert.match(pointsFunction, /when 'crew_checkin' then 6/i);
  assert.match(
    pointsFunction,
    /where user_id = new\.user_id[\s\S]*source_type = 'app_action'[\s\S]*source_id = new\.id::text/i,
  );
  assert.match(pointsFunction, /insert into public\.point_transactions/i);
});

test('restored points trigger targets the live function and cannot double-wire the alternate function', () => {
  assert.match(pointsTrigger, /drop trigger if exists bip_events_award_points on public\.bip_events/i);
  assert.match(
    pointsTrigger,
    /create trigger bip_events_award_points[\s\S]*after insert on public\.bip_events[\s\S]*execute function public\.handle_bip_event_points\(\)/i,
  );
  assert.doesNotMatch(pointsTrigger, /award_points_for_bip_event/i);
});

test('notification hardening migration uses the exact live version and removes the stale filename', () => {
  assert.equal(fs.existsSync(notificationPath), true);
  assert.equal(fs.existsSync(staleNotificationPath), false);
  assert.match(notification, /create policy notification_deliveries_deny_clients/i);
  assert.match(notification, /grant select, insert on table public\.notification_deliveries/i);
  assert.match(notification, /grant usage on sequence public\.notification_deliveries_id_seq/i);
});
