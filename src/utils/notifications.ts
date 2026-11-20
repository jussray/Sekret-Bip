import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { CrewMember } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const DAILY_REMINDER_ID = 'bip-daily-checkin';

function notificationsAllowed(
  permissions: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>,
): boolean {
  return (
    permissions.granted ||
    permissions.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (notificationsAllowed(existing)) return true;
  const result = await Notifications.requestPermissionsAsync();
  return notificationsAllowed(result);
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
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 20,
      minute: 0,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
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
