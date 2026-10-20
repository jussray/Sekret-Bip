import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';

/**
 * Requests microphone permission imperatively.
 * Returns true if granted, false otherwise.
 */
export async function requestMicrophonePermission(): Promise<boolean> {
  const { status, canAskAgain } = await Audio.requestPermissionsAsync();
  if (status === 'granted') return true;
  return false;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Wraps children; shows a soft permission prompt if mic is not granted.
 * Use this around any recording UI surface.
 */
export default function RecordingPermissionGate({ children, fallback }: Props) {
  const [status, setStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  useEffect(() => {
    Audio.getPermissionsAsync().then(({ status: s }) => {
      setStatus(s === 'granted' ? 'granted' : 'denied');
    });
  }, []);

  const handleRequest = async () => {
    const granted = await requestMicrophonePermission();
    setStatus(granted ? 'granted' : 'denied');
  };

  if (status === 'unknown') return null;

  if (status === 'denied') {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <View style={styles.container}>
        <Text style={styles.title}>Se'kret needs your voice 🎙️</Text>
        <Text style={styles.body}>
          To record voice entries, we need microphone access. Your recordings stay private.
        </Text>
        <TouchableOpacity style={styles.button} onPress={handleRequest}>
          <Text style={styles.buttonText}>Allow microphone</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
