import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
