// app/(teen)/pages/index.tsx
// SE'KRET PAGES — Continuous Companion Journal
//
// PROTECTED DATA CONTRACT (must not be removed or bypassed):
//   ✓ sendCompanionMessage   — sole AI call for companion replies
//                              (wraps fetchSekretBrainReply, emits companion_message event,
//                               runs safety flag detection)
//   ✓ Suhana / Sy / Cloud / Night companion tabs
//   ✓ mood tags via AppContext.mood
//   ✓ companion-specific prompts with rotation
//   ✓ image / video attachment
//   ✓ per-entry privacy lock
//   ✓ AI reply voice playback via fetchSekretVoice
//   ✓ Supabase sync via onSave / patchJournalEntry
//   ✓ sekretReply persisted via patchJournalEntry(id, { sekretReply })
//   ✓ Me = private non-AI journaling, Joseema = guided discovery (legacy id: oracle)
//   ✗ NO sekret:chat:history:* storage — entries are the only truth

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio, ResizeMode, Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AmbientWeatherOverlay } from '../../../components/AmbientWeatherOverlay';
import { useAppContext } from '@/context/AppContext';
import { IMAGES } from '@/constants/theme';
import { TEEN_ROUTES } from '@/teen/routes';
import { updateSekretMemory } from '../../../services/sekretMemory';
import {
  fetchSekretVoice,
  normalizeSekretCharacter,
  type SekretAvatarState,
  type SekretCharacterId,
  type SekretHistoryTurn,
} from '@/utils/api';
import { getTeenCompanionAsset } from '@/utils/companions';
import type { JournalEntry } from '@/types';
import {
  sendCompanionMessage,
  toCompanionId,
} from '../../../src/features/sekret/companionEngine';
import {
  checkTextBeforePost,
  checkForFlaggedItems,
  type SafetyExperience,
} from '../../../src/features/safety/safetyCoordinator';
import { SafetyExperienceSheet } from '../../../components/safety/SafetyExperienceSheet';
import {
  buildBridgeSharePreview,
  createBridgeShareRequest,
  fetchBridgeShareStatusesForJournalEntries,
  revokeBridgeShareRequest,
  type JournalBridgeShareStatus,
} from '@/services/bridgeSummaryService';
import { fetchLinkedParentId } from '@/utils/parentLink';
import { usePoints } from '@/features/activity/ledger';
import { syncJournal } from '@/utils/sync';

const ACTIVE_BRIDGE_SHARE_STATUSES = new Set(['pending', 'processing', 'ready', 'viewed']);

// ─── Companion manifest ───────────────────────────────────────────────────────
// id stays on the persisted app_profiles.selected_companion vocabulary
// (raylene/rylane, DB-constrained — see constants/voiceBip.ts); name is the
// current canonical display text.
const COMPANIONS = [
  { id: 'raylene', name: 'Suhana', accent: '#f08bc5', vibe: 'warm + protective' },
  { id: 'rylane',  name: 'Sy',     accent: '#76a7ff', vibe: 'direct + loyal'    },
  { id: 'cloud',   name: 'Cloud',   accent: '#8ed9e7', vibe: 'soft + no pressure' },
  { id: 'night',   name: 'Night',   accent: '#9a8ee8', vibe: 'quiet + steady'    },
  { id: 'me',      name: 'Me',      accent: '#b8a9c9', vibe: 'private pages'     },
  { id: 'oracle',  name: 'Joseema', accent: '#c7b87a', vibe: 'guided discovery'  },
] as const;

type CompanionId = (typeof COMPANIONS)[number]['id'];

// Companions that map directly to SekretCharacterId (excludes 'me' and 'oracle')
type AiCompanionId = 'raylene' | 'rylane' | 'cloud' | 'night';

function isAiTab(id: CompanionId): id is AiCompanionId {
  return id === 'raylene' || id === 'rylane' || id === 'cloud' || id === 'night';
}

// ─── Companion prompts (protected: must rotate per companion) ─────────────────
const PROMPTS: Record<string, string[]> = {
  raylene: [
    "What happened today that's still in your body?",
    "Who made you feel safe lately — or didn't?",
    "What are you carrying that you haven't said out loud?",
    "Tell me something you almost texted someone but didn't.",
  ],
  rylane: [
    "What's the honest version of today?",
    "Something you did you're actually proud of?",
    "What would you say if you weren't trying to be okay?",
    "Who gets the real version of you?",
  ],
  cloud: [
    "What feels heavy right now? You don't have to fix it.",
    "Describe today like a weather report.",
    "What do you wish someone had said to you today?",
    "Something small that was actually kind of beautiful?",
  ],
  night: [
    "What's the thing you keep thinking about when it's quiet?",
    "Something you noticed today that no one else did?",
    "What are you hoping for tomorrow?",
    "Is there something you need to forgive yourself for?",
  ],
  me: [
    "Just for you. No one else reads this.",
    "Write something you haven't been able to say.",
    "This page is yours alone.",
    "What's really going on?",
  ],
  oracle: [
    "What pattern keeps showing up in your life?",
    "If your gut had a voice today, what would it say?",
    "What are you avoiding discovering?",
    "What question are you afraid to answer honestly?",
  ],
};

// ─── Avatar image helpers ─────────────────────────────────────────────────────
function normalizeAvatar(value?: string): SekretCharacterId {
  if (value === 'sy' || value === 'rylane') return 'sy';
  if (value === 'cloud') return 'cloud';
  if (value === 'night') return 'night';
  return 'suhana';
}

