-- Trigger helpers execute through their table triggers and do not need to be
-- directly callable by client roles.
revoke all on function public.uos_set_updated_at()
from public, anon, authenticated;
