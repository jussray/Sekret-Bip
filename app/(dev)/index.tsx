import { Redirect } from 'expo-router';

/**
 * /dev → /dev/control-room
 * Keeps a clean entry point for the group without duplicating
 * the DevControlRoomScreen re-export that lives in control-room.tsx.
 */
export default function DevIndex() {
  return <Redirect href="/dev/control-room" />;
}
