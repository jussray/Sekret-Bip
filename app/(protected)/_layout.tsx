/**
 * Protected route layout
 * All screens under (protected)/ require a valid Supabase session.
 * Unauthenticated users are redirected to /sign-in.
 */
import { useEffect, useState } from 'react';
import { Slot, useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { requireAuth } from '@/middleware/auth';

export default function ProtectedLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    requireAuth().then(result => {
      if (!result.ok) {
        router.replace('/sign-in');
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <Slot />;
}
