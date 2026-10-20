// app/(teen)/companion-chat.tsx
// Se’kret Bip — Persistent Companion Chat Route
//
// Registered under the (teen) route group so the root layout’s userSide
// guard protects it automatically — no extra auth logic needed here.
//
// Navigation:
//   router.push({
//     pathname: ‘/(teen)/companion-chat’,
//     params: { companion: selectedSekret, surface: ‘journal’ },
//   });
//
// History is keyed per companion + surface so conversations never bleed:
//   sekret:chat:history:{companionKey}:{surface}
//
// Safety integration (Phase 3):
//   - Pre-flight: checkTextBeforePost before every send
//   - Post-reply: if safetyFlag, surface SafetyExperienceSheet
//   - Post-reply: if suggestedComfortTool, show LoopNudge → Comfort
//
// Phase 3B additions:
//   - tone threaded from backend reply into ChatMsg and ChatBubble
//   - questionBudget tracked in state; pill shown when budget ≤ 1
//   - replySource ‘fallback’ shows amber trust indicator on companion row

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
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
import { SafetyExperienceSheet } from '../../components/safety/SafetyExperienceSheet';
import {
  sendCompanionMessage,
  toCompanionId,
  COMPANION_PROFILES,
  type CompanionSurface,
} from '../../src/features/sekret/companionEngine';
import {
  checkTextBeforePost,
  checkForFlaggedItems,
  type SafetyExperience,
} from '../../src/features/safety/safetyCoordinator';
import {
  AVATARS,
  getRoomBg,
  getRoomPhase,
  normalizeCharacterKey,
  SEKRET_PROFILES,
  type Character,
} from '../../constants/theme';

// ── Types ────────────────────────────────────────────────────────────────────────

