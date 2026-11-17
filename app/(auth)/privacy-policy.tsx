import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';

const LAST_UPDATED = 'November 2026';

export default function PrivacyPolicyScreen() {
  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.meta}>Se'kret Bip · Last updated {LAST_UPDATED}</Text>

        <Text style={styles.section}>1. Who We Are</Text>
        <Text style={styles.body}>
          Se'kret Bip is a private journaling and emotional-wellness app for teens and parents.
          We are committed to protecting the privacy of all users, especially minors.
        </Text>

        <Text style={styles.section}>2. Minimum Age</Text>
        <Text style={styles.body}>
          You must be at least 13 years old to create an account. We verify age at registration
          and do not knowingly collect personal information from children under 13. If we learn
          that a user is under 13, we will delete their account and all associated data promptly.
        </Text>

        <Text style={styles.section}>3. What We Collect</Text>
        <Text style={styles.body}>
          {'• Email address (required for account creation)\n'}
          {'• Password (stored hashed; never readable by us)\n'}
          {'• Birth month and year (age verification only)\n'}
          {'• Content you create: journal entries, mood logs, voice notes, posts\n'}
          {'• Device push token (if you enable notifications)\n'}
          {'• Approximate date and time of activity'}
        </Text>

        <Text style={styles.section}>4. What We Do Not Collect</Text>
        <Text style={styles.body}>
          {'• Full birth date (day is never collected)\n'}
          {'• Phone number\n'}
          {'• Location data\n'}
          {'• Contacts\n'}
          {'• Advertising identifiers'}
        </Text>

        <Text style={styles.section}>5. How We Use Your Data</Text>
        <Text style={styles.body}>
          We use your data only to provide the app's features — syncing your journal across
          devices, enabling the parent-teen bridge when you opt in, and sending daily reminders
          if you turn them on. We do not sell, rent, or share your personal data with third
          parties for advertising purposes.
        </Text>

        <Text style={styles.section}>6. AI Processing</Text>
        <Text style={styles.body}>
          Some features (companion responses, safety scan) use AI. Content sent to AI
          processing is used only to generate a response and is not used to train models or
          stored by the AI provider beyond the immediate request, subject to their data
          processing agreement.
        </Text>

        <Text style={styles.section}>7. Data Retention and Deletion</Text>
        <Text style={styles.body}>
          Your data is retained as long as your account is active. You may permanently delete
          your account and all associated data at any time from Settings → Danger zone →
          Delete My Account. Deletion is irreversible and completes within 30 days for any
          backup systems.
        </Text>

        <Text style={styles.section}>8. Parent-Teen Bridge</Text>
        <Text style={styles.body}>
          The parent bridge is entirely opt-in. Only data you explicitly choose to share
          (mood summaries, approved messages) is visible to a linked parent. Raw journal
          entries and voice notes are never shared with parents.
        </Text>

        <Text style={styles.section}>9. Security</Text>
        <Text style={styles.body}>
          Data is encrypted in transit (TLS) and at rest. Access is protected by row-level
          security so each user can only read their own data.
        </Text>

        <Text style={styles.section}>10. Contact</Text>
        <Text style={styles.body}>
          Questions or deletion requests: privacy@sekretbip.com
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
