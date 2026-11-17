import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

const LAST_UPDATED = 'November 2026';

export default function TermsScreen() {
  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.meta}>Se'kret Bip · Last updated {LAST_UPDATED}</Text>

        <Text style={styles.section}>1. Acceptance</Text>
        <Text style={styles.body}>
          By creating an account or using Se'kret Bip, you agree to these Terms. If you do not
          agree, do not use the app.
        </Text>

        <Text style={styles.section}>2. Eligibility</Text>
        <Text style={styles.body}>
          You must be at least 13 years old. By registering, you confirm that you meet this
          requirement. Accounts found to belong to users under 13 will be deleted.
        </Text>

        <Text style={styles.section}>3. Your Account</Text>
        <Text style={styles.body}>
          You are responsible for keeping your password secure and for all activity under your
          account. Notify us immediately at support@sekretbip.com if you believe your account
          has been compromised.
        </Text>

        <Text style={styles.section}>4. Acceptable Use</Text>
        <Text style={styles.body}>
          You agree not to:{'\n'}
          {'• Post content that is illegal, harassing, or harmful\n'}
          {'• Attempt to access another user\'s data\n'}
          {'• Reverse-engineer, scrape, or abuse the service\n'}
          {'• Use the app for commercial purposes without permission'}
        </Text>

        <Text style={styles.section}>5. Your Content</Text>
        <Text style={styles.body}>
          You own everything you write in Se'kret Bip. By using the app, you grant us a limited
          license to store and process your content solely to provide the service to you. We
          do not use your personal journal entries to train AI models.
        </Text>

        <Text style={styles.section}>6. AI Features</Text>
        <Text style={styles.body}>
          Some features use AI to generate responses. AI responses are for informational and
          emotional-support purposes only and are not a substitute for professional mental
          health care. If you are in crisis, please contact a professional or call a crisis
          line in your country.
        </Text>

        <Text style={styles.section}>7. Service Changes</Text>
        <Text style={styles.body}>
          We may update or discontinue features at any time. We will give reasonable notice
          for significant changes. Continued use after a change means you accept the new terms.
        </Text>

        <Text style={styles.section}>8. Termination</Text>
        <Text style={styles.body}>
          You may delete your account at any time from Settings. We may suspend or terminate
          accounts that violate these Terms. On termination, your data is deleted per our
          Privacy Policy.
        </Text>

        <Text style={styles.section}>9. Disclaimer</Text>
        <Text style={styles.body}>
          The app is provided "as is." We make no warranties of fitness for a particular
          purpose. We are not liable for indirect, incidental, or consequential damages
          arising from your use of the app.
        </Text>

        <Text style={styles.section}>10. Governing Law</Text>
        <Text style={styles.body}>
          These Terms are governed by the laws of the State of California, USA, without
          regard to conflict-of-law provisions.
        </Text>

        <Text style={styles.section}>11. Contact</Text>
        <Text style={styles.body}>
          Questions: support@sekretbip.com
        </Text>

        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#0d0d0d' },
  back:    { paddingTop: 56, paddingHorizontal: 24, paddingBottom: 8 },
  backText: { color: '#c4b5fd', fontSize: 15 },
  content: { paddingHorizontal: 24, paddingBottom: 60 },
  title:   { color: '#fff', fontSize: 24, fontWeight: '800', marginBottom: 4, marginTop: 8 },
  meta:    { color: '#555', fontSize: 12, marginBottom: 28 },
  section: { color: '#c4b5fd', fontWeight: '700', fontSize: 15, marginTop: 22, marginBottom: 6 },
  body:    { color: '#94a3b8', fontSize: 14, lineHeight: 22 },
  spacer:  { height: 40 },
});
