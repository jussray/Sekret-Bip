/**
 * Dependency-free Supabase data access for Bridge summaries.
 *
 * The Worker handler injects the platform `fetch`; node:test injects a mocked
 * implementation. Keeping this module import-free makes the real URL, header,
 * ownership, persistence, and partial-source behavior directly testable.
 */

export interface BridgeSummaryStoreEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface BridgeShareRequestRow {
  id: string;
  teen_user_id: string;
  status: string;
  revoked_at: string | null;
  expires_at: string | null;
}

export interface BridgeShareSourceRow {
  source_kind: 'journal' | 'mood' | 'goal' | 'scrapbook';
  source_id: string;
}

export interface BridgeStoredSummary {
  themes: string[];
  conversationStarters: string[];
  limitations: string;
  promptVersion: string;
  model: string | null;
  usedFallback: boolean;
}

export type BridgeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function requireSupabase(env: BridgeSummaryStoreEnv): { url: string; key: string } {
  const url = env.SUPABASE_URL?.replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabase_not_configured');
  return { url, key };
}

function serviceHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

function uniqueIds(sources: BridgeShareSourceRow[], kind: BridgeShareSourceRow['source_kind']): string[] {
  return [...new Set(sources.filter((source) => source.source_kind === kind).map((source) => source.source_id.trim()).filter(Boolean))];
}

export function createBridgeSummaryStore(env: BridgeSummaryStoreEnv, fetchImpl: BridgeFetch = fetch) {
  async function fetchOwnedRequest(requestId: string, userId: string): Promise<BridgeShareRequestRow | null> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_share_requests?id=eq.${encodeURIComponent(requestId)}&teen_user_id=eq.${encodeURIComponent(userId)}&select=id,teen_user_id,status,revoked_at,expires_at`,
      { headers: serviceHeaders(key) },
    );
    if (!response.ok) throw new Error('request_lookup_failed');
    const rows = await response.json() as BridgeShareRequestRow[];
    return rows[0] ?? null;
  }

  async function patchRequestStatus(
    requestId: string,
    userId: string,
    status: 'ready' | 'failed',
    failureCode?: string,
  ): Promise<void> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_share_requests?id=eq.${encodeURIComponent(requestId)}&teen_user_id=eq.${encodeURIComponent(userId)}`,
      {
        method: 'PATCH',
        headers: { ...serviceHeaders(key), Prefer: 'return=minimal' },
        body: JSON.stringify({ status, failure_code: failureCode ?? null, updated_at: new Date().toISOString() }),
      },
    );
    if (!response.ok) throw new Error('request_status_update_failed');
  }

  async function upsertSummary(requestId: string, summary: BridgeStoredSummary): Promise<void> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(`${url}/rest/v1/bridge_summaries?on_conflict=request_id`, {
      method: 'POST',
      headers: { ...serviceHeaders(key), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        request_id: requestId,
        themes: summary.themes,
        conversation_starters: summary.conversationStarters,
        limitations: summary.limitations,
        prompt_version: summary.promptVersion,
        model: summary.model,
        used_fallback: summary.usedFallback,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error('summary_write_failed');
  }

  async function fetchShareSources(requestId: string): Promise<BridgeShareSourceRow[]> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_share_sources?request_id=eq.${encodeURIComponent(requestId)}&select=source_kind,source_id`,
      { headers: serviceHeaders(key) },
    );
    if (!response.ok) throw new Error('sources_lookup_failed');
    return await response.json() as BridgeShareSourceRow[];
  }

  /**
   * Fetches all selected supported sources or fails closed. A partial result is
   * never summarized as though it represented the complete teen selection.
   */
  async function fetchSourceContent(teenUserId: string, sources: BridgeShareSourceRow[]): Promise<string[]> {
    const { url, key } = requireSupabase(env);
    const unsupported = sources.filter((source) => !['journal', 'mood'].includes(source.source_kind));
    if (unsupported.length > 0) throw new Error('source_not_available');

    const snippets: string[] = [];
    const journalIds = uniqueIds(sources, 'journal');
    if (journalIds.length > 0) {
      const idList = journalIds.map((id) => encodeURIComponent(id)).join(',');
      const response = await fetchImpl(
        `${url}/rest/v1/journal_entries?user_id=eq.${encodeURIComponent(teenUserId)}&id=in.(${idList})&select=id,text,mood`,
        { headers: serviceHeaders(key) },
      );
      if (!response.ok) throw new Error('source_lookup_failed');
      const rows = await response.json() as Array<{ id: string; text: string; mood: string | null }>;
      const byId = new Map(rows.map((row) => [String(row.id), row]));
      for (const id of journalIds) {
        const row = byId.get(id);
        if (!row || typeof row.text !== 'string' || row.text.trim().length === 0) throw new Error('source_not_available');
        const mood = typeof row.mood === 'string' && row.mood.trim() ? row.mood.trim() : 'unspecified';
        snippets.push(`[journal entry, mood: ${mood}] ${row.text.trim()}`.slice(0, 2000));
      }
    }

    const moodIds = uniqueIds(sources, 'mood');
    if (moodIds.length > 0) {
      const idList = moodIds.map((id) => encodeURIComponent(id)).join(',');
      const response = await fetchImpl(
        `${url}/rest/v1/mood_history?user_id=eq.${encodeURIComponent(teenUserId)}&id=in.(${idList})&select=id,mood,date`,
        { headers: serviceHeaders(key) },
      );
      if (!response.ok) throw new Error('source_lookup_failed');
      const rows = await response.json() as Array<{ id: string; mood: string; date: string }>;
      const byId = new Map(rows.map((row) => [String(row.id), row]));
      for (const id of moodIds) {
        const row = byId.get(id);
        if (!row || typeof row.mood !== 'string' || row.mood.trim().length === 0 || typeof row.date !== 'string') {
          throw new Error('source_not_available');
        }
        snippets.push(`[mood check-in on ${row.date}] felt ${row.mood.trim()}`);
      }
    }

    if (snippets.length === 0) throw new Error('source_not_available');
    return snippets;
  }

  return Object.freeze({
    fetchOwnedRequest,
    patchRequestStatus,
    upsertSummary,
    fetchShareSources,
    fetchSourceContent,
  });
}
