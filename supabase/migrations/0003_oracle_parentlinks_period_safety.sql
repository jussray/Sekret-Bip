-- 0003_oracle_parentlinks_period_safety.sql
-- Se'kret Bip — Phase 3 tables + verified hidden Circle V2 baseline.
-- All tables use auth.uid() RLS so anon sessions are fully scoped.
--
-- parent_links includes verified historical preconditions that existed in
-- production before the recorded 20260628235058 migration ran. The Circle V2
-- baseline below reconstructs live UUID/enums/tables/policies that exist in
-- production but have no creator in supabase_migrations.schema_migrations.

CREATE TABLE IF NOT EXISTS public.oracle_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  personality_id text NOT NULL,
  memory jsonb NOT NULL DEFAULT '{}',
  session_count integer NOT NULL DEFAULT 0,
  last_synced timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, personality_id)
);
ALTER TABLE public.oracle_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "oracle_sessions: owner read" ON public.oracle_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "oracle_sessions: owner insert" ON public.oracle_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "oracle_sessions: owner update" ON public.oracle_sessions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "oracle_sessions: owner delete" ON public.oracle_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.parent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teen_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  invite_code text UNIQUE,
  expires_at timestamptz
);
ALTER TABLE public.parent_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parent_links: teen owner" ON public.parent_links FOR ALL USING (auth.uid() = teen_user_id) WITH CHECK (auth.uid() = teen_user_id);
CREATE POLICY "parent_links: parent read" ON public.parent_links FOR SELECT USING (auth.uid() = parent_user_id);
CREATE POLICY "parent_links: parent accept" ON public.parent_links FOR UPDATE USING (auth.uid() = parent_user_id) WITH CHECK (status = 'active');
CREATE POLICY "parent_links: code lookup" ON public.parent_links FOR SELECT USING (status = 'pending' AND expires_at > now());

CREATE TABLE IF NOT EXISTS public.period_days (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);
ALTER TABLE public.period_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "period_days: owner all" ON public.period_days FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.safety_alerts (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  content_preview text,
  source_table text,
  source_id text,
  severity text NOT NULL DEFAULT 'low',
  reviewed_by_parent boolean NOT NULL DEFAULT false,
  parent_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "safety_alerts: teen read" ON public.safety_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "safety_alerts: linked parent read" ON public.safety_alerts FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.parent_links pl
    WHERE pl.teen_user_id = safety_alerts.user_id
      AND pl.parent_user_id = auth.uid()
      AND pl.status = 'active'
  )
);
CREATE POLICY "safety_alerts: linked parent update reviewed" ON public.safety_alerts FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.parent_links pl
    WHERE pl.teen_user_id = safety_alerts.user_id
      AND pl.parent_user_id = auth.uid()
      AND pl.status = 'active'
  )
);

