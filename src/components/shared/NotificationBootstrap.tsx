import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import {
  configureNotificationHandling,
  registerForPushNotificationsAsync,
} from '@/services/notifications';
import { syncExpoPushToken } from '@/services/pushTokenSync';
import { getSupabase } from '@/utils/supabase';

function openNotificationRoute(response: Notifications.NotificationResponse): void {
  const url = response.notification.request.content.data?.url;
  if (typeof url !== 'string' || !url.startsWith('/')) return;
  router.push(url as never);
}

async function registerAndSync(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;

  const registration = await registerForPushNotificationsAsync();
  if (registration.token) await syncExpoPushToken(registration.token);

  if (__DEV__ && registration.reason) {
    console.info('[notifications]', registration.reason);
  }
}

export function NotificationBootstrap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    void configureNotificationHandling();
    void registerAndSync().catch((error) => {
      if (__DEV__) console.info('[notifications] initial sync failed', error);
    });

    const supabase = getSupabase();
    const authSubscription = supabase?.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        void registerAndSync().catch((error) => {
          if (__DEV__) console.info('[notifications] auth sync failed', error);
        });
      }
    }).data.subscription;

    const pushTokenSubscription = Notifications.addPushTokenListener((devicePushToken) => {
      void registerAndSync().catch((error) => {
        if (__DEV__) console.info('[notifications] token refresh sync failed', error, devicePushToken.type);
      });
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      openNotificationRoute,
    );

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotificationRoute(response);
    });

    return () => {
      authSubscription?.unsubscribe();
      pushTokenSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  return null;
}
