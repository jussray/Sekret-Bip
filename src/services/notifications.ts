import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const EXPO_PUSH_TOKEN_KEY = 'expoPushToken';

export type NotificationRegistration = {
  granted: boolean;
  token: string | null;
  reason?: string;
};

function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function configureNotificationHandling(): Promise<void> {
  if (Platform.OS === 'web') return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: "Se'kret Bip alerts",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F040B0',
    });
  }
}

export async function registerForPushNotificationsAsync(): Promise<NotificationRegistration> {
  if (Platform.OS === 'web') {
    return { granted: false, token: null, reason: 'Push notifications are not enabled on web.' };
  }

  try {
    const current = await Notifications.getPermissionsAsync();
    let status = current.status;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return { granted: false, token: null, reason: 'Notification permission was not granted.' };
    }

    const projectId = getProjectId();
    if (!projectId) {
      return { granted: true, token: null, reason: 'The EAS project ID is missing.' };
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await AsyncStorage.setItem(EXPO_PUSH_TOKEN_KEY, token);
    return { granted: true, token };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Notification registration failed.';
    return { granted: false, token: null, reason };
  }
}

export async function getStoredExpoPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(EXPO_PUSH_TOKEN_KEY);
}

export async function clearStoredExpoPushToken(): Promise<void> {
  await AsyncStorage.removeItem(EXPO_PUSH_TOKEN_KEY);
}
