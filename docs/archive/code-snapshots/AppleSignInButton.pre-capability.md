# Historical snapshot: Apple Sign-In button before native capability approval

This is preserved source from `components/auth/AppleSignInButton.tsx` before PR #595 removed the unresolved `expo-apple-authentication` import from the active TypeScript graph.

It is **not active implementation**. Restoring it requires explicit founder approval for the native dependency, Apple capability, Supabase provider configuration, EAS/App Store implications, and device verification.

```tsx
/**
 * AppleSignInButton.tsx
 * Sign in with Apple — mandatory for App Store if ANY other social login exists.
 * Wires expo-apple-authentication → Supabase signInWithIdToken.
 *
 * Prerequisites:
 *   - expo install expo-apple-authentication
 *   - Add "Sign In with Apple" capability in Xcode
 *   - Enable Apple provider in Supabase Auth dashboard
 */
import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { getSupabase } from '@/utils/supabase';
import type { Session } from '@supabase/supabase-js';

interface Props {
  onSuccess?: (session: Session) => void;
  onError?: (error: Error) => void;
}

export default function AppleSignInButton({ onSuccess, onError }: Props) {
  if (Platform.OS !== 'ios') return null;

  const handlePress = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token returned from Apple.');
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error('Auth unavailable. Check the Supabase app configuration.');

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;
      if (data.session) onSuccess?.(data.session);
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') return;
      console.error('[AppleSignIn]', error);
      onError?.(error instanceof Error ? error : new Error(error.message));
    }
  };

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={12}
      style={styles.button}
      onPress={handlePress}
    />
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 54,
  },
});
```
