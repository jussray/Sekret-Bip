/**
 * CrisisSupport.tsx — Trust-03: Always-Accessible Crisis Support
 *
 * A modal that surfaces crisis resources immediately, warmly, and without
 * requiring any account state. Can be triggered from any screen.
 *
 * Usage:
 *   <CrisisSupportButton />   // floating button for nav bars
 *   <CrisisSupportModal visible={visible} onClose={() => setVisible(false)} />
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  StyleSheet,
  Platform,
  Pressable,
  AccessibilityInfo,
} from 'react-native';

// ---------------------------------------------------------------------------
// Crisis resources — jurisdiction-aware
// ---------------------------------------------------------------------------

interface CrisisResource {
  country: string;
  flag: string;
  name: string;
  number: string;
  url?: string;
  description: string;
}

const CRISIS_RESOURCES: CrisisResource[] = [
  {
    country: 'United States',
    flag: '🇺🇸',
    name: '988 Suicide & Crisis Lifeline',
    number: '988',
    url: 'https://988lifeline.org',
    description: 'Call or text 988. Free, confidential support 24/7.',
  },
  {
    country: 'United States',
    flag: '🇺🇸',
    name: 'Crisis Text Line',
    number: '741741',
    url: 'https://www.crisistextline.org',
    description: 'Text HOME to 741741. Free crisis counseling via text.',
  },
  {
    country: 'United Kingdom',
    flag: '🇬🇧',
    name: 'Samaritans',
    number: '116 123',
    url: 'https://www.samaritans.org',
    description: 'Free to call anytime. Someone will listen.',
  },
  {
    country: 'Canada',
    flag: '🇨🇦',
    name: 'Talk Suicide Canada',
    number: '1-833-456-4566',
    url: 'https://talksuicide.ca',
    description: 'Free, confidential crisis support 24/7.',
  },
  {
    country: 'Australia',
    flag: '🇦🇺',
    name: 'Lifeline Australia',
    number: '13 11 14',
    url: 'https://www.lifeline.org.au',
    description: 'Free crisis support 24/7.',
  },
  {
    country: 'International',
    flag: '🌍',
    name: 'Find a Helpline',
    number: '',
    url: 'https://findahelpline.com',
    description: 'Find crisis resources in your country.',
  },
];

// ---------------------------------------------------------------------------
// Modal component
// ---------------------------------------------------------------------------

interface CrisisSupportModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CrisisSupportModal({ visible, onClose }: CrisisSupportModalProps) {
  const handleCall = (number: string) => {
    if (!number) return;
    Linking.openURL(`tel:${number.replace(/\s/g, '')}`);
  };

  const handleUrl = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            You're not alone 💙
          </Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessibilityLabel="Close crisis support"
            accessibilityRole="button"
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        {/* Warm message */}
        <Text style={styles.warmMessage}>
          Whatever you're going through right now, support is available.
          These are free, confidential services — real people ready to listen.
        </Text>

        <Text style={styles.emergencyNote}>
          If you or someone else is in immediate danger, please call your local
          emergency services (911, 999, 000, or 112).
        </Text>

        {/* Resource list */}
        <ScrollView
          style={styles.resourceList}
          contentContainerStyle={styles.resourceListContent}
          showsVerticalScrollIndicator={false}
        >
          {CRISIS_RESOURCES.map((resource) => (
            <View key={resource.name} style={styles.resourceCard}>
              <Text style={styles.resourceCountry}>
                {resource.flag} {resource.country}
              </Text>
              <Text style={styles.resourceName}>{resource.name}</Text>
              <Text style={styles.resourceDescription}>
                {resource.description}
              </Text>
              <View style={styles.resourceActions}>
                {resource.number ? (
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCall(resource.number)}
                    accessibilityLabel={`Call ${resource.name} at ${resource.number}`}
                    accessibilityRole="button"
                  >
                    <Text style={styles.callButtonText}>
                      📞 Call {resource.number}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {resource.url ? (
                  <TouchableOpacity
                    style={styles.urlButton}
                    onPress={() => handleUrl(resource.url!)}
                    accessibilityLabel={`Visit ${resource.name} website`}
                    accessibilityRole="link"
                  >
                    <Text style={styles.urlButtonText}>Visit website →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Footer note */}
        <Text style={styles.footerNote}>
          Bip is not a crisis service. In emergencies, always contact
          emergency services directly.
        </Text>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Floating trigger button (use in navigation bar or persistent footer)
// ---------------------------------------------------------------------------

interface CrisisSupportButtonProps {
  style?: object;
}

export function CrisisSupportButton({ style }: CrisisSupportButtonProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <TouchableOpacity
        style={[styles.triggerButton, style]}
        onPress={() => setVisible(true)}
        accessibilityLabel="Get help now — crisis support resources"
        accessibilityRole="button"
        accessibilityHint="Opens a list of free, confidential crisis support resources"
      >
        <Text style={styles.triggerButtonText}>💙 Need help?</Text>
      </TouchableOpacity>
      <CrisisSupportModal
        visible={visible}
        onClose={() => setVisible(false)}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E6E1',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1916',
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#7A7974',
  },
  warmMessage: {
    fontSize: 16,
    lineHeight: 24,
    color: '#3A3835',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  emergencyNote: {
    fontSize: 14,
    lineHeight: 20,
    color: '#964219',
    backgroundColor: '#FDF3EE',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  resourceList: {
    flex: 1,
  },
  resourceListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  resourceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8E6E1',
  },
  resourceCountry: {
    fontSize: 12,
    color: '#7A7974',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resourceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1916',
    marginBottom: 6,
  },
  resourceDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5A5754',
    marginBottom: 12,
  },
  resourceActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  callButton: {
    backgroundColor: '#01696F',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  callButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  urlButton: {
    borderWidth: 1,
    borderColor: '#D4D1CA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  urlButtonText: {
    color: '#01696F',
    fontSize: 14,
    fontWeight: '500',
  },
  triggerButton: {
    backgroundColor: '#F0F7F7',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerButtonText: {
    color: '#01696F',
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    fontSize: 12,
    color: '#9A9997',
    textAlign: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E6E1',
  },
});
