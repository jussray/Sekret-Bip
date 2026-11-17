import { Slot } from 'expo-router';

/**
 * (dev)/ layout — no build-time gate here by design.
 *
 * This used to redirect away whenever __DEV__ was false, which meant the
 * founder could never open their own Control Room in a production build —
 * the opposite of what a founder-only production tool needs. Every screen
 * under this group (DevControlRoomWorkspace, DevSplitViewScreen) already
 * performs its own async `isFounderProfile(getCurrentFounderProfile())`
 * check against Supabase (role + can_view_audits) and renders a locked
 * state for anyone else, in both dev and production. That per-screen
 * check is the real access boundary — this layout only renders the Slot.
 */
export default function DevLayout() {
  return <Slot />;
}
