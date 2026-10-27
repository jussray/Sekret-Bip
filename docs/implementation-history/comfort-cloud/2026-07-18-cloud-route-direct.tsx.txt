// app/(teen)/cloud.tsx
// Se'kret Bip — Cloud Thoughts Screen
//
// Navigation:
//   router.push('/(teen)/cloud')
//
// Purpose: private thought-capture space. No social layer, no sharing,
// no judgment. Thoughts are written, optionally saved, and released.
//
// Persistence strategy:
//   1. Primary: Supabase `cloud_thoughts` table (user-scoped, RLS-protected)
//   2. Fallback: AsyncStorage keyed `sekret:cloud:thoughts` when offline
//   3. Sync: on mount, if online and local drafts exist, flush to Supabase
//
// Privacy copy is intentional — the teen should always know this is theirs.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CloudThought {
  id:         string;
  text:       string;
  created_at: string;
  synced:     boolean;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STORAGE_KEY    = 'sekret:cloud:thoughts';
const MAX_CHARS      = 500;
const MAX_LOCAL_KEPT = 50; // keep last 50 to cap storage

const PLACEHOLDERS = [
  "What's sitting in your chest right now?",
  "Say the thing you haven't said out loud yet.",
  "What do you wish someone understood about today?",
  "A thought that keeps coming back…",
  "Just start typing. No one is reading this.",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function newId(): string {
  return `cloud_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

async function loadLocal(): Promise<CloudThought[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CloudThought[]) : [];
  } catch {
    return [];
  }
}

async function saveLocal(thoughts: CloudThought[]): Promise<void> {
  try {
    const trimmed = thoughts.slice(-MAX_LOCAL_KEPT);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch { /* non-fatal */ }
}

// ── Thought Card ──────────────────────────────────────────────────────────────

function ThoughtCard({
  thought,
  onRelease,
}: {
  thought: CloudThought;
  onRelease: (id: string) => void;
}) {
  const opacity = useRef(new Animated.Value(1)).current;

  const handleRelease = () => {
    Animated.timing(opacity, {
      toValue: 0, duration: 350,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => onRelease(thought.id));
  };

  return (
    <Animated.View style={[tc.card, { opacity }]}>
      <Text style={tc.text}>{thought.text}</Text>
      <View style={tc.footer}>
        <Text style={tc.date}>{fmtDate(thought.created_at)}</Text>
        <View style={tc.footerRight}>
          {!thought.synced && (
            <Text style={tc.local}>local</Text>
          )}
          <TouchableOpacity onPress={handleRelease} style={tc.releaseBtn}>
            <Text style={tc.releaseLabel}>release ✦</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const tc = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 16,
    marginBottom: 12,
  },
  text:  { fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.75)' },
  footer: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 10,
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  date:  { fontSize: 11, color: 'rgba(255,255,255,0.25)' },
  local: {
    fontSize: 10, color: 'rgba(167,139,250,0.45)',
    fontStyle: 'italic',
  },
  releaseBtn: { paddingVertical: 3, paddingHorizontal: 6 },
  releaseLabel: { fontSize: 12, color: 'rgba(167,139,250,0.55)' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CloudScreen() {
  const router = useRouter();

  const [thoughts, setThoughts]     = useState<CloudThought[]>([]);
  const [draft, setDraft]           = useState('');
  const [saving, setSaving]         = useState(false);
  const [placeholder]               = useState(
    () => PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)],
  );
  const inputRef = useRef<TextInput>(null);

  // Load on mount
  useEffect(() => {
    loadLocal().then(setThoughts);
  }, []);

  // Attempt Supabase sync for unsynced items
  useEffect(() => {
    const unsynced = thoughts.filter(t => !t.synced);
    if (unsynced.length === 0) return;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const rows = unsynced.map(t => ({
          id:         t.id,
          user_id:    user.id,
          text:       t.text,
          created_at: t.created_at,
        }));

        const { error } = await supabase
          .from('cloud_thoughts')
          .upsert(rows, { onConflict: 'id' });

        if (!error) {
          const updated = thoughts.map(t =>
            unsynced.some(u => u.id === t.id) ? { ...t, synced: true } : t,
          );
          setThoughts(updated);
          await saveLocal(updated);
        }
      } catch { /* offline — will retry next mount */ }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(async () => {
    const text = draft.trim();
    if (!text || saving) return;

    setSaving(true);
    inputRef.current?.blur();

    const thought: CloudThought = {
      id:         newId(),
      text,
      created_at: new Date().toISOString(),
      synced:     false,
    };

    // Optimistic local save first
    const updated = [thought, ...thoughts];
    setThoughts(updated);
    setDraft('');
    await saveLocal(updated);

    // Try Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from('cloud_thoughts').insert({
          id:         thought.id,
          user_id:    user.id,
          text:       thought.text,
          created_at: thought.created_at,
        });
        if (!error) {
          const synced = updated.map(t =>
            t.id === thought.id ? { ...t, synced: true } : t,
          );
          setThoughts(synced);
          await saveLocal(synced);
        }
      }
    } catch { /* offline — already saved locally */ }
    finally {
      setSaving(false);
    }
  }, [draft, saving, thoughts]);

  const handleRelease = useCallback(async (id: string) => {
    // Remove locally
    const updated = thoughts.filter(t => t.id !== id);
    setThoughts(updated);
    await saveLocal(updated);

    // Remove from Supabase (soft delete — just remove from client view)
    try {
      await supabase.from('cloud_thoughts').delete().eq('id', id);
    } catch { /* non-fatal */ }
  }, [thoughts]);

  const charsLeft = MAX_CHARS - draft.length;

  return (
    <LinearGradient
      colors={['#06050f', '#0d0a1f', '#080614']}
      style={s.root}
    >
      <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.kav}
        >
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backLabel}>‹ Back</Text>
            </TouchableOpacity>
            <View style={s.titleRow}>
              <Text style={s.title}>Cloud</Text>
              <Text style={s.titleSub}>your private sky</Text>
            </View>
            <View style={s.backBtn} />
          </View>

          {/* Thought list */}
          <FlatList
            data={thoughts}
            keyExtractor={t => t.id}
            renderItem={({ item }) => (
              <ThoughtCard thought={item} onRelease={handleRelease} />
            )}
            contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={s.empty}>
                <Text style={s.emptyEmoji}>☁️</Text>
                <Text style={s.emptyText}>
                  Your cloud is clear.{`\n`}Write something — it stays here, just for you.
                </Text>
              </View>
            }
          />

          {/* Composer */}
          <View style={s.composer}>
            <TextInput
              ref={inputRef}
              style={s.input}
              value={draft}
              onChangeText={t => t.length <= MAX_CHARS && setDraft(t)}
              placeholder={placeholder}
              placeholderTextColor="rgba(255,255,255,0.22)"
              multiline
              maxLength={MAX_CHARS}
              returnKeyType="default"
              scrollEnabled={false}
            />
            <View style={s.composerFooter}>
              <Text style={[
                s.charsLeft,
                charsLeft < 50 && s.charsWarning,
              ]}>
                {charsLeft}
              </Text>
              <TouchableOpacity
                style={[
                  s.saveBtn,
                  (!draft.trim() || saving) && s.saveBtnDisabled,
                ]}
                onPress={handleSave}
                disabled={!draft.trim() || saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color="#e9d5ff" />
                  : <Text style={s.saveBtnLabel}>Let it float ✦</Text>
                }
              </TouchableOpacity>
            </View>
          </View>

          {/* Privacy reminder */}
          <Text style={s.privacy}>
            Only you can see this. Nothing is shared.
          </Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kav:  { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
  },
  backBtn:   { width: 60 },
  backLabel: { color: '#a78bfa', fontSize: 16 },
  titleRow:  { alignItems: 'center' },
  title:     { fontSize: 17, fontWeight: '700', color: '#e9d5ff' },
  titleSub:  { fontSize: 11, color: 'rgba(255,255,255,0.30)', fontStyle: 'italic', marginTop: 1 },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 40, marginBottom: 12, opacity: 0.5 },
  emptyText: {
    fontSize: 14, color: 'rgba(255,255,255,0.28)',
    textAlign: 'center', lineHeight: 20, maxWidth: 260,
  },

  composer: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    marginBottom: 8,
  },
  input: {
    fontSize: 15, lineHeight: 22,
    color: 'rgba(255,255,255,0.80)',
    minHeight: 72, maxHeight: 160,
    textAlignVertical: 'top',
  },
  composerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  charsLeft:    { fontSize: 12, color: 'rgba(255,255,255,0.25)' },
  charsWarning: { color: '#f87171' },
  saveBtn: {
    paddingHorizontal: 18, paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(139,92,246,0.28)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.40)',
  },
  saveBtnDisabled: { opacity: 0.38 },
  saveBtnLabel:    { color: '#e9d5ff', fontSize: 13, fontWeight: '600' },

  privacy: {
    fontSize: 11, color: 'rgba(255,255,255,0.18)',
    textAlign: 'center', fontStyle: 'italic',
    marginBottom: Platform.OS === 'ios' ? 8 : 12,
  },
});
