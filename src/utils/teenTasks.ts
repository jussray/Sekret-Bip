// src/utils/teenTasks.ts
//
// Teen-side data layer for chores a parent has set up. Pairs with
// src/utils/parentApprovals.ts on the parent side. A teen only ever sees
// their own bip_tasks rows (RLS: teen_id = auth.uid()) and can submit a
// task for approval via the submit_bip_task RPC — they cannot approve
// their own submission or touch anyone else's tasks.

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
export type BipTaskStatus = 'active' | 'submitted' | 'rejected' | 'completed' | 'cancelled' | 'expired';

export interface TeenTask {
  id: string;
  title: string;
  description: string | null;
  category: BipTaskCategory;
  point_value: number;
  requires_approval: boolean;
  status: BipTaskStatus;
  created_at: string;
}

export async function fetchMyTasks(): Promise<TeenTask[]> {
  const sb = getSupabase();
  const teenId = await uid();
  if (!sb || !teenId) return [];
  const { data } = await sb
    .from('bip_tasks')
    .select('id, title, description, category, point_value, requires_approval, status, created_at')
    .eq('teen_id', teenId)
    .in('status', ['active', 'submitted', 'rejected', 'completed'])
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []) as TeenTask[];
}

export async function submitTask(taskId: string, note?: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb || !taskId) return false;
  const { error } = await sb.rpc('submit_bip_task', {
    p_task_id: taskId,
    p_note: note?.trim() || null,
    p_evidence_url: null,
  });
  return !error;
}
