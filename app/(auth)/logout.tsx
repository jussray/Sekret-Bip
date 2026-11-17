import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { endAuthenticatedSession } from '@/services/session';
import { routeForSide } from '@/shared/routes';

export default function LogoutRoute() {
  const { userSide } = useAppContext();

  useEffect(() => {
    void endAuthenticatedSession()
      .then(() => router.replace('/(auth)/login'))
      .catch(() => router.replace(routeForSide(userSide, 'more') as never));
  }, [userSide]);

  return (
    <View style={styles.root}>
      <ActivityIndicator />
      <Text style={styles.text}>Signing out securely…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#130b24', gap: 12 },
  text: { color: '#fff', fontWeight: '800' },
});