export type ChatMsg = {
  id: string;
  from: 'companion' | 'user';
  text: string;
  time: string;
  /** Backend tone for companion messages — drives ChatBubble visual register. */
  tone?: string;
  /** True when the companion reply came from the fallback path. */
  isFallback?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Route ──────────────────────────────────────────────────────────────────────────

export default function CompanionChatScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    companion?: string;
    surface?: string;
  }>();

  const companionKey = params.companion ?? 'raylene';
  const surface = (params.surface ?? 'journal') as CompanionSurface;

  // Resolve profile — fall back to 'raylene' for legacy keys
  const profileKey = companionKey in SEKRET_PROFILES ? companionKey : 'soft';
  const profile    = SEKRET_PROFILES[profileKey];
  const charKey: Character = normalizeCharacterKey(profileKey);
  const companionId = toCompanionId(profileKey);

  // Accent colour from COMPANION_PROFILES so ChatBubble can tint correctly.
  const accentColor = COMPANION_PROFILES[companionId]?.accentColor ?? '#a78bfa';

  // Room background, time-of-day aware
  const roomPhase = useMemo(() => getRoomPhase(), []);
  const bgSource  = useMemo(() => getRoomBg(charKey, roomPhase), [charKey, roomPhase]);

  // Companion portrait for header
  const portrait = AVATARS[charKey]?.neutral ?? AVATARS[charKey]?.fullbody ?? null;

  // Per-companion + per-surface history key
  const storageKey = useMemo(
    () => buildHistoryKey(profileKey, surface),
    [profileKey, surface],
  );

  // ── State ──────────────────────────────────────────────────────────────────────
  const [msgs, setMsgs]                           = useState<ChatMsg[]>([]);
  const [loading, setLoading]                     = useState(false);
  const [safetyExperience, setSafetyExperience]   = useState<SafetyExperience | null>(null);
  const [comfortNudge, setComfortNudge]           = useState<string | null>(null);
  const [teenGender, setTeenGender]               = useState<'girl' | 'boy' | 'other' | null>(null);
  /**
   * questionBudget — how many questions the companion has left this session.
   * Initialised to null (unknown) and updated from each backend reply.
   * When ≤ 1 we show a subtle pill so the teen isn’t confused if the
   * companion stops asking questions.
   */
  const [questionBudget, setQuestionBudget] = useState<number | null>(null);
  const listRef = useRef<FlatList<ChatMsg>>(null);

  // Load teen gender from profile so companions can tailor their responses
  useEffect(() => {
    AsyncStorage.getItem('teen_profile_data').then(raw => {
      if (!raw) return;
      try {
        const data = JSON.parse(raw) as { gender?: string };
        if (data.gender === 'girl' || data.gender === 'boy' || data.gender === 'other') {
          setTeenGender(data.gender as 'girl' | 'boy' | 'other');
        }
      } catch { /* ignore */ }
    });
  }, []);

  // Load history on mount; show companion greeting if empty
  useEffect(() => {
    loadHistory(storageKey).then((saved) => {
      if (saved.length === 0) {
        const welcome: ChatMsg = {
          id:   'welcome',
          from: 'companion',
          text: profile.greeting,
          time: nowTime(),
        };
        setMsgs([welcome]);
        persistHistory(storageKey, [welcome]);
      } else {
        setMsgs(saved);
      }
    });
  }, [storageKey]);

  // ── Send ──────────────────────────────────────────────────────────────────────────
  const handleSend = async (text: string) => {
    if (!text.trim() || loading) return;

    // Pre-flight: client-side safety check before any network call
    const preflight = checkTextBeforePost(text.trim(), companionId);
    if (preflight) {
      setSafetyExperience(preflight);
    }

    const userMsg: ChatMsg = {
      id:   String(Date.now()),
      from: 'user',
      text: text.trim(),
      time: nowTime(),
    };

    const withUser = [...msgs, userMsg];
    setMsgs(withUser);
    setLoading(true);
    await persistHistory(storageKey, withUser);

    try {
      const result = await sendCompanionMessage({
        companionId,
        surface,
        text: userMsg.text,
        teenGender,
        history: msgs.map((m) => ({
          role: m.from === 'user' ? ('user' as const) : ('assistant' as const),
          content: m.text,
        })),
      });

      const replyText = result.reply;
      if (!replyText.trim()) throw new Error('Empty reply');

      // Thread backend metadata into the message so ChatBubble can use it.
      const companionMsg: ChatMsg = {
        id:         String(Date.now() + 1),
        from:       'companion',
        text:       replyText,
        time:       nowTime(),
        tone:       result.tone,
        isFallback: result.replySource === 'fallback',
      };

      const final = [...withUser, companionMsg];
      setMsgs(final);
      await persistHistory(storageKey, final);

      // Update question budget from backend.
      if (typeof result.questionBudget === 'number') {
        setQuestionBudget(result.questionBudget);
      }

      // Post-reply safety surface.
      if (result.safetyFlag && !preflight) {
        const flagged = await checkForFlaggedItems(companionId);
        if (flagged) setSafetyExperience(flagged);
      }

      // Post-reply: comfort nudge.
      if (result.suggestedComfortTool && !preflight) {
        setComfortNudge(result.suggestedComfortTool);
      }
    } catch {
      const errMsg: ChatMsg = {
        id:   String(Date.now() + 1),
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

  // ── Render ────────────────────────────────────────────────────────────────────────
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
              <View>
                <ChatBubble
                  from={item.from}
                  text={item.text}
                  time={item.time}
                  accentColor={item.from === 'companion' ? accentColor : undefined}
                  tone={item.tone}
                />
                {/* Fallback indicator — amber dot when companion used fallback path */}
                {item.from === 'companion' && item.isFallback && (
                  <View style={s.fallbackRow}>
                    <View style={[s.fallbackDot, { backgroundColor: accentColor }]} />
                    <Text style={s.fallbackText}>connection was spotty</Text>
                  </View>
                )}
              </View>
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

          {/* Question budget pill — shown when companion is near their question limit */}
          {questionBudget !== null && questionBudget <= 1 && !loading && (
            <View style={s.budgetPill}>
              <Text style={s.budgetText}>
                {profile.name} is just listening right now
              </Text>
            </View>
          )}

          {/* Loop nudge: companion suggested Comfort after heavy reply */}
          {comfortNudge && !loading && (
            <View style={s.nudgeWrap}>
              <Text style={s.nudgeText}>
                {profile.name} thinks Comfort might help right now
              </Text>
              <View style={s.nudgeRow}>
                <TouchableOpacity
                  style={s.nudgeBtn}
                  onPress={() => {
                    setComfortNudge(null);
                    router.push('/(teen)/comfort');
                  }}
                >
                  <Text style={s.nudgeBtnLabel}>Go to Comfort</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.nudgeDismiss}
                  onPress={() => setComfortNudge(null)}
                >
                  <Text style={s.nudgeDismissLabel}>Stay here</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <ChatInput onSend={handleSend} disabled={loading} />
        </KeyboardAvoidingView>
      </SafeAreaView>

      {safetyExperience && (
        <SafetyExperienceSheet
          experience={safetyExperience}
          onDismiss={() => setSafetyExperience(null)}
        />
      )}
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:    { flex: 1 },
  safe:    { flex: 1 },
  flex:    { flex: 1 },
  msgList: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 8 },

  fallbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    marginTop: -2,
    marginBottom: 6,
    gap: 5,
  },
  fallbackDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    opacity: 0.6,
  },
  fallbackText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.28)',
    fontStyle: 'italic',
  },

  budgetPill: {
    alignSelf: 'center',
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  budgetText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.38)',
    fontStyle: 'italic',
  },

  nudgeWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  nudgeText: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  nudgeRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  nudgeBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'rgba(167,139,250,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  nudgeBtnLabel: {
    color: '#e9d5ff',
    fontSize: 13,
    fontWeight: '600',
  },
  nudgeDismiss: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  nudgeDismissLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },
});
