// supabase/functions/account-delete/index.ts
// Se'kret Bip — delayed account deletion processor for project tbsevonvegdnlyjgplmm.
//
// This endpoint is intentionally not user-callable. It is invoked by a trusted
// admin job after the seven-day grace period has expired.
//
// Required secrets:
//   ACCOUNT_DELETION_PROCESS_SECRET
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Deploy with JWT verification disabled because this processor authenticates
// with x-account-deletion-secret instead of a user session.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PROCESS_SECRET = Deno.env.get('ACCOUNT_DELETION_PROCESS_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface DeleteRequestBody {
  requestId?: string;
}

interface DeletionRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'cancelled' | 'processing' | 'completed' | 'failed';
  scheduled_for: string;
}

interface StorageCleanupResult {
  bucketNames: string[];
  objectsDeleted: number;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function listPrivateBucketNames(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin.storage.listBuckets();
  if (error) throw new Error(`storage_bucket_inventory_failed:${error.message}`);

  return (data ?? [])
    .filter(bucket => bucket.public !== true)
    .map(bucket => bucket.name)
    .filter(Boolean)
    .sort();
}

async function listFilesRecursively(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];
  const queue = [prefix];

  while (queue.length > 0) {
    const current = queue.shift()!;
    let offset = 0;

    while (true) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(current, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });

      if (error) {
        if (String(error.message).toLowerCase().includes('bucket not found')) break;
        throw new Error(`storage_list_failed:${bucket}`);
      }
      if (!data || data.length === 0) break;

      for (const item of data) {
        const path = current ? `${current}/${item.name}` : item.name;
        if (item.id) files.push(path);
        else queue.push(path);
      }

      if (data.length < 100) break;
      offset += data.length;
    }
  }

  return files;
}

async function removePrivateFiles(
  admin: SupabaseClient,
  userId: string,
): Promise<StorageCleanupResult> {
  const bucketNames = await listPrivateBucketNames(admin);
  let objectsDeleted = 0;

  for (const bucket of bucketNames) {
    const paths = await listFilesRecursively(admin, bucket, userId);

    for (let index = 0; index < paths.length; index += 100) {
      const batch = paths.slice(index, index + 100);
      const { error } = await admin.storage.from(bucket).remove(batch);
      if (error) throw new Error(`storage_remove_failed:${bucket}`);
      objectsDeleted += batch.length;
    }
  }

  return { bucketNames, objectsDeleted };
}

function isMissingRelationError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = String(error.message ?? '').toLowerCase();
  return error.code === 'PGRST205' || message.includes('could not find the table');
}

async function clearDeletionBlockers(admin: SupabaseClient, userId: string): Promise<void> {
  const blockers = [
    { table: 'control_room_issue_history', column: 'changed_by' },
    { table: 'control_room_issues', column: 'resolved_by' },
  ] as const;

  for (const blocker of blockers) {
    const { error } = await admin
      .from(blocker.table)
      .update({ [blocker.column]: null })
      .eq(blocker.column, userId);

    if (error && !isMissingRelationError(error)) {
      throw new Error(`deletion_reference_cleanup_failed:${blocker.table}.${blocker.column}`);
    }
  }
}

async function prepareReceipt(
  admin: SupabaseClient,
  requestId: string,
  userIdHash: string,
  cleanup: StorageCleanupResult,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from('account_deletion_receipts')
    .upsert({
      request_id: requestId,
      user_id_hash: userIdHash,
      status: 'processing',
      storage_buckets: cleanup.bucketNames,
      storage_objects_deleted: cleanup.objectsDeleted,
      failure_reason: null,
      updated_at: now,
    }, { onConflict: 'request_id' });

  if (error) throw new Error(`deletion_receipt_prepare_failed:${error.message}`);
}

async function completeReceipt(admin: SupabaseClient, requestId: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { error } = await admin
    .from('account_deletion_receipts')
    .update({
      status: 'completed',
      completed_at: now,
      updated_at: now,
      failure_reason: null,
    })
    .eq('request_id', requestId)
    .eq('status', 'processing');

  if (error) {
    console.error('[account-delete] receipt completion failed:', error.message);
    return false;
  }
  return true;
}

async function failReceipt(
  admin: SupabaseClient,
  requestId: string,
  reason: string,
): Promise<void> {
  await admin
    .from('account_deletion_receipts')
    .update({
      status: 'failed',
      failure_reason: reason.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq('request_id', requestId)
    .eq('status', 'processing');
}

async function markFailed(
  admin: SupabaseClient,
  requestId: string,
  reason: string,
): Promise<void> {
  await admin
    .from('account_deletion_requests')
    .update({ status: 'failed', failure_reason: reason.slice(0, 500) })
    .eq('id', requestId)
    .eq('status', 'processing');
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const suppliedSecret = req.headers.get('x-account-deletion-secret') ?? '';
  if (!PROCESS_SECRET || suppliedSecret !== PROCESS_SECRET) {
    return json({ error: 'unauthorized' }, 401);
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: 'server_config' }, 500);
  }

  let body: DeleteRequestBody;
  try {
    body = (await req.json()) as DeleteRequestBody;
  } catch {
    return json({ error: 'bad_json' }, 400);
  }

  const requestId = body.requestId?.trim() ?? '';
  if (!isUuid(requestId)) return json({ error: 'invalid_request_id' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: deletionRequest, error: lookupError } = await admin
    .from('account_deletion_requests')
    .select('id,user_id,status,scheduled_for')
    .eq('id', requestId)
    .maybeSingle<DeletionRequest>();

  if (lookupError) return json({ error: 'request_lookup_failed' }, 500);
  if (!deletionRequest) return json({ error: 'request_not_found' }, 404);
  if (deletionRequest.status !== 'pending') {
    return json({ error: 'request_not_pending' }, 409);
  }

  const scheduledAt = Date.parse(deletionRequest.scheduled_for);
  if (!Number.isFinite(scheduledAt)) return json({ error: 'invalid_schedule' }, 500);
  if (scheduledAt > Date.now()) return json({ error: 'grace_period_active' }, 409);

  const { data: claimed, error: claimError } = await admin
    .from('account_deletion_requests')
    .update({ status: 'processing', failure_reason: null })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (claimError) return json({ error: 'request_claim_failed' }, 500);
  if (!claimed) return json({ error: 'request_already_claimed' }, 409);

  const userId = deletionRequest.user_id;
  let receiptPrepared = false;

  try {
    const cleanup = await removePrivateFiles(admin, userId);
    await clearDeletionBlockers(admin, userId);

    // The live schema uses SET NULL for crew_members.member_user_id. Remove the
    // accepted display row so a deleted person's real name is not retained.
    const { error: crewError } = await admin
      .from('crew_members')
      .delete()
      .eq('member_user_id', userId);
    if (crewError) throw new Error('crew_member_cleanup_failed');

    await prepareReceipt(admin, requestId, await sha256(userId), cleanup);
    receiptPrepared = true;

    // Remaining account-owned rows cascade from auth.users in the live project.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw new Error(`auth_delete_failed:${deleteError.message}`);

    const receiptCompleted = await completeReceipt(admin, requestId);

    return json({
      ok: true,
      requestId,
      storageBucketsChecked: cleanup.bucketNames,
      storageObjectsDeleted: cleanup.objectsDeleted,
      receiptStatus: receiptCompleted ? 'completed' : 'processing',
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'account_delete_failed';
    if (receiptPrepared) await failReceipt(admin, requestId, reason);
    await markFailed(admin, requestId, reason);
    return json({ error: reason }, 500);
  }
});
