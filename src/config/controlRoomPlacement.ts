export const CONTROL_ROOM_ENTRY_ROUTE = 'app/(dev)/control-room.tsx';
export const CONTROL_ROOM_SCREEN_ENTRY = 'src/screens/DevControlRoomScreen.tsx';

export const CONTROL_ROOM_ALLOWED_PATHS = [
  'src/screens/DevControlRoomScreen.tsx',
  'src/screens/DevControlRoomWorkspace.tsx',
  'src/features/control-room/',
  'src/services/controlRoom',
  'src/config/controlRoom',
  'src/config/controlRoomVerificationRegistry.json',
  'src/types/controlRoom',
  'scripts/control-room-',
  'scripts/control-room-agent.mjs',
  'docs/CONTROL_ROOM',
] as const;

export const CONTROL_ROOM_FORBIDDEN_PATHS = [
  'control-room/',
  'apps/control-room/',
  'founder-os/',
  'operations-center/',
  '.agents/verification-registry.json',
] as const;

export const CONTROL_ROOM_PLACEMENT_RULES = [
  'One Control Room. More capability. No parallel system.',
  'Keep app/(dev)/control-room.tsx as the single founder entry point.',
  'Build UI in the existing DevControlRoom screen/workspace, then split only under src/features/control-room/.',
  'Build services, config, types, scripts, and docs only in the approved Control Room support paths.',
  'Keep the verification registry under src/config; never duplicate it under .agents/.',
  'Do not create a second dashboard route or standalone Control Room app without explicit approval.',
] as const;
