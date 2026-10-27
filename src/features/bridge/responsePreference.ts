import AsyncStorage from '@react-native-async-storage/async-storage';

export type BridgeResponsePreference =
  | 'listen'
  | 'comfort'
  | 'help_plan'
  | 'check_later'
  | 'give_space';

export const BRIDGE_RESPONSE_PREFERENCE_KEY = 'sekretbip_bridge_response_preference_v1';

export const BRIDGE_RESPONSE_PREFERENCES: Array<{
  key: BridgeResponsePreference;
  emoji: string;
  teenLabel: string;
  parentLabel: string;
  hint: string;
}> = [
  {
    key: 'listen',
    emoji: '👂',
    teenLabel: 'just listen',
    parentLabel: 'Listen first. Do not rush to solve it.',
    hint: 'I want to be heard before we figure anything out.',
  },
  {
    key: 'comfort',
    emoji: '🫂',
    teenLabel: 'comfort me',
    parentLabel: 'Lead with comfort and reassurance.',
    hint: 'I need warmth more than advice right now.',
  },
  {
    key: 'help_plan',
    emoji: '🧭',
    teenLabel: 'help me plan',
    parentLabel: 'Help make one small, realistic plan.',
    hint: 'I am ready for help deciding what to do next.',
  },
  {
    key: 'check_later',
    emoji: '⏳',
    teenLabel: 'check later',
    parentLabel: 'Acknowledge it now, then check back later.',
    hint: 'Please do not make me explain everything immediately.',
  },
  {
    key: 'give_space',
    emoji: '🌙',
    teenLabel: 'give me space',
    parentLabel: 'Respect the space request while staying available.',
    hint: 'I want you to know, but I need breathing room.',
  },
];

export function getBridgeResponsePreference(
  key: BridgeResponsePreference | null | undefined,
) {
  return BRIDGE_RESPONSE_PREFERENCES.find(item => item.key === key) ?? null;
}

export async function loadBridgeResponsePreference(): Promise<BridgeResponsePreference | null> {
  try {
    const value = await AsyncStorage.getItem(BRIDGE_RESPONSE_PREFERENCE_KEY);
    return BRIDGE_RESPONSE_PREFERENCES.some(item => item.key === value)
      ? value as BridgeResponsePreference
      : null;
  } catch {
    return null;
  }
}

export async function saveBridgeResponsePreference(
  preference: BridgeResponsePreference,
): Promise<void> {
  await AsyncStorage.setItem(BRIDGE_RESPONSE_PREFERENCE_KEY, preference);
}