const PAGES_COMPANION_POSES = {
  raylene: {
    neutral: 'neutral',
    listening: 'listening',
    thinking: 'thinking',
    comforting: 'encouraging',
    happy: 'happy',
    concerned: 'encouraging',
    responding: 'writing',
  },
  rylane: {
    neutral: 'neutral',
    listening: 'listening',
    thinking: 'thinking',
    comforting: 'calm',
    happy: 'happy',
    concerned: 'encouraging',
    responding: 'writing',
  },
  night: {
    neutral: 'neutral',
    listening: 'listening',
    thinking: 'thinking',
    comforting: 'comfort',
    happy: 'happy',
    concerned: 'comfort',
    responding: 'writing',
  },
} as const;

function avatarImage(character: SekretCharacterId, state: SekretAvatarState) {
  character = normalizeAvatar(character);

  if (character === 'suhana' || character === 'sekret') {
    return getTeenCompanionAsset('raylene', PAGES_COMPANION_POSES.raylene[state]) ?? IMAGES.rayleneNeutral;
  }

  if (character === 'sy') {
    return getTeenCompanionAsset('rylane', PAGES_COMPANION_POSES.rylane[state]) ?? IMAGES.rylaneNeutral;
  }

  if (character === 'night') {
    return getTeenCompanionAsset('night', PAGES_COMPANION_POSES.night[state]) ?? IMAGES.nightNeutral;
  }

  const cloud: Record<SekretAvatarState, any> = {
    neutral: IMAGES.cloudAvatarNeutral,
    listening: IMAGES.cloudAvatarThinking,
    thinking: IMAGES.cloudAvatarThinking,
    comforting: IMAGES.cloudAvatarWindow,
    happy: IMAGES.cloudAvatarHappy,
    concerned: IMAGES.cloudAvatarWindow,
    responding: IMAGES.cloudAvatarWriting,
  };

  return cloud[state] ?? cloud.neutral;
}

function inferState(state: SekretAvatarState, mood?: string, tone?: string): SekretAvatarState {
  if (state !== 'neutral') return state;
  const signal = `${mood ?? ''} ${tone ?? ''}`.toLowerCase();
  if (/hope|happy|good|proud|okay/.test(signal))        return 'happy';
  if (/heavy|hurt|sad|numb|worried|safety|concern/.test(signal)) return 'concerned';
  if (/soft|comfort|calm|gentle|quiet/.test(signal))   return 'comforting';
  return 'responding';
}

// ─── Companion unlock thresholds (points required, matches TIERS) ─────────────
const COMPANION_UNLOCK_PTS: Record<CompanionId, number> = {
  raylene: 0, me: 0, oracle: 0,
  rylane: 50, cloud: 150, night: 350,
};

// ─── Mood tag palette ─────────────────────────────────────────────────────────
const MOOD_TAGS = [
  { label: '😌 okay',    value: 'okay'    },
  { label: '💜 soft',    value: 'soft'    },
  { label: '😔 heavy',   value: 'heavy'   },
  { label: '🔥 fired up', value: 'fired'  },
  { label: '😶 numb',    value: 'numb'    },
  { label: '🌊 anxious', value: 'anxious' },
  { label: '✨ hopeful', value: 'hopeful' },
];

// ─── Scrapbook home ───────────────────────────────────────────────────────────
// Each companion's own night room is the Pages backdrop; Me and Joseema use
// Suhana's room so the page never falls back to a flat gradient.
const PAGES_BACKDROP: Record<CompanionId, any> = {
  raylene: require('../../../assets/images/bg-raylene-room-night.png'),
  rylane:  require('../../../assets/images/bg-rylane-room-night.png'),
  cloud:   require('../../../assets/images/bg-cloud-room-night.png'),
  night:   require('../../../assets/images/bg-night-room-night.png'),
  me:      require('../../../assets/images/bg-raylene-room-night.png'),
  oracle:  require('../../../assets/images/bg-raylene-room-night.png'),
};

const HAND_FONT = Platform.select({
  ios: 'Noteworthy',
  android: 'casual',
  default: "'Caveat', 'Patrick Hand', 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive",
});

