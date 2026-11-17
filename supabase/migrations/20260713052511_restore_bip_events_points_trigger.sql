begin;

drop trigger if exists bip_events_award_points on public.bip_events;

create trigger bip_events_award_points
after insert on public.bip_events
for each row
execute function public.handle_bip_event_points();

comment on trigger bip_events_award_points on public.bip_events is
  'Awards server-owned Bip points for eligible minimal app activity events.';

commit;
