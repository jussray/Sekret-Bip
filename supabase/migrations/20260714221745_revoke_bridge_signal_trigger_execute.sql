-- record_bridge_signal_activity is a trigger-only SECURITY DEFINER function.
-- Client roles do not need direct EXECUTE permission; the bridge_signals trigger
-- continues to invoke it when an authorized row insert succeeds.

begin;

revoke all on function public.record_bridge_signal_activity()
  from public, anon, authenticated;

comment on function public.record_bridge_signal_activity() is
  'Trigger-only metadata activity recorder for bridge_signals. Direct client EXECUTE is intentionally revoked.';

commit;
