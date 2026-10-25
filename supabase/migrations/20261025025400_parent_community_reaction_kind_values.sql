-- Parent Circle V2 hidden-baseline reconciliation.
--
-- Production already has reaction_kind, post_reactions, and post_comments.
-- Fresh replay only reconstructs circles/posts, so this migration creates the
-- missing V2 interaction objects only when absent. Existing production objects,
-- policies, grants, and rows are left untouched.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'reaction_kind'
  ) then
    create type public.reaction_kind as enum (
      'hug',
      'heart',
      'listen',
      'support',
      'spark',
      'felt',
      'comfort',
      'proud',
      'stay',
      'beenThere',
      'solidarity',
      'reminder',
      'needed',
      'strength'
    );
  end if;
end
$$;

alter type public.reaction_kind add value if not exists 'felt';
alter type public.reaction_kind add value if not exists 'comfort';
alter type public.reaction_kind add value if not exists 'proud';
alter type public.reaction_kind add value if not exists 'stay';
alter type public.reaction_kind add value if not exists 'beenThere';
alter type public.reaction_kind add value if not exists 'solidarity';
alter type public.reaction_kind add value if not exists 'reminder';
alter type public.reaction_kind add value if not exists 'needed';
alter type public.reaction_kind add value if not exists 'strength';

do $$
begin
  if to_regclass('public.post_reactions') is null then
    create table public.post_reactions (
      id uuid primary key default gen_random_uuid(),
      post_id uuid not null references public.posts(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      reaction public.reaction_kind not null,
      created_at timestamptz not null default now(),
      unique (post_id, user_id, reaction)
    );

    alter table public.post_reactions enable row level security;
    revoke all on table public.post_reactions from anon, authenticated;
    create index post_reactions_post_idx
      on public.post_reactions (post_id, created_at desc);
    create index post_reactions_user_idx
      on public.post_reactions (user_id, created_at desc);
  end if;

  if to_regclass('public.post_comments') is null then
    create table public.post_comments (
      id uuid primary key default gen_random_uuid(),
      post_id uuid not null references public.posts(id) on delete cascade,
      author_user_id uuid not null references auth.users(id) on delete cascade,
      body text not null
        check (char_length(trim(body)) between 1 and 2000),
      is_deleted boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    alter table public.post_comments enable row level security;
    revoke all on table public.post_comments from anon, authenticated;
    create index post_comments_post_idx
      on public.post_comments (post_id, created_at desc);
    create index post_comments_author_idx
      on public.post_comments (author_user_id, created_at desc);
  end if;
end
$$;
