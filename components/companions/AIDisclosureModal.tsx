/**
 * AIDisclosureModal.tsx
 * Apple App Store requirement — AI-generated content must be disclosed.
 * Show ONCE on a user's first companion message, ever.
 * Persisted via profiles.ai_disclosure_accepted_at.
 *
 * Usage:
 *   const [showDisclosure, setShowDisclosure] = useState(!profile.ai_disclosure_accepted_at);
 *   <AIDisclosureModal
 *     visible={showDisclosure}
 *     companionName="Suhana"
 *     onAccept={() => setShowDisclosure(false)}
 *   />
 */
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { getSupabase } from '@/utils/supabase';

interface Props {
  visible: boolean;
  companionName: string;
  onAccept: () => void;
}

export default function AIDisclosureModal({ visible, companionName, onAccept }: Props) {
  const handleAccept = async () => {
    try {
      const supabase = getSupabase();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ ai_disclosure_accepted_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    } catch (e) {
      // Non-blocking — user flow continues regardless
      console.warn('[AIDisclosure] Could not persist acceptance:', e);
    }
    onAccept();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.card}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarEmoji}>🧑‍💻</Text>
            </View>

            <Text style={styles.headline}>Meet {companionName}</Text>

            <Text style={styles.body}>
              {companionName} is an{' '}
              <Text style={styles.bold}>AI companion</Text>
              {' '}— a character powered by artificial intelligence, not a real person.
            </Text>

            <Text style={styles.body}>
              {companionName} is here to listen, chat, and support you. But remember:
              always talk to a real adult you trust for anything important.
            </Text>

            <View style={styles.divider} />

            <Text style={styles.fine}>
              By chatting with {companionName}, you agree to Se'kret Bip's{' '}
              <Text style={styles.link}>Terms of Service</Text> and{' '}
              <Text style={styles.link}>Privacy Policy</Text>.
            </Text>

            <TouchableOpacity
              style={styles.button}
              onPress={handleAccept}
              accessibilityLabel={`Got it, start chatting with ${companionName}`}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Got it — let's chat 👋</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  safeArea: { width: '100%' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarEmoji: { fontSize: 32 },
  headline: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#444',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 12,
    maxWidth: 320,
  },
  bold: { fontWeight: '700', color: '#1a1a1a' },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 16,
  },
  fine: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 300,
  },
  link: { color: '#01696f', textDecorationLine: 'underline' },
  button: {
    backgroundColor: '#01696f',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    minHeight: 54,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