-- Hidden Circle V2 baseline. Production contains these objects, but its
-- migration ledger has no CREATE TYPE/CREATE TABLE migration for them. This
-- block mirrors the verified UUID V2 bootstrap so later recorded migrations can
-- evolve the schema in the same order as production.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'circle_kind'
  ) THEN
    CREATE TYPE public.circle_kind AS ENUM ('public','friends','crew','parent');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 60),
  description text,
  max_members integer NOT NULL DEFAULT 15 CHECK (max_members BETWEEN 2 AND 15),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.circles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind public.circle_kind NOT NULL,
  crew_id uuid REFERENCES public.crews(id) ON DELETE CASCADE,
  parent_link_id uuid REFERENCES public.parent_links(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT circles_kind_shape CHECK (
    (kind = 'crew' AND crew_id IS NOT NULL AND parent_link_id IS NULL)
    OR (kind = 'parent' AND parent_link_id IS NOT NULL AND crew_id IS NULL)
    OR (kind IN ('public','friends') AND crew_id IS NULL AND parent_link_id IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.circle_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.friendships (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_user_id),
  CONSTRAINT friendships_no_self CHECK (user_id <> friend_user_id)
);

CREATE TABLE IF NOT EXISTS public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circle_id uuid NOT NULL REFERENCES public.circles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
  mood_tag text,
  content_warning text,
  is_identity_revealed boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS circles_owner_public_uniq ON public.circles(owner_user_id, kind) WHERE kind = 'public';
CREATE UNIQUE INDEX IF NOT EXISTS circles_owner_friends_uniq ON public.circles(owner_user_id, kind) WHERE kind = 'friends';
CREATE UNIQUE INDEX IF NOT EXISTS circles_owner_crew_uniq ON public.circles(owner_user_id, crew_id) WHERE kind = 'crew';
CREATE UNIQUE INDEX IF NOT EXISTS circles_owner_parent_uniq ON public.circles(owner_user_id, parent_link_id) WHERE kind = 'parent';
CREATE INDEX IF NOT EXISTS posts_circle_created_idx ON public.posts(circle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_author_created_idx ON public.posts(author_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS circle_members_user_idx ON public.circle_members(user_id, circle_id);
CREATE INDEX IF NOT EXISTS friendships_friend_idx ON public.friendships(friend_user_id, user_id);
CREATE INDEX IF NOT EXISTS crews_owner_idx ON public.crews(owner_user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_circle_post_rules()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_kind public.circle_kind;
  v_owner uuid;
  v_is_member boolean;
BEGIN
  SELECT kind, owner_user_id INTO v_kind, v_owner
  FROM public.circles WHERE id = NEW.circle_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Circle not found'; END IF;
  IF v_kind = 'parent' THEN RAISE EXCEPTION 'Parent bridge is not a post destination'; END IF;
  IF v_kind IN ('public','friends') THEN
    IF NEW.author_user_id <> v_owner THEN
      RAISE EXCEPTION 'Users can only post to their own % circle', v_kind;
    END IF;
    RETURN NEW;
  END IF;
  IF v_kind = 'crew' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.circle_members cm
      WHERE cm.circle_id = NEW.circle_id AND cm.user_id = NEW.author_user_id
    ) INTO v_is_member;
    IF NOT v_is_member THEN RAISE EXCEPTION 'Only crew members can post to this crew circle'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_crew_member_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_crew_id uuid;
  v_max_members integer;
  v_count integer;
BEGIN
  SELECT c.crew_id INTO v_crew_id
  FROM public.circles c
  WHERE c.id = NEW.circle_id AND c.kind = 'crew';
  IF v_crew_id IS NULL THEN RETURN NEW; END IF;
  SELECT max_members INTO v_max_members FROM public.crews WHERE id = v_crew_id;
  SELECT count(*) INTO v_count FROM public.circle_members WHERE circle_id = NEW.circle_id;
  IF v_count >= v_max_members THEN RAISE EXCEPTION 'Crew member limit reached'; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crews_updated_at ON public.crews;
CREATE TRIGGER trg_crews_updated_at BEFORE UPDATE ON public.crews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_circles_updated_at ON public.circles;
CREATE TRIGGER trg_circles_updated_at BEFORE UPDATE ON public.circles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_posts_circle_rules ON public.posts;
CREATE TRIGGER trg_posts_circle_rules BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.enforce_circle_post_rules();
DROP TRIGGER IF EXISTS trg_circle_members_limit ON public.circle_members;
CREATE TRIGGER trg_circle_members_limit BEFORE INSERT ON public.circle_members FOR EACH ROW EXECUTE FUNCTION public.enforce_crew_member_limit();

ALTER TABLE public.crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.circle_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crews select own or member" ON public.crews;
CREATE POLICY "crews select own or member" ON public.crews FOR SELECT TO authenticated USING (
  owner_user_id = (SELECT auth.uid()) OR id IN (
    SELECT c.crew_id FROM public.circles c JOIN public.circle_members cm ON cm.circle_id = c.id
    WHERE c.kind = 'crew' AND c.crew_id IS NOT NULL AND cm.user_id = (SELECT auth.uid())
  )
);
DROP POLICY IF EXISTS "crews insert own" ON public.crews;
CREATE POLICY "crews insert own" ON public.crews FOR INSERT TO authenticated WITH CHECK (owner_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "crews update own" ON public.crews;
CREATE POLICY "crews update own" ON public.crews FOR UPDATE TO authenticated USING (owner_user_id = (SELECT auth.uid())) WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "circles select owner or member" ON public.circles;
CREATE POLICY "circles select owner or member" ON public.circles FOR SELECT TO authenticated USING (
  owner_user_id = (SELECT auth.uid())
  OR id IN (SELECT cm.circle_id FROM public.circle_members cm WHERE cm.user_id = (SELECT auth.uid()))
  OR kind = 'public'
);
DROP POLICY IF EXISTS "circles insert own" ON public.circles;
CREATE POLICY "circles insert own" ON public.circles FOR INSERT TO authenticated WITH CHECK (owner_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "circles update own" ON public.circles;
CREATE POLICY "circles update own" ON public.circles FOR UPDATE TO authenticated USING (owner_user_id = (SELECT auth.uid())) WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "circle members select own circles" ON public.circle_members;
CREATE POLICY "circle members select own circles" ON public.circle_members FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid()) OR circle_id IN (SELECT id FROM public.circles WHERE owner_user_id = (SELECT auth.uid()))
);
DROP POLICY IF EXISTS "circle members insert owner only" ON public.circle_members;
CREATE POLICY "circle members insert owner only" ON public.circle_members FOR INSERT TO authenticated WITH CHECK (
  circle_id IN (SELECT id FROM public.circles WHERE owner_user_id = (SELECT auth.uid()))
);
DROP POLICY IF EXISTS "circle members delete owner only" ON public.circle_members;
CREATE POLICY "circle members delete owner only" ON public.circle_members FOR DELETE TO authenticated USING (
  circle_id IN (SELECT id FROM public.circles WHERE owner_user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "friendships select own" ON public.friendships;
CREATE POLICY "friendships select own" ON public.friendships FOR SELECT TO authenticated USING (
  user_id = (SELECT auth.uid()) OR friend_user_id = (SELECT auth.uid())
);
DROP POLICY IF EXISTS "friendships insert own side" ON public.friendships;
CREATE POLICY "friendships insert own side" ON public.friendships FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "friendships delete own side" ON public.friendships;
CREATE POLICY "friendships delete own side" ON public.friendships FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "posts select by circle visibility" ON public.posts;
CREATE POLICY "posts select by circle visibility" ON public.posts FOR SELECT TO authenticated USING (
  author_user_id = (SELECT auth.uid())
  OR circle_id IN (SELECT c.id FROM public.circles c WHERE c.kind = 'public')
  OR circle_id IN (
    SELECT c.id FROM public.circles c
    WHERE c.kind = 'friends'
      AND c.owner_user_id IN (
        SELECT f1.friend_user_id
        FROM public.friendships f1
        JOIN public.friendships f2 ON f1.user_id = f2.friend_user_id AND f1.friend_user_id = f2.user_id
        WHERE f1.user_id = (SELECT auth.uid())
      )
  )
  OR circle_id IN (SELECT cm.circle_id FROM public.circle_members cm WHERE cm.user_id = (SELECT auth.uid()))
);
DROP POLICY IF EXISTS "posts insert by author" ON public.posts;
CREATE POLICY "posts insert by author" ON public.posts FOR INSERT TO authenticated WITH CHECK (author_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "posts update own" ON public.posts;
CREATE POLICY "posts update own" ON public.posts FOR UPDATE TO authenticated USING (author_user_id = (SELECT auth.uid())) WITH CHECK (author_user_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "posts delete own" ON public.posts;
CREATE POLICY "posts delete own" ON public.posts FOR DELETE TO authenticated USING (author_user_id = (SELECT auth.uid()));
