import { isRelationshipFeatureAvailable } from '@/constants/relationshipFeatureFlags';
import type { BridgeSummaryListItem } from '@/types/bridgeSummary';
import type { BridgeSummaryContent, RelationshipResult } from '@/types/relationshipLayer';
import { getSupabase } from '@/utils/supabase';

interface ParentRequestRow { id: string; teen_user_id: string; parent_user_id: string; status: 'ready' | 'viewed'; expires_at: string | null; }
interface ParentSummaryRow { id: string; request_id: string; themes: string[] | null; conversation_starters: string[] | null; limitations: string; generated_at: string; used_fallback: boolean; }
interface ParentViewRow { summary_id: string; viewed_at: string; }

function unavailable<T>(): RelationshipResult<T> {
  return { ok: false, code: 'not_configured', message: 'Bridge Summaries are not available yet.' };
}

function readFailure<T>(): RelationshipResult<T> {
  return { ok: false, code: 'server_error', message: 'Couldn’t load Bridge Summaries right now. Try again.' };
}

function writeFailure<T>(): RelationshipResult<T> {
  return { ok: false, code: 'server_error', message: 'Couldn’t update Bridge Summary status right now. Try again.' };
}

export async function fetchParentBridgeSummaryInbox(audience: 'founder' | 'internal' | 'beta' | 'public' = 'public'): Promise<RelationshipResult<BridgeSummaryListItem[]>> {
  if (!isRelationshipFeatureAvailable('bridgeSummaries', audience)) return unavailable();
  const sb = getSupabase();
  if (!sb) return unavailable();

  try {
    const { data: requests, error: requestError } = await sb
      .from('bridge_share_requests')
      .select('id,teen_user_id,parent_user_id,status,expires_at')
      .in('status', ['ready', 'viewed'])
      .order('created_at', { ascending: false });
    if (requestError) return readFailure();

    const requestRows = (requests ?? []) as ParentRequestRow[];
    if (requestRows.length === 0) return { ok: true, value: [] };

    const requestIds = requestRows.map((row) => row.id);
    const [{ data: summaries, error: summaryError }, { data: views, error: viewError }] = await Promise.all([
      sb.from('bridge_summaries').select('id,request_id,themes,conversation_starters,limitations,generated_at,used_fallback').in('request_id', requestIds),
      sb.from('bridge_summary_views').select('summary_id,viewed_at'),
    ]);
    if (summaryError || viewError) return readFailure();

    const summariesByRequest = new Map((summaries ?? []).map((row) => {
      const summary = row as ParentSummaryRow;
      return [summary.request_id, summary] as const;
    }));
    const viewsBySummary = new Map((views ?? []).map((row) => {
      const view = row as ParentViewRow;
      return [view.summary_id, view.viewed_at] as const;
    }));
    const items: BridgeSummaryListItem[] = [];

    for (const request of requestRows) {
      const summary = summariesByRequest.get(request.id);
      if (!summary) continue;
      const content: BridgeSummaryContent = {
        themes: summary.themes ?? [],
        conversationStarters: summary.conversation_starters ?? [],
        limitations: summary.limitations,
      };
      items.push({
        requestId: request.id,
        summaryId: summary.id,
        teenUserId: request.teen_user_id,
        parentUserId: request.parent_user_id,
        status: request.status,
        summary: content,
        generatedAt: summary.generated_at,
        viewedAt: viewsBySummary.get(summary.id) ?? null,
        expiresAt: request.expires_at,
        usedFallback: summary.used_fallback,
      });
    }

    return { ok: true, value: items };
  } catch {
    return readFailure();
  }
}

export async function markBridgeSummaryViewed(summaryId: string, audience: 'founder' | 'internal' | 'beta' | 'public' = 'public'): Promise<RelationshipResult<{ viewed: boolean }>> {
  if (!isRelationshipFeatureAvailable('bridgeSummaries', audience)) return unavailable();
  const sb = getSupabase();
  if (!sb) return unavailable();

  try {
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError) return writeFailure();
    const parentUserId = userData?.user?.id;
    if (!parentUserId) return { ok: false, code: 'not_authenticated', message: 'Sign in to view Bridge summaries.' };

    const { data: existing, error: existingError } = await sb
      .from('bridge_summary_views')
      .select('summary_id')
      .eq('summary_id', summaryId)
      .eq('parent_user_id', parentUserId)
      .maybeSingle();
    if (existingError) return writeFailure();
    if (existing) return { ok: true, value: { viewed: true } };

    const { error: viewError } = await sb.from('bridge_summary_views').insert({
      summary_id: summaryId,
      parent_user_id: parentUserId,
    });
    if (viewError) return writeFailure();
    return { ok: true, value: { viewed: true } };
  } catch {
    return writeFailure();
  }
}
