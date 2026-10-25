-- Parent Circle V2 reaction vocabulary.
-- Keep this additive enum change in its own migration: PostgreSQL requires a
-- commit boundary before later migrations safely use newly-added enum values.

alter type public.reaction_kind add value if not exists 'beenThere';
alter type public.reaction_kind add value if not exists 'solidarity';
alter type public.reaction_kind add value if not exists 'reminder';
alter type public.reaction_kind add value if not exists 'needed';
alter type public.reaction_kind add value if not exists 'strength';
