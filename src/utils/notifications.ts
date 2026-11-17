import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSupabase } from '@/utils/supabase';
import type { CrewMember } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DAILY_REMINDER_ID = 'bip-daily-checkin';

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function scheduleDailyReminder(): Promise<void> {
  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'How are you feeling?',
      body: "Check in with your Se'kret. \u{1F49C}",
    },
    trigger: {
      hour: 20,
      minute: 0,
      repeats: true,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}

export async function getExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return null;
    const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
    const projectId = extra?.eas?.projectId as string | undefined;
    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    return tokenData.data ?? null;
  } catch {
    return null;
  }
}

// ── Crew check-in reminders ───────────────────────────────────────────────────

function crewReminderId(memberId: string | number): string {
  return `bip-crew-${memberId}`;
}

export async function scheduleCrewReminder(member: CrewMember): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!member.cadence || member.cadence === 'whenever') return;
  const granted = await requestNotificationPermissions();
  if (!granted) return;
  const id = crewReminderId(member.id);
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  const seconds = member.cadence === 'daily' ? 86400 : 604800;
  const body = member.cadence === 'daily'
    ? 'Daily crew check-in is due 💫'
    : 'Weekly crew check-in is due 💫';
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: `${member.emoji ?? '💜'} Check in with ${member.name}`,
      body,
    },
    trigger: { seconds, repeats: true } as Notifications.TimeIntervalTriggerInput,
  });
}

export async function cancelCrewReminder(memberId: string | number): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(crewReminderId(memberId)).catch(() => {});
}

export async function registerAndSavePushToken(userId: string): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) console.warn('[notifications] push token save failed:', error.message);
}
