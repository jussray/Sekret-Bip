begin;

-- Circle moderation: report a post. Reporting is intentionally the only
-- moderation primitive wired to the client this pass — every Circle post
-- (public, friends, crew, and parent) is rendered without an author
-- identity (see types/circle.ts: "Public post: user_id is NEVER exposed to
-- the UI"), so a client-side block-by-user feature is not safely buildable
-- without a separate identity-exposure change. See types/circle.ts's
-- ReportedPost interface for the shape this table implements.

create table if not exists public.reported_posts (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  post_id bigint not null,
  post_type text not null check (post_type in ('public', 'friends', 'crew', 'parent')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists reported_posts_post_idx
  on public.reported_posts(post_type, post_id);

alter table public.reported_posts enable row level security;

-- Reporters may file and read back their own reports. No one else may
-- read this table from the client — moderation review happens through
-- founder/admin tooling with a service-role key, not client RLS.
drop policy if exists reported_posts_reporter_insert on public.reported_posts;
create policy reported_posts_reporter_insert on public.reported_posts
for insert to authenticated
with check (auth.uid() = reporter_id);

drop policy if exists reported_posts_reporter_select on public.reported_posts;
create policy reported_posts_reporter_select on public.reported_posts
for select to authenticated
using (auth.uid() = reporter_id);

commit;
