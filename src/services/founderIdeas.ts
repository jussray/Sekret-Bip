/**
 * src/services/founderIdeas.ts
 * Supabase-backed founder idea management for the Control Room.
 * Ideas live in the `founder_ideas` table, owner-scoped by RLS.
 */
import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';

export type IdeaStatus =
  | 'backlog'
  | 'researching'
  | 'planned'
  | 'building'
  | 'testing'
  | 'shipped'
  | 'paused'
  | 'rejected';

export interface FounderIdea {
  id: string;
  title: string;
  notes?: string;
  status: IdeaStatus;
  category?: string;
  priority?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateIdeaInput {
  title: string;
  status?: IdeaStatus;
  notes?: string;
  category?: string;
  priority?: number;
}

const VALID_STATUSES: IdeaStatus[] = [
  'backlog', 'researching', 'planned', 'building',
  'testing', 'shipped', 'paused', 'rejected',
];

function isValidStatus(s: unknown): s is IdeaStatus {
  return VALID_STATUSES.includes(s as IdeaStatus);
}

export const founderIdeasService = {
  /** Fetch all ideas for the signed-in founder, newest first. */
  async list(): Promise<FounderIdea[]> {
    if (!isSupabaseConfigured) return [];
    const sb = getSupabase();
    if (!sb) return [];

    const { data, error } = await sb
      .from('founder_ideas')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[founderIdeas] list error:', error.message);
      return [];
    }
    return (data ?? []) as FounderIdea[];
  },

  /** Create a new idea. */
  async create(input: CreateIdeaInput): Promise<FounderIdea | null> {
    if (!isSupabaseConfigured) return null;
    const sb = getSupabase();
    if (!sb) return null;

    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      console.warn('[founderIdeas] create: no authenticated user');
      return null;
    }

    const { data, error } = await sb
      .from('founder_ideas')
      .insert({
        user_id:  user.id,
        title:    input.title.trim(),
        notes:    input.notes ?? null,
        status:   input.status ?? 'backlog',
        category: input.category ?? null,
        priority: input.priority ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.warn('[founderIdeas] create error:', error.message);
      return null;
    }
    return data as FounderIdea;
  },

  /** Update an idea's status. */
  async updateStatus(id: string, status: IdeaStatus): Promise<boolean> {
    if (!isValidStatus(status)) {
      console.warn('[founderIdeas] invalid status:', status);
      return false;
    }
    if (!isSupabaseConfigured) return false;
    const sb = getSupabase();
    if (!sb) return false;

    const { error } = await sb
      .from('founder_ideas')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[founderIdeas] updateStatus error:', error.message);
      return false;
    }
    return true;
  },

  /** Update notes on an existing idea. */
  async updateNotes(id: string, notes: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const sb = getSupabase();
    if (!sb) return false;

    const { error } = await sb
      .from('founder_ideas')
      .update({ notes: notes.trim(), updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.warn('[founderIdeas] updateNotes error:', error.message);
      return false;
    }
    return true;
  },

  /** Delete an idea permanently. */
  async remove(id: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const sb = getSupabase();
    if (!sb) return false;

    const { error } = await sb
      .from('founder_ideas')
      .delete()
      .eq('id', id);

    if (error) {
      console.warn('[founderIdeas] remove error:', error.message);
      return false;
    }
    return true;
  },
};
