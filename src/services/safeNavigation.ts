import { Alert } from 'react-native';
import { router } from 'expo-router';
import { captureFingerprintedError } from '@/services/runtimeFingerprintLogger';

export async function safePush(href: string, screen?: string): Promise<void> {
  try {
    router.push(href as never);
  } catch (error) {
    await captureFingerprintedError('navigation.route_failed', error, {
      screen: screen ?? 'router.push',
      metadata: {
        href,
        navigation_method: 'push',
      },
    });
    Alert.alert('Navigation error', 'That screen could not be opened right now.');
  }
}

export async function safeReplace(href: string, screen?: string): Promise<void> {
  try {
    router.replace(href as never);
  } catch (error) {
    await captureFingerprintedError('navigation.route_failed', error, {
      screen: screen ?? 'router.replace',
      metadata: {
        href,
        navigation_method: 'replace',
      },
    });
    Alert.alert('Navigation error', 'That screen could not be opened right now.');
  }
}