const UNIVERSE_TILE_STYLES = ['polaroid', 'lined', 'notebook'] as const;
const UNIVERSE_TILE_TILT = ['-3deg', '2deg', '-1.5deg', '2.5deg', '-2deg', '1.5deg'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function TeenPagesRoute() {
  const {
    mood,
    setMood,
    journalText,
    setJournalText,
    entries,
    setEntries,
    selectedSekret,
    setSelectedSekret,
    patchJournalEntry,
    teenGender,
  } = useAppContext();

  // ── Companion state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<CompanionId>(() =>
    (COMPANIONS.some(c => c.id === selectedSekret) ? selectedSekret : 'raylene') as CompanionId,
  );
  const [avatarState, setAvatarState] = useState<SekretAvatarState>('neutral');
  const { total: totalPoints } = usePoints();

  // ── Composer state ─────────────────────────────────────────────────────────
  const [locked, setLocked]     = useState(false);
  const [mediaUri, setMediaUri] = useState<string | undefined>();
  const [mediaType, setMediaType] = useState<'photo' | 'video' | undefined>();
  const [toolbarOpen, setToolbarOpen] = useState(false);

  // ── Saving / reply state ───────────────────────────────────────────────────
  const [saving, setSaving]                         = useState(false);
  const [voiceLoading, setVoiceLoading]             = useState(false);
  const [safetyExperience, setSafetyExperience]     = useState<SafetyExperience | null>(null);
  const [comfortNudge, setComfortNudge]             = useState<string | null>(null);
  // audioCache: entryId → data-URI — avoids re-fetching voice for same entry
  const audioCache = useRef<Record<string, string>>({});

  // ── Parent share state (Bridge Summary) ───────────────────────────────────
  const [bridgeShareStatuses, setBridgeShareStatuses] = useState<Map<number, JournalBridgeShareStatus>>(new Map());
  const [linkedParentId, setLinkedParentId] = useState<string | null>(null);
  const [sharingEntryId, setSharingEntryId] = useState<number | null>(null);

  // ── Prompt rotation ────────────────────────────────────────────────────────
  const promptPool = PROMPTS[activeTab] ?? PROMPTS.raylene;
  const [promptIdx, setPromptIdx] = useState(0);
  const rotatePrompt = useCallback(() =>
    setPromptIdx(i => (i + 1) % promptPool.length), [promptPool.length]);

  // Rotate prompt when companion tab changes
  useEffect(() => { setPromptIdx(0); }, [activeTab]);

  // ── Breathe animation (avatar) ─────────────────────────────────────────────
  const breathe = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1.03, duration: 2300, useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 1,    duration: 2300, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  // Load which entries the teen has already shared into Bridge, and who to share to
  useEffect(() => {
    fetchLinkedParentId().then(setLinkedParentId);
    fetchBridgeShareStatusesForJournalEntries().then(result => {
      if (result.ok) setBridgeShareStatuses(result.value);
    });
  }, []);

  const flatListRef = useRef<FlatList<JournalEntry>>(null);
  const composerRef = useRef<TextInput>(null);

  // Newest pages across every tab for the "My little universe" grid.
  const recentPages = useMemo(
    () => [...entries].sort((a, b) => Number(b.id) - Number(a.id)).slice(0, 6),
    [entries],
  );

  // ── Derived data ───────────────────────────────────────────────────────────
  const companion = COMPANIONS.find(c => c.id === activeTab) ?? COMPANIONS[0];

  const aiCompanion = isAiTab(activeTab);
  // activeTab/AiCompanionId is the persisted app_profiles.selected_companion
  // vocabulary (raylene/rylane); normalize to the canonical SekretCharacterId
  // (suhana/sy) at this boundary, since everything downstream (voice, avatar
  // rendering) speaks the canonical vocabulary.
  const companionAvatarId: SekretCharacterId | null = aiCompanion ? normalizeSekretCharacter(activeTab) : null;

  // Entries for current tab, chronological (oldest first for chat timeline)
  const threadEntries = useMemo(
    () =>
      [...entries]
        .filter(e => (e.activeTab || e.source) === activeTab)
        .sort((a, b) => Number(a.id) - Number(b.id)),
    [activeTab, entries],
  );

  const recentHistory = useMemo((): SekretHistoryTurn[] => {
    const slice = threadEntries.slice(-6);
    const turns: SekretHistoryTurn[] = [];
    for (const e of slice) {
      turns.push({ role: 'user', content: e.text });
      if (e.sekretReply) {
        turns.push({ role: 'assistant', content: e.sekretReply });
      }
    }
    return turns;
  }, [threadEntries]);

  // ── Companion tab switch ───────────────────────────────────────────────────
  function chooseTab(id: CompanionId) {
    setActiveTab(id);
    setAvatarState(isAiTab(id) ? 'listening' : 'neutral');
    if (isAiTab(id)) {
      setSelectedSekret(id);
    }
  }

  // ── Media pickers ──────────────────────────────────────────────────────────
  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType('photo');
    }
  }

  async function recordVideo() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
      setMediaType('video');
    }
  }

  // ── Save + AI reply (protected path) ──────────────────────────────────────
  async function saveAndReply() {
    const text = journalText.trim();
    if ((!text && !mediaUri) || saving) return;

    // Pre-flight: synchronous client-side safety check before saving
    if (text && aiCompanion) {
      const preflight = checkTextBeforePost(text, toCompanionId(activeTab));
      if (preflight) setSafetyExperience(preflight);
    }

    const id = Date.now();
    const entry: JournalEntry = {
      id,
      text,
      mood,
      moodTag: mood,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: activeTab,
      activeTab,
      entryMode: 'typed',
      locked,
      imageUri:  mediaUri,
      mediaType,
    };

    setEntries(prev => [...prev, entry]);
    syncJournal(entry);
    setJournalText('');
    setMediaUri(undefined);
    setMediaType(undefined);

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);

    updateSekretMemory({
      selectedSekret: isAiTab(activeTab) ? activeTab : 'raylene',
      mood,
      journalEntries: [{ id: String(id), text, mood, date: new Date().toISOString() }],
    }).catch(() => null);

    if (!aiCompanion) return;

    setSaving(true);
    setAvatarState('thinking');

    try {
      const result = await sendCompanionMessage({
        companionId: toCompanionId(activeTab),
        surface:     'journal',
        text,
        mood,
        history:     recentHistory,
        teenGender,
      });
      const resolvedState = inferState(result.avatarState, mood, result.tone);
      patchJournalEntry(id, { sekretReply: result.reply, sekretAvatarState: resolvedState });
      setAvatarState(resolvedState);

      // Post-reply: surface safety experience if backend flagged this entry
      if (result.safetyFlag) {
        const flagged = await checkForFlaggedItems(toCompanionId(activeTab));
        if (flagged) setSafetyExperience(flagged);
      }

      // Post-reply: comfort nudge if companion suggested a tool
      if (result.suggestedComfortTool) {
        setComfortNudge(result.suggestedComfortTool);
      }
    } catch {
      setAvatarState('neutral');
    } finally {
      setSaving(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  // ── Voice playback (protected: per entry, cached) ─────────────────────────
  async function hearReply(entryId: number | string, replyText: string) {
    if (!replyText || voiceLoading || !companionAvatarId) return;
    setVoiceLoading(true);
    try {
      const key = String(entryId);
      let uri = audioCache.current[key];
      if (!uri) {
        const audio = await fetchSekretVoice({ reply: replyText, characterId: companionAvatarId });
        if (!audio) return;
        uri = `data:${audio.contentType};base64,${audio.audioBase64}`;
        audioCache.current[key] = uri;
      }
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } finally {
      setVoiceLoading(false);
    }
  }

  // ── Share with Parent Window (Bridge Summary) ─────────────────────────────
  // Passes the real journal_entries.id as the Bridge source — never a
  // synthetic/placeholder id — so the generated summary is always traceable
  // back to a specific entry this teen actually wrote.
  const handleShareWithParent = useCallback(async (entryId: number) => {
    if (sharingEntryId !== null) return;

    const current = bridgeShareStatuses.get(entryId);
    if (current && ACTIVE_BRIDGE_SHARE_STATUSES.has(current.status)) {
      setSharingEntryId(entryId);
      const result = await revokeBridgeShareRequest(current.requestId);
      setSharingEntryId(null);
      if (!result.ok) {
        Alert.alert('could not revoke', result.message);
        return;
      }
      setBridgeShareStatuses(prev => {
        const next = new Map(prev);
        next.set(entryId, { requestId: current.requestId, status: 'revoked' });
        return next;
      });
      return;
    }

    // A terminal status (revoked/expired/failed) falls through to the same
    // createBridgeShareRequest call below — reusing the same idempotency key
    // causes the RPC to reactivate the existing request rather than reject it.

    if (!linkedParentId) {
      Alert.alert('no linked parent yet', 'Connect with a parent or trusted adult before sharing into Bridge.');
      return;
    }

    const preview = buildBridgeSharePreview(linkedParentId, [{ kind: 'journal', sourceId: String(entryId) }]);
    if (!preview.ok) {
      Alert.alert('could not share right now', preview.message);
      return;
    }

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Share with Parent Window?',
        `${preview.value.notice}\n\nYour parent will NOT see this entry's raw text — only a generated summary. To create that summary, this entry's text is sent to our AI provider for processing.`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Share', style: 'default', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmed) return;

    setSharingEntryId(entryId);
    const result = await createBridgeShareRequest({
      parentUserId: linkedParentId,
      idempotencyKey: `journal-${entryId}`,
      sources: [{ kind: 'journal', sourceId: String(entryId) }],
    });

    if (!result.ok) {
      setSharingEntryId(null);
      Alert.alert('could not share right now', result.message);
      return;
    }

    const refreshed = await fetchBridgeShareStatusesForJournalEntries();
    setSharingEntryId(null);
    if (refreshed.ok) {
      setBridgeShareStatuses(refreshed.value);
    } else {
      setBridgeShareStatuses(prev => {
        const next = new Map(prev);
        next.set(entryId, { requestId: result.value.requestId, status: result.value.status });
        return next;
      });
    }
  }, [sharingEntryId, bridgeShareStatuses, linkedParentId]);

  // ── Render each journal entry as a chat exchange ───────────────────────────
  const renderEntry = useCallback(({ item: entry }: { item: JournalEntry }) => {
    const entryKey = String(entry.id);
    return (
      <View style={s.exchange} key={entryKey}>
        {/* Teen message bubble */}
        <View style={s.teenRow}>
          <TouchableOpacity
            onLongPress={() => router.push(`/(teen)/pages/${entry.id}` as any)}
            style={[s.teenBubble, { borderColor: `${companion.accent}30` }]}
          >
            {entry.imageUri ? (
              entry.mediaType === 'video' ? (
                <View style={s.videoThumb}>
                  <Text style={s.videoIcon}>📹</Text>
                  <Text style={s.videoLabel}>Video Bip</Text>
                </View>
              ) : (
                <Image source={{ uri: entry.imageUri }} style={s.bubbleMedia} />
              )
            ) : null}
            {entry.text ? (
              <Text style={s.teenText}>{entry.text}</Text>
            ) : null}
            <View style={s.entryMeta}>
              <Text style={s.metaTime}>{entry.date} · {entry.time}</Text>
              {entry.moodTag ? (
                <Text style={[s.metaMood, { color: companion.accent }]}>#{entry.moodTag}</Text>
              ) : null}
              {entry.locked ? <Text style={s.metaLock}>🔒</Text> : null}
              {entry.pinned ? <Text style={s.metaPin}>📌</Text> : null}
              {!entry.locked && (() => {
                const shareStatus = bridgeShareStatuses.get(entry.id);
                const isActive = !!shareStatus && ACTIVE_BRIDGE_SHARE_STATUSES.has(shareStatus.status);
                const isTerminal = !!shareStatus && !isActive;
                const busy = sharingEntryId === entry.id;
                const label = isTerminal
                  ? `Bridge share ${shareStatus!.status} — tap to share again`
                  : isActive
                    ? 'Shared into Bridge — tap to revoke'
                    : 'Share with Parent Window';
                return (
                  <TouchableOpacity
                    onPress={() => handleShareWithParent(entry.id)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={s.shareIcon}>
                      {busy ? '…' : isActive ? '💜' : isTerminal ? '↻' : '👁️'}
                    </Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          </TouchableOpacity>
        </View>

        {/* Companion reply bubble */}
        {entry.sekretReply ? (
          <View style={s.replyRow}>
            {companionAvatarId ? (
              <Image
                source={avatarImage(companionAvatarId, (entry.sekretAvatarState ?? 'neutral') as SekretAvatarState)}
                style={s.replyAvatar}
              />
            ) : null}
            <View style={s.replyBubble}>
              <Text style={[s.replyName, { color: companion.accent }]}>
                {companion.name}
              </Text>
              <Text style={s.replyText}>{entry.sekretReply}</Text>
              <TouchableOpacity
                onPress={() => hearReply(entry.id, entry.sekretReply!)}
                disabled={voiceLoading}
                style={s.hearBtn}
              >
                <Text style={s.hearBtnText}>
                  {voiceLoading ? 'loading…' : '▶ hear them'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  }, [companion, companionAvatarId, voiceLoading, bridgeShareStatuses, sharingEntryId, handleShareWithParent]);

  // ── Top avatar strip ───────────────────────────────────────────────────────
  const renderAvatarStrip = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRail}>
      {COMPANIONS.map(c => {
        const active = c.id === activeTab;
        const unlocked = totalPoints >= COMPANION_UNLOCK_PTS[c.id as CompanionId];
        return (
          <TouchableOpacity
            key={c.id}
            onPress={() => unlocked ? chooseTab(c.id as CompanionId) : undefined}
            activeOpacity={unlocked ? 0.7 : 1}
            style={[s.tab, active && { borderColor: c.accent, backgroundColor: `${c.accent}18` }, !unlocked && s.tabLocked]}
          >
            {c.id !== 'me' && c.id !== 'oracle' ? (
              <Image
                source={avatarImage(c.id as SekretCharacterId, active ? avatarState : 'neutral')}
                style={[s.tabImg, !unlocked && { opacity: 0.3 }]}
              />
            ) : (
              <Text style={[s.tabEmoji, !unlocked && { opacity: 0.3 }]}>{c.id === 'me' ? '🪞' : '🔮'}</Text>
            )}
            {unlocked ? (
              <Text style={[s.tabName, active && { color: c.accent }]}>{c.name}</Text>
            ) : (
              <Text style={s.tabLockBadge}>{COMPANION_UNLOCK_PTS[c.id as CompanionId]} pts</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── Compact expandable composer toolbar ───────────────────────────────────
  const renderToolbar = () => (
    <View style={s.toolbar}>
      <TouchableOpacity onPress={() => setToolbarOpen(o => !o)} style={s.toolbarToggle}>
        <Text style={s.toolbarToggleText}>{toolbarOpen ? '▾ less' : '+ mood · lock · attach'}</Text>
      </TouchableOpacity>

      {toolbarOpen && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moodRail}>
            {MOOD_TAGS.map(tag => (
              <TouchableOpacity
                key={tag.value}
                onPress={() => setMood(tag.value)}
                style={[
                  s.moodChip,
                  mood === tag.value && { borderColor: companion.accent, backgroundColor: `${companion.accent}22` },
                ]}
              >
                <Text style={[s.moodChipText, mood === tag.value && { color: companion.accent }]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={s.attachRow}>
            <TouchableOpacity
              onPress={() => setLocked(l => !l)}
              style={[s.iconBtn, locked && { borderColor: companion.accent, backgroundColor: `${companion.accent}18` }]}
            >
              <Text style={s.iconBtnText}>{locked ? '🔒' : '🔓'}</Text>
              <Text style={s.iconBtnLabel}>{locked ? 'private' : 'lock it'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={choosePhoto}
              style={[s.iconBtn, mediaType === 'photo' && { borderColor: companion.accent, backgroundColor: `${companion.accent}18` }]}
            >
              <Text style={s.iconBtnText}>🖼️</Text>
              <Text style={s.iconBtnLabel}>{mediaType === 'photo' ? 'photo ✓' : 'photo'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={recordVideo}
              style={[s.iconBtn, mediaType === 'video' && { borderColor: companion.accent, backgroundColor: `${companion.accent}18` }]}
            >
              <Text style={s.iconBtnText}>📹</Text>
              <Text style={s.iconBtnLabel}>{mediaType === 'video' ? 'video ✓' : 'video'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push(TEEN_ROUTES.voiceBip as any)} style={s.iconBtn}>
              <Text style={s.iconBtnText}>🎙️</Text>
              <Text style={s.iconBtnLabel}>voice</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {mediaUri ? (
        <TouchableOpacity
          onPress={() => { setMediaUri(undefined); setMediaType(undefined); }}
          style={s.mediaPreviewWrap}
        >
          {mediaType === 'video' ? (
            <Video source={{ uri: mediaUri }} style={s.mediaPreview} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
          ) : (
            <Image source={{ uri: mediaUri }} style={s.mediaPreview} />
          )}
          <Text style={s.mediaRemove}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  // ── Composer prompt rail ────────────────────────────────────────────────────
  const renderPromptRail = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.promptRail}>
      {promptPool.map((p, i) => (
        <TouchableOpacity
          key={i}
          onPress={() => {
            setJournalText(p);
            setPromptIdx(i);
          }}
          style={[
            s.promptChip,
            i === promptIdx && { borderColor: companion.accent, backgroundColor: `${companion.accent}18` },
          ]}
        >
          <Text style={[s.promptChipText, i === promptIdx && { color: companion.accent }]} numberOfLines={2}>
            {p}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ── My little universe tile ─────────────────────────────────────────────────
  const renderUniverseTile = (entry: JournalEntry, index: number) => {
    const variant = UNIVERSE_TILE_STYLES[index % UNIVERSE_TILE_STYLES.length];
    const caption = entry.moodTag ? `#${entry.moodTag}` : entry.date;
    const showPhoto = !entry.locked && entry.imageUri && entry.mediaType !== 'video';
    return (
      <TouchableOpacity
        key={String(entry.id)}
        onPress={() => router.push(`/(teen)/pages/${entry.id}` as any)}
        accessibilityRole="button"
        accessibilityLabel={entry.locked ? 'Open private page' : 'Open page'}
        style={[
          s.tile,
          variant === 'polaroid' && s.tilePolaroid,
          variant === 'lined' && s.tileLined,
          variant === 'notebook' && s.tileNotebook,
          { transform: [{ rotate: UNIVERSE_TILE_TILT[index % UNIVERSE_TILE_TILT.length] }] },
        ]}
      >
        <View style={s.tileTape} />
        {showPhoto ? (
          <Image source={{ uri: entry.imageUri }} style={s.tilePhoto} />
        ) : (
          <View style={s.tileBody}>
            <Text
              style={[s.tileText, variant === 'notebook' && s.tileTextLight]}
              numberOfLines={4}
            >
              {entry.locked
                ? '🔒 private page'
                : entry.mediaType === 'video'
                  ? '🎬 Video Bip'
                  : entry.text || 'a page ♡'}
            </Text>
          </View>
        )}
        <Text style={[s.tileCaption, variant === 'notebook' && s.tileTextLight]} numberOfLines={1}>
          {caption} ♡
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Scrapbook home header ──────────────────────────────────────────────────
  const renderScrapbookHeader = () => (
    <View>
      <View style={s.topBar}>
        <View />
        <TouchableOpacity
          onPress={() => router.push('/(teen)/pages/history' as any)}
          style={s.libraryBtn}
          accessibilityRole="button"
          accessibilityLabel="All entries"
        >
          <Text style={s.libraryBtnText}>📚</Text>
          <Text style={s.libraryBtnLabel}>all entries</Text>
        </TouchableOpacity>
      </View>

      <View style={s.titleWrap}>
        <View style={s.titlePaper}>
          <View style={[s.tape, s.tapeLeft]} />
          <View style={[s.tape, s.tapeRight]} />
          <Text style={s.titleHand} accessibilityRole="header">Se&apos;kret Pages ♡</Text>
        </View>
        <View style={s.subtitlePaper}>
          <Text style={s.subtitleHand}>your thoughts live here ♡</Text>
        </View>
      </View>

      <View style={s.dearCard}>
        <Text style={s.dearHeart}>♡</Text>
        <Text style={s.dearTitle}>Dear me…</Text>
        <Text style={s.dearPrompt}>What&apos;s on your mind today?</Text>
        <View style={s.dearActions}>
          {[
            { key: 'photo', icon: '📷', label: 'Photo', onPress: choosePhoto },
            { key: 'voice', icon: '🎙️', label: 'Voice Bip', onPress: () => router.push(TEEN_ROUTES.voiceBip as any) },
            { key: 'write', icon: '✏️', label: 'Write', onPress: () => composerRef.current?.focus() },
            { key: 'stickers', icon: '😊', label: 'Stickers', onPress: () => setToolbarOpen(true) },
            { key: 'video', icon: '🎬', label: 'Video', onPress: recordVideo },
          ].map(action => (
            <TouchableOpacity
              key={action.key}
              onPress={action.onPress}
              style={s.dearAction}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text style={s.dearActionIcon}>{action.icon}</Text>
              <Text style={s.dearActionLabel} numberOfLines={1}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push('/(teen)/pages/new' as any)}
        accessibilityRole="button"
        accessibilityLabel="Make a Page"
        style={s.makePageWrap}
      >
        <LinearGradient
          colors={['#8f5bd8', '#b07af0', '#8f5bd8']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={s.makePage}
        >
          <Text style={s.makePageText}>+   Make a Page   ✳</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.sectionRow}>
        <View style={s.sectionPaper}>
          <Text style={s.sectionHand}>♡ My little universe</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(teen)/pages/history' as any)}
          accessibilityRole="button"
          accessibilityLabel="See all pages"
        >
          <Text style={s.seeAll}>See all →</Text>
        </TouchableOpacity>
      </View>

      {recentPages.length > 0 ? (
        <View style={s.universeGrid}>
          {recentPages.map(renderUniverseTile)}
        </View>
      ) : (
        <View style={[s.tile, s.tileLined, s.universeEmpty]}>
          <View style={s.tileTape} />
          <Text style={s.tileText}>your pages will live here ♡</Text>
          <Text style={s.tileCaption}>make your first one above</Text>
        </View>
      )}

      <View style={s.sectionRow}>
        <View style={s.sectionPaper}>
          <Text style={s.sectionHand}>talk it out with…</Text>
        </View>
      </View>

      {renderAvatarStrip()}

      <View style={s.companionRow}>
        {companionAvatarId ? (
          <Animated.Image
            source={avatarImage(companionAvatarId, avatarState)}
            style={[s.headerAvatar, { transform: [{ scale: breathe }] }]}
            resizeMode="contain"
          />
        ) : (
          <Text style={s.headerModeIcon}>{activeTab === 'me' ? '🪞' : '🔮'}</Text>
        )}
        <View style={s.companionMeta}>
          <Text style={[s.kicker, { color: companion.accent }]}>SE&apos;KRET PAGES</Text>
          <Text style={s.title}>{companion.name}</Text>
          <Text style={s.companionVibe}>{companion.vibe}</Text>
        </View>
      </View>
    </View>
  );

  // ── Typing indicator ───────────────────────────────────────────────────────
  const renderTypingIndicator = () =>
    saving && companionAvatarId ? (
      <View style={s.typingRow}>
        <Image source={avatarImage(companionAvatarId, 'thinking')} style={s.typingAvatar} />
        <View style={s.typingBubble}>
          <Text style={[s.typingText, { color: companion.accent }]}>
            {companion.name} is thinking…
          </Text>
        </View>
      </View>
    ) : null;

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <ImageBackground
        source={PAGES_BACKDROP[activeTab]}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={['rgba(16,9,27,0.35)', 'rgba(16,9,27,0.55)', 'rgba(9,7,17,0.88)']}
        style={StyleSheet.absoluteFill}
      />
      <AmbientWeatherOverlay />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        {/* Scrapbook home + companion conversation */}
        <FlatList
          ref={flatListRef}
          data={threadEntries}
          keyExtractor={e => String(e.id)}
          renderItem={renderEntry}
          contentContainerStyle={s.thread}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderScrapbookHeader()}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>{activeTab === 'me' ? '🪞' : activeTab === 'oracle' ? '🔮' : '💜'}</Text>
              <Text style={[s.emptyTitle, { color: companion.accent }]}>
                {companion.name === 'Me' ? 'Your private pages' : `Start talking to ${companion.name}`}
              </Text>
              <Text style={s.emptyBody}>{companion.vibe}</Text>
            </View>
          }
          ListFooterComponent={renderTypingIndicator}
        />

        {/* Loop nudge: companion suggested Comfort after heavy reply */}
        {comfortNudge && !saving && (
          <View style={s.nudgeWrap}>
            <Text style={[s.nudgeText, { color: companion.accent }]}>
              {companion.name} thinks Comfort might help right now
            </Text>
            <View style={s.nudgeRow}>
              <TouchableOpacity
                style={[s.nudgeBtn, { borderColor: `${companion.accent}66` }]}
                onPress={() => {
                  setComfortNudge(null);
                  router.push('/(teen)/comfort' as any);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open Comfort"
              >
                <Text style={s.nudgeBtnText}>open Comfort</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setComfortNudge(null)}
                style={s.nudgeDismiss}
                accessibilityRole="button"
                accessibilityLabel="Dismiss nudge"
              >
                <Text style={s.nudgeDismissText}>I'm okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Composer */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          {renderPromptRail()}
          {renderToolbar()}

          <View style={[s.composerRow, { borderTopColor: `${companion.accent}25` }]}>
            <TextInput
              ref={composerRef}
              multiline
              value={journalText}
              onChangeText={setJournalText}
              onFocus={() => setAvatarState(aiCompanion ? 'listening' : 'neutral')}
              placeholder={promptPool[promptIdx]}
              placeholderTextColor="#7a6e83"
              style={s.composerInput}
              textAlignVertical="top"
              maxLength={2000}
            />
            <TouchableOpacity
              onPress={saveAndReply}
              disabled={(!journalText.trim() && !mediaUri) || saving}
              style={[
                s.sendBtn,
                { backgroundColor: companion.accent },
                ((!journalText.trim() && !mediaUri) || saving) && s.sendBtnDisabled,
              ]}
            >
              <Text style={s.sendBtnText}>{saving ? '…' : '💜'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Safety experience sheet — rendered above all page content */}
      <SafetyExperienceSheet
        experience={safetyExperience}
        onDismiss={() => setSafetyExperience(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090711' },
  safe: { flex: 1 },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
  libraryBtn: { alignItems: 'center', justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(30,20,40,0.55)', paddingHorizontal: 12, paddingVertical: 6 },
  libraryBtnText: { fontSize: 15 },
  libraryBtnLabel: { color: '#e8dcef', fontSize: 8, fontWeight: '800', marginTop: 1 },

  // Clears the app-wide SideSafeBackButton chip pinned at the top-left.
  titleWrap: { alignItems: 'center', marginTop: 40, marginBottom: 14 },
  titlePaper: { backgroundColor: '#f4ead8', paddingHorizontal: 22, paddingVertical: 10, transform: [{ rotate: '-2deg' }], borderRadius: 3, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  titleHand: { fontFamily: HAND_FONT, color: '#1f1a1c', fontSize: 38, fontWeight: '700' },
  subtitlePaper: { backgroundColor: '#efe3cd', paddingHorizontal: 16, paddingVertical: 5, marginTop: -4, transform: [{ rotate: '1.5deg' }], borderRadius: 2, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  subtitleHand: { fontFamily: HAND_FONT, color: '#2a2326', fontSize: 16 },
  tape: { position: 'absolute', top: -8, width: 46, height: 16, backgroundColor: 'rgba(214,190,150,0.75)' },
  tapeLeft: { left: -10, transform: [{ rotate: '-28deg' }] },
  tapeRight: { right: -10, transform: [{ rotate: '24deg' }] },

  dearCard: { borderRadius: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(58,40,70,0.58)', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, marginBottom: 14 },
  dearHeart: { position: 'absolute', top: 14, right: 18, color: '#f3a6d4', fontSize: 26 },
  dearTitle: { fontFamily: HAND_FONT, color: '#fff', fontSize: 28 },
  dearPrompt: { fontFamily: HAND_FONT, color: '#efe6f5', fontSize: 18, marginTop: 2, marginBottom: 12 },
  dearActions: { flexDirection: 'row', gap: 7 },
  dearAction: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)', backgroundColor: 'rgba(255,255,255,0.08)', paddingVertical: 10, gap: 4 },
  dearActionIcon: { fontSize: 20 },
  dearActionLabel: { fontFamily: HAND_FONT, color: '#f6eefb', fontSize: 12 },

  makePageWrap: { alignSelf: 'center', width: '80%', marginBottom: 18, borderRadius: 999, shadowColor: '#b07af0', shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  makePage: { borderRadius: 999, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  makePageText: { fontFamily: HAND_FONT, color: '#fff', fontSize: 22 },

  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionPaper: { backgroundColor: '#f1e6d2', paddingHorizontal: 14, paddingVertical: 5, transform: [{ rotate: '-1.5deg' }], borderRadius: 2, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  sectionHand: { fontFamily: HAND_FONT, color: '#1f1a1c', fontSize: 20 },
  seeAll: { fontFamily: HAND_FONT, color: '#f6eefb', fontSize: 16 },

  universeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 16, marginBottom: 20 },
  universeEmpty: { width: '100%', minHeight: 110, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  tile: { width: '31%', minHeight: 132, padding: 8, borderRadius: 3, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 5 },
  tilePolaroid: { backgroundColor: '#f3ead9' },
  tileLined: { backgroundColor: '#f6d9e3', borderLeftWidth: 3, borderLeftColor: '#e7a6bf' },
  tileNotebook: { backgroundColor: '#17121f', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  tileTape: { position: 'absolute', top: -7, alignSelf: 'center', width: 38, height: 13, backgroundColor: 'rgba(240,170,200,0.7)', transform: [{ rotate: '-4deg' }] },
  tilePhoto: { width: '100%', height: 84, resizeMode: 'cover', backgroundColor: '#2a2030' },
  tileBody: { flex: 1, justifyContent: 'center', paddingVertical: 4 },
  tileText: { fontFamily: HAND_FONT, color: '#2a2326', fontSize: 14, lineHeight: 18 },
  tileTextLight: { color: '#f3e9fb' },
  tileCaption: { fontFamily: HAND_FONT, color: '#4a3f45', fontSize: 12, marginTop: 6 },

  companionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, backgroundColor: 'rgba(20,12,30,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 10, marginBottom: 16 },
  companionMeta: { flex: 1 },
  companionVibe: { color: '#c9bdd4', fontSize: 11, marginTop: 2 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 1 },
  headerAvatar: { width: 54, height: 54 },
  headerModeIcon: { width: 54, textAlign: 'center', fontSize: 34 },

  tabRail: { gap: 8, paddingBottom: 12 },
  tab: { width: 72, minHeight: 70, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(243,234,217,0.10)', alignItems: 'center', justifyContent: 'center', padding: 6 },
  tabImg: { width: 38, height: 38, resizeMode: 'contain' },
  tabEmoji: { fontSize: 24 },
  tabName: { fontFamily: HAND_FONT, color: '#e8dcef', fontSize: 13, marginTop: 3 },
  tabLocked: { opacity: 0.55 },
  tabLockBadge: { color: '#b3a6bd', fontSize: 8, fontWeight: '800', marginTop: 3 },

  thread: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 20 },

  exchange: { marginBottom: 18 },
  teenRow: { alignItems: 'flex-end', marginBottom: 8 },
  teenBubble: { maxWidth: '82%', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderRadius: 20, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
  teenText: { color: '#f0eaf4', fontSize: 15, lineHeight: 23 },
  bubbleMedia: { width: '100%', height: 140, borderRadius: 12, marginBottom: 8, resizeMode: 'cover' },
  videoThumb: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, marginBottom: 8 },
  videoIcon: { fontSize: 18 },
  videoLabel: { color: '#a99fb2', fontSize: 12, fontWeight: '700' },
  entryMeta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  metaTime: { color: '#7a7086', fontSize: 9 },
  metaMood: { fontSize: 9, fontWeight: '800' },
  metaLock:  { fontSize: 10 },
  metaPin:   { fontSize: 10 },
  shareIcon: { fontSize: 10, opacity: 0.6 },

  replyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginLeft: 6 },
  replyAvatar: { width: 34, height: 34, resizeMode: 'contain', marginTop: 2 },
  replyBubble: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
  replyName: { fontSize: 9, fontWeight: '900', marginBottom: 5, letterSpacing: 0.6 },
  replyText: { color: '#cfc5d5', fontSize: 14, lineHeight: 22 },
  hearBtn: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: '#ffffff1a', paddingHorizontal: 10, paddingVertical: 5 },
  hearBtnText: { color: '#c4b9cc', fontSize: 9, fontWeight: '800' },

  typingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginLeft: 6, marginTop: 4, marginBottom: 8 },
  typingAvatar: { width: 32, height: 32, resizeMode: 'contain', opacity: 0.7 },
  typingBubble: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  typingText: { fontSize: 12, fontStyle: 'italic' },

  emptyState: { alignItems: 'center', paddingTop: 12, paddingBottom: 12, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginBottom: 6, textAlign: 'center' },
  emptyBody: { color: '#7a6e83', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  promptRail: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  promptChip: { maxWidth: 200, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 8 },
  promptChipText: { color: '#9a8fa3', fontSize: 11, lineHeight: 16 },

  toolbar: { paddingHorizontal: 12, paddingBottom: 4 },
  toolbarToggle: { alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 2, marginBottom: 4 },
  toolbarToggleText: { color: '#7a6e83', fontSize: 10, fontWeight: '700' },
  moodRail: { gap: 6, paddingBottom: 8 },
  moodChip: { borderRadius: 999, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 6 },
  moodChipText: { color: '#9a8fa3', fontSize: 11, fontWeight: '700' },
  attachRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  iconBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 8, alignItems: 'center', gap: 3 },
  iconBtnText: { fontSize: 16 },
  iconBtnLabel: { color: '#9a8fa3', fontSize: 9, fontWeight: '700' },
  mediaPreviewWrap: { marginBottom: 8, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  mediaPreview: { width: '100%', height: 120, borderRadius: 12, resizeMode: 'cover' },
  mediaRemove: { position: 'absolute', top: 6, right: 8, color: '#fff', fontSize: 13, fontWeight: '900', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },

  nudgeWrap:        { marginHorizontal: 12, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 16, padding: 12 },
  nudgeText:        { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  nudgeRow:         { flexDirection: 'row', gap: 10 },
  nudgeBtn:         { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  nudgeBtnText:     { color: '#f0eaf4', fontSize: 12, fontWeight: '700' },
  nudgeDismiss:     { justifyContent: 'center', paddingHorizontal: 12 },
  nudgeDismissText: { color: '#64748b', fontSize: 11 },

  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 20, borderTopWidth: 1, backgroundColor: 'rgba(14,9,22,0.72)' },
  composerInput: { flex: 1, color: '#f0eaf4', fontSize: 15, lineHeight: 23, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', maxHeight: 120 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18 },
  sendBtnDisabled: { opacity: 0.30 },
});
