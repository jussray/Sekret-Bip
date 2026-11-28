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
  if (!session?.user || session.user.is_anonymous || !session.user.email_confirmed_at) return;

  // Push registration is a protected account side effect. A cached token alone
  // never grants it: recheck the same user's email status with Supabase Auth.
  const { data: identity, error: identityError } = await supabase.auth.getUser();
  if (
    identityError || !identity.user || identity.user.id !== session.user.id
    || identity.user.is_anonymous || !identity.user.email_confirmed_at
  ) return;

  const registration = await registerForPushNotificationsAsync();
  if (registration.token) await syncExpoPushToken(registration.token);

  if (__DEV__ && registration.reason) {
    console.info('NOTIFICATIONS_REGISTRATION_UNAVAILABLE');
  }
}

export function NotificationBootstrap() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    void configureNotificationHandling();
    void registerAndSync().catch(() => {
      if (__DEV__) console.info('NOTIFICATIONS_INITIAL_SYNC_FAILED');
    });

    const supabase = getSupabase();
    const authSubscription = supabase?.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && !session.user.is_anonymous && session.user.email_confirmed_at) {
        void registerAndSync().catch(() => {
          if (__DEV__) console.info('NOTIFICATIONS_AUTH_SYNC_FAILED');
        });
      }
    }).data.subscription;

    const pushTokenSubscription = Notifications.addPushTokenListener(() => {
      void registerAndSync().catch(() => {
        if (__DEV__) console.info('NOTIFICATIONS_TOKEN_REFRESH_SYNC_FAILED');
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
