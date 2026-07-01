-- §6 decision: alter reaction_kind to add the app's real UI reaction keys,
-- rather than an app-layer mapping. Low-risk: post_reactions is empty (0
-- rows, confirmed), and ALTER TYPE ... ADD VALUE is purely additive -
-- existing values (hug/heart/listen/support/spark) are left in place,
-- just unused going forward.
--
-- Teen keys match legacy circle_posts.reactions jsonb default
-- ('{"felt":0,"comfort":0,"proud":0,"stay":0}', 0001_init.sql).
-- Parent keys match legacy parent_circle_posts.reactions jsonb default
-- ('{"beenThere":0,"solidarity":0,"reminder":0,"needed":0,"strength":0}',
-- 0004_supplemental_tables.sql).
--
-- Applied to tbsevonvegdnlyjgplmm via apply_migration on 2026-07-01;
-- this file brings the repo migration history in line with that.

alter type public.reaction_kind add value if not exists 'felt';
alter type public.reaction_kind add value if not exists 'comfort';
alter type public.reaction_kind add value if not exists 'proud';
alter type public.reaction_kind add value if not exists 'stay';
alter type public.reaction_kind add value if not exists 'beenThere';
alter type public.reaction_kind add value if not exists 'solidarity';
alter type public.reaction_kind add value if not exists 'reminder';
alter type public.reaction_kind add value if not exists 'needed';
alter type public.reaction_kind add value if not exists 'strength';
