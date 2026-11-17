/**
 * app/+not-found.tsx
 *
 * Catches all unmatched routes. Required by Expo Router for graceful
 * 404 handling — especially important for Vercel's SPA rewrite
 * ("/:path*" → "/") so deep links don't hard-crash.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>🌙</Text>
        <Text style={styles.title}>Lost in the Bip</Text>
        <Text style={styles.body}>This page doesn't exist — but your space does.</Text>
        <Link href="/(teen)/room" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonText}>Go home</Text>
          </Pressable>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f0e13',
    padding: 32,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e8e3f0',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    color: '#9d97b0',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 280,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#6c5ce7',
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
