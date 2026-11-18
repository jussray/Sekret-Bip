// app/(teen)/companion-chat.tsx
// Se'kret Bip — Persistent Companion Chat Route
//
// Registered under the (teen) route group so the root layout's userSide
// guard protects it automatically — no extra auth logic needed here.
//
// Navigation:
//   router.push({
//     pathname: '/(teen)/companion-chat',
//     params: { companion: selectedSekret, surface: 'journal' },
//   });
//
// History is keyed per companion + surface so conversations never bleed:
//   sekret:chat:history:{companionKey}:{surface}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CompanionChatHeader } from '../../components/chat/CompanionChatHeader';
import { CompanionTypingIndicator } from '../../components/chat/CompanionTypingIndicator';
import { ChatBubble } from '../../components/chat/ChatBubble';
import { ChatInput } from '../../components/chat/ChatInput';
import {
  fetchSekretReply,
  type SekretSurface,
} from '../../src/utils/api';
import {
  AVATARS,
  getRoomBg,
  getRoomPhase,
  normalizeCharacterKey,
  SEKRET_PROFILES,
  type Character,
} from '../../constants/theme';
import { syncOracleSession, loadOracleSession } from '../../src/utils/sync';
import { useAppContext } from '@/context/AppContext';

// ── Types ────────────────────────────────────────────────────────────────────────────────
export type ChatMsg = {
  id: string;
  from: 'companion' | 'user';
  text: string;
  time: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────────────────
function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildHistoryKey(companionKey: string, surface: string): string {
  return `sekret:chat:history:${companionKey}:${surface}`;
}

async function loadHistory(key: string): Promise<ChatMsg[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ChatMsg[]) : [];
  } catch {
    return [];
  }
}

async function persistHistory(key: string, msgs: ChatMsg[]): Promise<void> {
  try {
    // Keep last 100 messages to cap storage usage
    const trimmed = msgs.slice(-100);
    await AsyncStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // Non-fatal — history will reload from last saved checkpoint
  }
}

// ── Route ────────────────────────────────────────────────────────────────────────────────
export default function CompanionChatScreen() {
  const router = useRouter();
  const { mood } = useAppContext();

  const params = useLocalSearchParams<{
    companion?: string;
    surface?: string;
  }>();

  const companionKey = params.companion ?? 'raylene';
  const surface = (params.surface ?? 'journal') as SekretSurface;

  // Resolve profile — fall back to 'soft' (Raylene) for legacy 'soft' key
  const profileKey = companionKey in SEKRET_PROFILES ? companionKey : 'soft';
  const profile = SEKRET_PROFILES[profileKey];
  const charKey: Character = normalizeCharacterKey(profileKey);

  // Room background, time-of-day aware
  const roomPhase = useMemo(() => getRoomPhase(), []);
  const bgSource = useMemo(() => getRoomBg(charKey, roomPhase), [charKey, roomPhase]);

  // Companion portrait for header
  const portrait = AVATARS[charKey]?.neutral ?? AVATARS[charKey]?.fullbody ?? null;

  // Per-companion + per-surface history key
  const storageKey = useMemo(
    () => buildHistoryKey(profileKey, surface),
    [profileKey, surface],
  );

  // ── State ────────────────────────────────────────────────────────────────────────────
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<ChatMsg>>(null);
  const sessionCountRef = useRef(0);

  // Load history on mount; fall back to cloud oracle memory if AsyncStorage empty
  useEffect(() => {
    (async () => {
      const saved = await loadHistory(storageKey);
      if (saved.length > 0) {
        setMsgs(saved);
        // Restore session count from cloud (non-blocking)
        loadOracleSession(profileKey).then((cloud) => {
          if (cloud) sessionCountRef.current = cloud.sessionCount;
        });
        return;
      }

      // Try cloud restore first — gives returning users continuity on a new device
      const cloud = await loadOracleSession(profileKey);
      if (cloud?.memory?.recentMessages) {
        const restored = cloud.memory.recentMessages as ChatMsg[];
        sessionCountRef.current = cloud.sessionCount;
        setMsgs(restored);
        await persistHistory(storageKey, restored);
        return;
      }

      // Brand new — show greeting
      const welcome: ChatMsg = {
        id: 'welcome',
        from: 'companion',
        text: profile.greeting,
        time: nowTime(),
      };
      setMsgs([welcome]);
      persistHistory(storageKey, [welcome]);
    })();
  }, [storageKey]);

  // ── Send ─────────────────────────────────────────────────────────────────────────────
  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMsg = {
      id: String(Date.now()),
      from: 'user',
      text: text.trim(),
      time: nowTime(),
    };

    // 1. Append user message + set loading
    const withUser = [...msgs, userMsg];
    setMsgs(withUser);
    setLoading(true);

    // 2. Persist user message IMMEDIATELY — never lost on network failure
    await persistHistory(storageKey, withUser);

    try {
      // Pass companion key so the character answers in their own voice.
      // fetchSekretReply returns Promise<string> — no unwrapping needed.
      const replyText = await fetchSekretReply(
        userMsg.text,
        surface,
        mood ?? undefined,
        profileKey,   // avatarKey → raylene | rylane | cloud | night
      );

      if (!replyText.trim()) throw new Error('Empty reply');

      const companionMsg: ChatMsg = {
        id: String(Date.now() + 1),
        from: 'companion',
        text: replyText,
        time: nowTime(),
      };
      const final = [...withUser, companionMsg];
      setMsgs(final);
      await persistHistory(storageKey, final);

      // Sync compact memory snapshot to Supabase (cross-device continuity)
      sessionCountRef.current += 1;
      syncOracleSession(
        profileKey,
        { recentMessages: final.slice(-20), surface },
        sessionCountRef.current,
      );
    } catch {
      const errMsg: ChatMsg = {
        id: String(Date.now() + 1),
        from: 'companion',
        text: `${profile.name} is still here — the connection was shaky but your message was saved 💜`,
        time: nowTime(),
      };
      const final = [...withUser, errMsg];
      setMsgs(final);
      await persistHistory(storageKey, final);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────────────────
  return (
    <ImageBackground source={bgSource} style={s.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(20,10,40,0.42)', 'rgba(12,6,28,0.90)']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>

        <CompanionChatHeader
          name={profile.name}
          title={profile.title}
          emoji={profile.emoji}
          portrait={portrait}
          onBack={() => router.back()}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.flex}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listRef}
            data={msgs}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <ChatBubble from={item.from} text={item.text} time={item.time} />
            )}
            contentContainerStyle={s.msgList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: true })
            }
          />

          {loading && (
            <CompanionTypingIndicator name={profile.name} emoji={profile.emoji} />
          )}

          <ChatInput
            onSend={handleSend}
            disabled={loading}
            placeholder={`talk to ${profile.name}…`}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#110a28' },
  safe: { flex: 1 },
  flex: { flex: 1 },
  msgList: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
});
