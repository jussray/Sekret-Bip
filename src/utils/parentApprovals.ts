// src/utils/parentApprovals.ts
//
// Parent-side data layer for the chore/task and reward-redemption approval
// flow. The reward schema currently has two compatible database lineages:
// production uses rewards + reward_redemptions.user_id, while clean replay
// uses reward_catalog + reward_redemptions.teen_id. Reads normalize both to
// one client shape while the RPC boundary owns authorization and mutations.

import { getSupabase } from './supabase';

async function uid(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

export type BipTaskCategory = 'home' | 'school' | 'self_care' | 'growth' | 'habit' | 'custom';

export interface BipTask {
  id: string;
  teen_id: string;
  title: string;
  description: string | null;
  category: BipTaskCategory;
  point_value: number;
  requires_approval: boolean;
  status: 'active' | 'submitted' | 'rejected' | 'completed' | 'cancelled' | 'expired';
  created_at: string;
}

export interface PendingTaskSubmission {
  id: string;
  task_id: string;
  teen_id: string;
  note: string | null;
  evidence_url: string | null;
  submitted_at: string;
  task: BipTask | null;
}

export interface RewardCatalogItem {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  category: 'digital' | 'merch' | 'experience' | 'custom' | null;
  point_cost: number;
  fulfillment_type: 'manual' | 'digital' | 'shopify' | null;
}

export interface PendingRewardRedemption {
  id: string;
  teen_id: string;
  reward_id: string;
  point_cost: number;
  requested_at: string;
  reward: RewardCatalogItem | null;
}

export async function fetchParentTasks(teenId: string): Promise<BipTask[]> {
  const sb = getSupabase();
  if (!sb || !teenId) return [];
  const { data } = await sb
    .from('bip_tasks')
    .select('id, teen_id, title, description, category, point_value, requires_approval, status, created_at')
    .eq('teen_id', teenId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as BipTask[];
}

export async function fetchPendingTaskSubmissions(teenId: string): Promise<PendingTaskSubmission[]> {
  const sb = getSupabase();
  if (!sb || !teenId) return [];
  const { data } = await sb
    .from('task_submissions')
    .select('id, task_id, teen_id, note, evidence_url, submitted_at, task:bip_tasks(id, teen_id, title, description, category, point_value, requires_approval, status, created_at)')
    .eq('teen_id', teenId)
    .eq('status', 'pending')
    .order('submitted_at', { ascending: false });
  return (data ?? []).map((row: any) => ({
    ...row,
    task: Array.isArray(row.task) ? row.task[0] ?? null : row.task ?? null,
  })) as PendingTaskSubmission[];
}

function normalizeReward(value: any): RewardCatalogItem | null {
  const reward = Array.isArray(value) ? value[0] ?? null : value ?? null;
  if (!reward) return null;
  return {
    id: String(reward.id),
    slug: typeof reward.slug === 'string' ? reward.slug : null,
    name: typeof reward.name === 'string' && reward.name.trim() ? reward.name : 'Reward',
    description: typeof reward.description === 'string' ? reward.description : null,
    category: ['digital', 'merch', 'experience', 'custom'].includes(reward.category)
      ? reward.category
      : null,
    point_cost: Number.isFinite(Number(reward.point_cost)) ? Number(reward.point_cost) : 0,
    fulfillment_type: ['manual', 'digital', 'shopify'].includes(reward.fulfillment_type)
      ? reward.fulfillment_type
      : null,
  };
}

export async function fetchPendingRewardRedemptions(teenId: string): Promise<PendingRewardRedemption[]> {
  const sb = getSupabase();
  if (!sb || !teenId) return [];

  // Query both known schema lineages. One side will normally return a schema
  // error; the other is authorized only for the active linked parent. Running
  // both keeps a single app binary compatible during the migration window.
  const [liveResult, replayResult] = await Promise.all([
    sb
      .from('reward_redemptions')
      .select('id, user_id, reward_id, point_cost, requested_at, reward:rewards(id, name, description, point_cost)')
      .eq('user_id', teenId)
      .eq('status', 'pending_parent')
      .order('requested_at', { ascending: false }),
    sb
      .from('reward_redemptions')
      .select('id, teen_id, reward_id, point_cost, requested_at, reward:reward_catalog(id, slug, name, description, category, point_cost, fulfillment_type)')
      .eq('teen_id', teenId)
      .eq('status', 'pending_parent')
      .order('requested_at', { ascending: false }),
  ]);

  const rows = new Map<string, PendingRewardRedemption>();

  for (const row of liveResult.data ?? []) {
    const normalized: PendingRewardRedemption = {
      id: String((row as any).id),
      teen_id: String((row as any).user_id),
      reward_id: String((row as any).reward_id),
      point_cost: Number((row as any).point_cost) || 0,
      requested_at: String((row as any).requested_at),
      reward: normalizeReward((row as any).reward),
    };
    rows.set(normalized.id, normalized);
  }

  for (const row of replayResult.data ?? []) {
    const normalized: PendingRewardRedemption = {
      id: String((row as any).id),
      teen_id: String((row as any).teen_id),
      reward_id: String((row as any).reward_id),
      point_cost: Number((row as any).point_cost) || 0,
      requested_at: String((row as any).requested_at),
      reward: normalizeReward((row as any).reward),
    };
    rows.set(normalized.id, normalized);
  }

  return [...rows.values()].sort((a, b) => b.requested_at.localeCompare(a.requested_at));
}

export async function createBipTask(params: {
  teenId: string;
  title: string;
  description?: string;
  category: BipTaskCategory;
  pointValue: number;
  requiresApproval?: boolean;
}): Promise<boolean> {
  const sb = getSupabase();
  const parentId = await uid();
  if (!sb || !parentId || !params.teenId || !params.title.trim()) return false;
  const { error } = await sb.from('bip_tasks').insert({
    teen_id: params.teenId,
    created_by: parentId,
    created_by_role: 'parent',
    title: params.title.trim(),
    description: params.description?.trim() || null,
    category: params.category,
    point_value: Math.max(0, Math.min(10000, Math.round(params.pointValue))),
    requires_approval: params.requiresApproval ?? true,
  });
  return !error;
}

export async function reviewTaskSubmission(
  submissionId: string,
  approve: boolean,
  reviewNote?: string,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.rpc('review_task_submission', {
    p_submission_id: submissionId,
    p_approve: approve,
    p_review_note: reviewNote ?? null,
  });
  return !error;
}

export async function reviewRewardRedemption(
  redemptionId: string,
  approve: boolean,
  reviewNote?: string,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.rpc('review_reward_redemption', {
    p_redemption_id: redemptionId,
    p_approve: approve,
    p_review_note: reviewNote ?? null,
  });
  return !error;
}