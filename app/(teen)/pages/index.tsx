// app/(teen)/pages/index.tsx
// SE'KRET PAGES — Companion Journal
//
// PROTECTED DATA CONTRACT (must not be removed or bypassed):
//   ✓ sendCompanionMessage   — sole AI call for companion replies
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
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
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
import { IMAGES, getRoomBg } from '@/constants/theme';
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
const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = Math.floor((SCREEN_W - 32 - 12) / 3); // 3-col grid, 16px side pad, 2×6px gap

// ─── Companion manifest ───────────────────────────────────────────────────────
const COMPANIONS = [
  { id: 'raylene', name: 'Suhana', accent: '#f08bc5', vibe: 'warm + protective' },
  { id: 'rylane',  name: 'Sy',     accent: '#76a7ff', vibe: 'direct + loyal'    },
  { id: 'cloud',   name: 'Cloud',  accent: '#8ed9e7', vibe: 'soft + no pressure' },
  { id: 'night',   name: 'Night',  accent: '#9a8ee8', vibe: 'quiet + steady'    },
  { id: 'me',      name: 'Me',     accent: '#b8a9c9', vibe: 'private pages'     },
  { id: 'oracle',  name: 'Joseema', accent: '#c7b87a', vibe: 'guided discovery' },
] as const;

type CompanionId = (typeof COMPANIONS)[number]['id'];
type AiCompanionId = 'raylene' | 'rylane' | 'cloud' | 'night';

function isAiTab(id: CompanionId): id is AiCompanionId {
  return id === 'raylene' || id === 'rylane' || id === 'cloud' || id === 'night';
}

// ─── Companion prompts ────────────────────────────────────────────────────────
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

// ─── Page tabs + filters ──────────────────────────────────────────────────────
const PAGE_TABS = [
  { id: 'pages',     label: '♡✨ My Pages'  },
  { id: 'favorites', label: '☆ Favorites'   },
  { id: 'voice',     label: '🎙 Voice Bips' },
  { id: 'shared',    label: '👥 Shared'     },
] as const;

const PAGE_FILTERS = [
  { id: 'all',      label: 'All'      },
  { id: 'diary',    label: '📔 Diary'  },
  { id: 'photos',   label: '📷 Photos' },
  { id: 'voice',    label: '🎙 Voice'  },
  { id: 'stickers', label: '😊 Stickers' },
  { id: 'music',    label: '🎵 Music'  },
  { id: 'dreams',   label: '💭 Dreams' },
] as const;

// ─── Mood tags ────────────────────────────────────────────────────────────────
const MOOD_TAGS = [
  { label: '😌 okay',    value: 'okay'    },
  { label: '💜 soft',    value: 'soft'    },
  { label: '😔 heavy',   value: 'heavy'   },
  { label: '🔥 fired up', value: 'fired'  },
  { label: '😶 numb',    value: 'numb'    },
  { label: '🌊 anxious', value: 'anxious' },
  { label: '✨ hopeful', value: 'hopeful' },
];

// ─── Companion unlock thresholds ──────────────────────────────────────────────
const COMPANION_UNLOCK_PTS: Record<CompanionId, number> = {
  raylene: 0, me: 0, oracle: 0,
  rylane: 50, cloud: 150, night: 350,
};

// ─── Avatar helpers ───────────────────────────────────────────────────────────
const PAGES_COMPANION_POSES = {
  raylene: { neutral: 'neutral', listening: 'listening', thinking: 'thinking', comforting: 'encouraging', happy: 'happy', concerned: 'encouraging', responding: 'writing' },
  rylane:  { neutral: 'neutral', listening: 'listening', thinking: 'thinking', comforting: 'calm',        happy: 'happy', concerned: 'encouraging', responding: 'writing' },
  night:   { neutral: 'neutral', listening: 'listening', thinking: 'thinking', comforting: 'comfort',     happy: 'happy', concerned: 'comfort',      responding: 'writing' },
} as const;

function normalizeAvatar(value?: string): SekretCharacterId {
  if (value === 'sy' || value === 'rylane') return 'sy';
  if (value === 'cloud') return 'cloud';
  if (value === 'night') return 'night';
  return 'suhana';
}

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
    neutral: IMAGES.cloudAvatarNeutral, listening: IMAGES.cloudAvatarThinking,
    thinking: IMAGES.cloudAvatarThinking, comforting: IMAGES.cloudAvatarWindow,
    happy: IMAGES.cloudAvatarHappy, concerned: IMAGES.cloudAvatarWindow,
    responding: IMAGES.cloudAvatarWriting,
  };
  return cloud[state] ?? cloud.neutral;
}

function inferState(state: SekretAvatarState, mood?: string, tone?: string): SekretAvatarState {
  if (state !== 'neutral') return state;
  const signal = `${mood ?? ''} ${tone ?? ''}`.toLowerCase();
  if (/hope|happy|good|proud|okay/.test(signal))                   return 'happy';
  if (/heavy|hurt|sad|numb|worried|safety|concern/.test(signal))   return 'concerned';
  if (/soft|comfort|calm|gentle|quiet/.test(signal))               return 'comforting';
  return 'responding';
}

// Chunk array into rows of n
function chunkArr<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

// Scrapbook card background based on entry index for visual variety
const NOTE_BG = ['rgba(252,228,236,0.92)', 'rgba(240,230,215,0.92)', 'rgba(226,220,245,0.88)', 'rgba(220,232,252,0.88)'];
const NOTE_FG = ['#4a2535', '#3d2e1e', '#2e2448', '#1e2d44'];

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
  const [avatarState, setAvatarState]         = useState<SekretAvatarState>('neutral');
  const [companionChatOpen, setCompanionChatOpen] = useState(false);
  const { total: totalPoints } = usePoints();

  // ── Composer state ─────────────────────────────────────────────────────────
  const [locked, setLocked]       = useState(false);
  const [mediaUri, setMediaUri]   = useState<string | undefined>();
  const [mediaType, setMediaType] = useState<'photo' | 'video' | undefined>();
  const [toolbarOpen, setToolbarOpen] = useState(false);

  // ── Pages grid state ───────────────────────────────────────────────────────
  const [pageTab,    setPageTab]    = useState<typeof PAGE_TABS[number]['id']>('pages');
  const [pageFilter, setPageFilter] = useState<typeof PAGE_FILTERS[number]['id']>('all');

  // ── Saving / reply state ───────────────────────────────────────────────────
  const [saving, setSaving]                     = useState(false);
  const [voiceLoading, setVoiceLoading]         = useState(false);
  const [safetyExperience, setSafetyExperience] = useState<SafetyExperience | null>(null);
  const [comfortNudge, setComfortNudge]         = useState<string | null>(null);
  const audioCache = useRef<Record<string, string>>({});

  // ── Bridge share state ────────────────────────────────────────────────────
  const [bridgeShareStatuses, setBridgeShareStatuses] = useState<Map<number, JournalBridgeShareStatus>>(new Map());
  const [linkedParentId, setLinkedParentId]           = useState<string | null>(null);
  const [sharingEntryId, setSharingEntryId]           = useState<number | null>(null);

  // ── Prompt rotation ────────────────────────────────────────────────────────
  const promptPool  = PROMPTS[activeTab] ?? PROMPTS.raylene;
  const [promptIdx, setPromptIdx] = useState(0);
  useEffect(() => { setPromptIdx(0); }, [activeTab]);

  // ── Breathe animation ─────────────────────────────────────────────────────
  const breathe = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.03, duration: 2300, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1,    duration: 2300, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  useEffect(() => {
    fetchLinkedParentId().then(setLinkedParentId);
    fetchBridgeShareStatusesForJournalEntries().then(result => {
      if (result.ok) setBridgeShareStatuses(result.value);
    });
  }, []);

  const flatListRef  = useRef<FlatList<JournalEntry>>(null);
  const textInputRef = useRef<TextInput>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const companion = COMPANIONS.find(c => c.id === activeTab) ?? COMPANIONS[0];

  const character: 'raylene' | 'rylane' = selectedSekret === 'rylane' ? 'rylane' : 'raylene';
  const hour      = new Date().getHours();
  const timeOfDay = hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';
  const roomBg    = getRoomBg(character, timeOfDay as any);

  const aiCompanion       = isAiTab(activeTab);
  const companionAvatarId: SekretCharacterId | null = aiCompanion ? normalizeSekretCharacter(activeTab) : null;

  // Thread entries for companion chat modal (filtered by companion, oldest first)
  const threadEntries = useMemo(
    () => [...entries].filter(e => (e.activeTab || e.source) === activeTab).sort((a, b) => Number(a.id) - Number(b.id)),
    [activeTab, entries],
  );

  const recentHistory = useMemo((): SekretHistoryTurn[] => {
    const slice = threadEntries.slice(-6);
    const turns: SekretHistoryTurn[] = [];
    for (const e of slice) {
      turns.push({ role: 'user', content: e.text });
      if (e.sekretReply) turns.push({ role: 'assistant', content: e.sekretReply });
    }
    return turns;
  }, [threadEntries]);

  // Latest entry that has a companion reply — shown as a reply card
  const latestReplyEntry = useMemo(() =>
    [...entries].filter(e => e.sekretReply).sort((a, b) => Number(b.id) - Number(a.id))[0] ?? null,
    [entries],
  );
  const latestReplyComp = latestReplyEntry
    ? COMPANIONS.find(c => c.id === (latestReplyEntry.activeTab || latestReplyEntry.source)) ?? null
    : null;
  const latestReplyAvatarId: SekretCharacterId | null = latestReplyComp && isAiTab(latestReplyComp.id as CompanionId)
    ? normalizeSekretCharacter(latestReplyComp.id as AiCompanionId)
    : null;

  // Pages grid: all entries filtered by tab + chip
  const filteredEntries = useMemo(() => {
    let result = [...entries].sort((a, b) => Number(b.id) - Number(a.id));
    if (pageTab === 'favorites') result = result.filter(e => e.pinned);
    if (pageTab === 'voice')     result = result.filter(e => e.mediaType === 'audio');
    if (pageTab === 'shared')    result = result.filter(e => {
      const st = bridgeShareStatuses.get(e.id);
      return st && ACTIVE_BRIDGE_SHARE_STATUSES.has(st.status);
    });
    if (pageFilter === 'photos')  result = result.filter(e => e.imageUri && e.mediaType !== 'video');
    if (pageFilter === 'voice')   result = result.filter(e => e.mediaType === 'audio');
    if (pageFilter === 'diary')   result = result.filter(e => !e.imageUri && !e.mediaType);
    return result;
  }, [entries, pageTab, pageFilter, bridgeShareStatuses]);

  // ── Companion tab switch ───────────────────────────────────────────────────
  function chooseTab(id: CompanionId) {
    setActiveTab(id);
    setAvatarState(isAiTab(id) ? 'listening' : 'neutral');
    if (isAiTab(id)) setSelectedSekret(id);
  }

  // ── Media pickers ──────────────────────────────────────────────────────────
  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setMediaUri(result.assets[0].uri); setMediaType('photo'); }
  }

  async function recordVideo() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, videoMaxDuration: 60, quality: 0.8 });
    if (!result.canceled && result.assets[0]) { setMediaUri(result.assets[0].uri); setMediaType('video'); }
  }

  // ── Save + AI reply (protected) ────────────────────────────────────────────
  async function saveAndReply() {
    const text = journalText.trim();
    if ((!text && !mediaUri) || saving) return;

    if (text && aiCompanion) {
      const preflight = checkTextBeforePost(text, toCompanionId(activeTab));
      if (preflight) setSafetyExperience(preflight);
    }

    const id    = Date.now();
    const entry: JournalEntry = {
      id, text, mood, moodTag: mood,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: activeTab, activeTab, entryMode: 'typed', locked, imageUri: mediaUri, mediaType,
    };

    setEntries(prev => [...prev, entry]);
    syncJournal(entry);
    setJournalText('');
    setMediaUri(undefined);
    setMediaType(undefined);

    updateSekretMemory({
      selectedSekret: isAiTab(activeTab) ? activeTab : 'raylene',
      mood,
      journalEntries: [{ id: String(id), text, mood, date: new Date().toISOString() }],
    }).catch(() => null);

    if (!aiCompanion) return;

    setSaving(true);
    setAvatarState('thinking');

    try {
      const result = await sendCompanionMessage({ companionId: toCompanionId(activeTab), surface: 'journal', text, mood, history: recentHistory, teenGender });
      const resolvedState = inferState(result.avatarState, mood, result.tone);
      patchJournalEntry(id, { sekretReply: result.reply, sekretAvatarState: resolvedState });
      setAvatarState(resolvedState);
      if (result.safetyFlag) {
        const flagged = await checkForFlaggedItems(toCompanionId(activeTab));
        if (flagged) setSafetyExperience(flagged);
      }
      if (result.suggestedComfortTool) setComfortNudge(result.suggestedComfortTool);
    } catch {
      setAvatarState('neutral');
    } finally {
      setSaving(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }

  // ── Voice playback ─────────────────────────────────────────────────────────
  async function hearReply(entryId: number | string, replyText: string, charId?: SekretCharacterId | null) {
    const targetId = charId ?? companionAvatarId;
    if (!replyText || voiceLoading || !targetId) return;
    setVoiceLoading(true);
    try {
      const key = String(entryId);
      let uri = audioCache.current[key];
      if (!uri) {
        const audio = await fetchSekretVoice({ reply: replyText, characterId: targetId });
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

  // ── Bridge share ───────────────────────────────────────────────────────────
  const handleShareWithParent = useCallback(async (entryId: number) => {
    if (sharingEntryId !== null) return;
    const current = bridgeShareStatuses.get(entryId);
    if (current && ACTIVE_BRIDGE_SHARE_STATUSES.has(current.status)) {
      setSharingEntryId(entryId);
      const result = await revokeBridgeShareRequest(current.requestId);
      setSharingEntryId(null);
      if (!result.ok) { Alert.alert('could not revoke', result.message); return; }
      setBridgeShareStatuses(prev => { const next = new Map(prev); next.set(entryId, { requestId: current.requestId, status: 'revoked' }); return next; });
      return;
    }
    if (!linkedParentId) { Alert.alert('no linked parent yet', 'Connect with a parent or trusted adult before sharing into Bridge.'); return; }
    const preview = buildBridgeSharePreview(linkedParentId, [{ kind: 'journal', sourceId: String(entryId) }]);
    if (!preview.ok) { Alert.alert('could not share right now', preview.message); return; }
    const confirmed = await new Promise<boolean>(resolve => {
      Alert.alert('Share with Parent Window?', `${preview.value.notice}\n\nYour parent will NOT see this entry's raw text — only a generated summary.`,
        [{ text: 'Cancel', style: 'cancel', onPress: () => resolve(false) }, { text: 'Share', onPress: () => resolve(true) }],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmed) return;
    setSharingEntryId(entryId);
    const result = await createBridgeShareRequest({ parentUserId: linkedParentId, idempotencyKey: `journal-${entryId}`, sources: [{ kind: 'journal', sourceId: String(entryId) }] });
    if (!result.ok) { setSharingEntryId(null); Alert.alert('could not share right now', result.message); return; }
    const refreshed = await fetchBridgeShareStatusesForJournalEntries();
    setSharingEntryId(null);
    if (refreshed.ok) setBridgeShareStatuses(refreshed.value);
    else setBridgeShareStatuses(prev => { const next = new Map(prev); next.set(entryId, { requestId: result.value.requestId, status: result.value.status }); return next; });
  }, [sharingEntryId, bridgeShareStatuses, linkedParentId]);

  // ── Render: companion chat entry (used in modal FlatList) ─────────────────
  const renderEntry = useCallback(({ item: entry }: { item: JournalEntry }) => {
    const entryKey = String(entry.id);
    const entryComp = COMPANIONS.find(c => c.id === (entry.activeTab || entry.source)) ?? companion;
    const entryAvatarId: SekretCharacterId | null = isAiTab(entryComp.id as CompanionId)
      ? normalizeSekretCharacter(entryComp.id as AiCompanionId) : null;
    return (
      <View style={s.exchange} key={entryKey}>
        <View style={s.teenRow}>
          <TouchableOpacity
            onLongPress={() => router.push(`/(teen)/pages/${entry.id}` as any)}
            style={[s.teenBubble, { borderColor: `${entryComp.accent}30` }]}
          >
            {entry.imageUri ? (
              entry.mediaType === 'video'
                ? <View style={s.videoThumb}><Text style={s.videoIcon}>📹</Text><Text style={s.videoLabel}>Video Bip</Text></View>
                : <Image source={{ uri: entry.imageUri }} style={s.bubbleMedia} />
            ) : null}
            {entry.text ? <Text style={s.teenText}>{entry.text}</Text> : null}
            <View style={s.entryMeta}>
              <Text style={s.metaTime}>{entry.date} · {entry.time}</Text>
              {entry.moodTag ? <Text style={[s.metaMood, { color: entryComp.accent }]}>#{entry.moodTag}</Text> : null}
              {entry.locked ? <Text style={s.metaLock}>🔒</Text> : null}
            </View>
          </TouchableOpacity>
        </View>
        {entry.sekretReply ? (
          <View style={s.replyRow}>
            {entryAvatarId ? <Image source={avatarImage(entryAvatarId, (entry.sekretAvatarState ?? 'neutral') as SekretAvatarState)} style={s.replyAvatar} /> : null}
            <View style={s.replyBubble}>
              <Text style={[s.replyName, { color: entryComp.accent }]}>{entryComp.name}</Text>
              <Text style={s.replyText}>{entry.sekretReply}</Text>
              <TouchableOpacity onPress={() => hearReply(entry.id, entry.sekretReply!, entryAvatarId)} disabled={voiceLoading} style={s.hearBtn}>
                <Text style={s.hearBtnText}>{voiceLoading ? 'loading…' : '▶ hear them'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    );
  }, [companion, voiceLoading]);

  // ── Render: page grid card ─────────────────────────────────────────────────
  const renderPageCard = (entry: JournalEntry, idx: number) => {
    const hasPhoto  = !!(entry.imageUri && entry.mediaType !== 'video');
    const isVoice   = entry.mediaType === 'audio';
    const shareStatus = bridgeShareStatuses.get(entry.id);
    const isShared  = !!(shareStatus && ACTIVE_BRIDGE_SHARE_STATUSES.has(shareStatus.status));
    const colorIdx  = idx % NOTE_BG.length;

    return (
      <TouchableOpacity
        key={String(entry.id)}
        style={s.pageCard}
        onPress={() => router.push(`/(teen)/pages/${entry.id}` as any)}
        activeOpacity={0.82}
      >
        {hasPhoto ? (
          <View style={s.polaroidCard}>
            <Image source={{ uri: entry.imageUri }} style={s.polaroidPhoto} />
            {entry.text ? <Text style={s.polaroidCaption} numberOfLines={2}>{entry.text}</Text> : null}
          </View>
        ) : isVoice ? (
          <View style={s.voiceCard}>
            <Text style={s.voiceCardPlay}>▶</Text>
            <Text style={s.voiceCardLabel}>Voice Bips ♡</Text>
          </View>
        ) : (
          <View style={[s.noteCard, { backgroundColor: NOTE_BG[colorIdx] }]}>
            <Text style={[s.noteCardText, { color: NOTE_FG[colorIdx] }]} numberOfLines={5}>
              {entry.text || '…'}
            </Text>
            {entry.moodTag ? <Text style={[s.noteCardMood, { color: NOTE_FG[colorIdx] + 'aa' }]}>♡</Text> : null}
          </View>
        )}
        {isShared  && <Text style={s.cardBadgeShare}>💜</Text>}
        {entry.locked && <Text style={s.cardBadgeLock}>🔒</Text>}
      </TouchableOpacity>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <ImageBackground source={roomBg} style={s.root} resizeMode="cover">
      <AmbientWeatherOverlay />
      <LinearGradient colors={['rgba(9,7,17,0.72)', 'rgba(14,11,26,0.88)', 'rgba(9,7,17,0.94)']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.scroll}
          >

            {/* ── Header ───────────────────────────────────────────────────── */}
            <View style={s.header}>
              <View>
                <Text style={s.pageTitle}>Se'kret Pages♡</Text>
                <Text style={s.pageSubtitle}>your thoughts live here ♡</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(teen)/pages/history' as any)} style={s.libraryBtn}>
                <Text style={s.libraryBtnText}>📚</Text>
                <Text style={s.libraryBtnLabel}>all entries</Text>
              </TouchableOpacity>
            </View>

            {/* ── Companion section ─────────────────────────────────────────── */}
            <View style={s.companionSection}>
              <View style={s.companionSectionHeader}>
                <Text style={s.companionSectionTitle}>✦ Talk with a Companion ♡</Text>
                <TouchableOpacity onPress={() => setCompanionChatOpen(true)}>
                  <Text style={s.companionSeeAll}>They're here for you →</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.companionRail}>
                {COMPANIONS.map(c => {
                  const active   = c.id === activeTab;
                  const unlocked = totalPoints >= COMPANION_UNLOCK_PTS[c.id as CompanionId];
                  const charId: SekretCharacterId | null = isAiTab(c.id as CompanionId)
                    ? normalizeSekretCharacter(c.id as AiCompanionId) : null;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => unlocked ? chooseTab(c.id as CompanionId) : undefined}
                      activeOpacity={unlocked ? 0.75 : 1}
                      style={[
                        s.companionCard,
                        active && { borderColor: c.accent, backgroundColor: `${c.accent}14` },
                        !unlocked && { opacity: 0.52 },
                      ]}
                    >
                      <Text style={[s.companionCardHeart, { color: c.accent }]}>♡</Text>
                      {charId ? (
                        <Animated.Image
                          source={avatarImage(charId, active ? avatarState : 'neutral')}
                          style={[s.companionCardImg, active && { transform: [{ scale: breathe }] }]}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={[s.companionIconWrap, { borderColor: `${c.accent}55`, backgroundColor: `${c.accent}18` }]}>
                          <Text style={s.companionIcon}>
                            {c.id === 'cloud' ? '☁️' : c.id === 'night' ? '🌙' : c.id === 'me' ? '🪞' : '🔮'}
                          </Text>
                        </View>
                      )}
                      <Text style={[s.companionCardName, active && { color: c.accent }]}>{c.name}</Text>
                      <Text style={s.companionCardVibe} numberOfLines={1}>{c.vibe}</Text>
                      {!unlocked && <Text style={s.companionLockPts}>{COMPANION_UNLOCK_PTS[c.id as CompanionId]}pts</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* ── Compose card ─────────────────────────────────────────────── */}
            <View style={[s.composeCard, { borderColor: `${companion.accent}22` }]}>
              {/* Polaroid deco */}
              <View style={s.composeDecoRight}>
                <View style={[s.composePolaroid, { borderColor: `${companion.accent}33` }]}>
                  <Text style={s.composePolaroidMoon}>🌙</Text>
                </View>
                <Text style={[s.composePolaroidNote, { color: `${companion.accent}99` }]}>it's okay{'\n'}to feel it ♡</Text>
              </View>

              <TextInput
                ref={textInputRef}
                multiline
                value={journalText}
                onChangeText={setJournalText}
                onFocus={() => setAvatarState(aiCompanion ? 'listening' : 'neutral')}
                placeholder={`Dear me...\nWhat's on your mind today?`}
                placeholderTextColor="#9b8fa8"
                style={s.composeInput}
                textAlignVertical="top"
                maxLength={2000}
              />

              {mediaUri ? (
                <TouchableOpacity onPress={() => { setMediaUri(undefined); setMediaType(undefined); }} style={s.mediaPreviewWrap}>
                  {mediaType === 'video'
                    ? <Video source={{ uri: mediaUri }} style={s.mediaPreview} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
                    : <Image source={{ uri: mediaUri }} style={s.mediaPreview} />}
                  <Text style={s.mediaRemove}>✕</Text>
                </TouchableOpacity>
              ) : null}

              {/* Media type row */}
              <View style={s.mediaTypeRow}>
                {[
                  { icon: '📷', label: 'Photo',     onPress: choosePhoto,                                         active: mediaType === 'photo' },
                  { icon: '🎙',  label: 'Voice Bip', onPress: () => router.push(TEEN_ROUTES.voiceBip as any),     active: false                 },
                  { icon: '✏️', label: 'Write',     onPress: () => textInputRef.current?.focus(),                 active: false                 },
                  { icon: '😊', label: 'Stickers',  onPress: () => Alert.alert('Stickers', "Coming soon ✨"),     active: false                 },
                  { icon: '🎵', label: 'Music',     onPress: () => Alert.alert('Music',    "Coming soon 🎵"),     active: false                 },
                  { icon: '···', label: 'More',      onPress: () => setToolbarOpen(o => !o),                      active: toolbarOpen           },
                ].map(btn => (
                  <TouchableOpacity
                    key={btn.label}
                    onPress={btn.onPress}
                    style={[s.mediaTypeBtn, btn.active && { borderColor: companion.accent, backgroundColor: `${companion.accent}1a` }]}
                  >
                    <Text style={s.mediaTypeBtnIcon}>{btn.icon}</Text>
                    <Text style={[s.mediaTypeBtnLabel, btn.active && { color: companion.accent }]}>{btn.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Expandable: mood + lock */}
              {toolbarOpen && (
                <View style={s.extraToolbar}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moodRail}>
                    {MOOD_TAGS.map(tag => (
                      <TouchableOpacity key={tag.value} onPress={() => setMood(tag.value)}
                        style={[s.moodChip, mood === tag.value && { borderColor: companion.accent, backgroundColor: `${companion.accent}22` }]}>
                        <Text style={[s.moodChipText, mood === tag.value && { color: companion.accent }]}>{tag.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={s.attachRow}>
                    <TouchableOpacity onPress={() => setLocked(l => !l)}
                      style={[s.iconBtn, locked && { borderColor: companion.accent, backgroundColor: `${companion.accent}18` }]}>
                      <Text style={s.iconBtnText}>{locked ? '🔒' : '🔓'}</Text>
                      <Text style={s.iconBtnLabel}>{locked ? 'private' : 'lock it'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={recordVideo}
                      style={[s.iconBtn, mediaType === 'video' && { borderColor: companion.accent, backgroundColor: `${companion.accent}18` }]}>
                      <Text style={s.iconBtnText}>📹</Text>
                      <Text style={s.iconBtnLabel}>{mediaType === 'video' ? 'video ✓' : 'video'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* ── Make a Page button ────────────────────────────────────────── */}
            <TouchableOpacity
              style={[s.makePageBtn, { backgroundColor: companion.accent }, ((!journalText.trim() && !mediaUri) || saving) && { opacity: 0.42 }]}
              onPress={saveAndReply}
              disabled={(!journalText.trim() && !mediaUri) || saving}
              activeOpacity={0.85}
            >
              <Text style={s.makePageBtnText}>{saving ? '…' : '+ Make a Page  ✳'}</Text>
            </TouchableOpacity>

            {/* ── Companion reply card ──────────────────────────────────────── */}
            {saving ? (
              <View style={[s.typingCard, { borderColor: `${companion.accent}30` }]}>
                {companionAvatarId ? (
                  <Image source={avatarImage(companionAvatarId, 'thinking')} style={s.typingCardAvatar} resizeMode="contain" />
                ) : null}
                <Text style={[s.typingCardText, { color: companion.accent }]}>{companion.name} is thinking…</Text>
              </View>
            ) : latestReplyEntry?.sekretReply ? (
              <View style={[s.replyCard, { borderColor: `${latestReplyComp?.accent ?? companion.accent}35` }]}>
                <View style={s.replyCardTop}>
                  {latestReplyAvatarId ? (
                    <Image source={avatarImage(latestReplyAvatarId, (latestReplyEntry.sekretAvatarState ?? 'neutral') as SekretAvatarState)} style={s.replyCardAvatar} resizeMode="contain" />
                  ) : null}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.replyCardName, { color: latestReplyComp?.accent ?? companion.accent }]}>
                      {latestReplyComp?.name ?? companion.name}
                    </Text>
                    <Text style={s.replyCardText} numberOfLines={4}>{latestReplyEntry.sekretReply}</Text>
                  </View>
                  <TouchableOpacity onPress={() => hearReply(latestReplyEntry.id, latestReplyEntry.sekretReply!, latestReplyAvatarId)} disabled={voiceLoading || !latestReplyAvatarId} style={s.replyCardHear}>
                    <Text style={[s.replyCardHearText, { color: latestReplyComp?.accent ?? companion.accent }]}>{voiceLoading ? '…' : '▶'}</Text>
                  </TouchableOpacity>
                </View>
                {!latestReplyEntry.locked && (
                  <TouchableOpacity onPress={() => handleShareWithParent(latestReplyEntry.id)} disabled={sharingEntryId === latestReplyEntry.id} style={s.replyCardShareBtn}>
                    <Text style={s.replyCardShareText}>
                      {sharingEntryId === latestReplyEntry.id ? 'sharing…'
                        : bridgeShareStatuses.has(latestReplyEntry.id) && ACTIVE_BRIDGE_SHARE_STATUSES.has(bridgeShareStatuses.get(latestReplyEntry.id)!.status)
                          ? '💜 shared with Bridge — tap to revoke'
                          : '👁️ share with Parent Window'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null}

            {/* ── Comfort nudge ─────────────────────────────────────────────── */}
            {comfortNudge && !saving && (
              <View style={s.nudgeWrap}>
                <Text style={[s.nudgeText, { color: companion.accent }]}>{companion.name} thinks Comfort might help right now</Text>
                <View style={s.nudgeRow}>
                  <TouchableOpacity style={[s.nudgeBtn, { borderColor: `${companion.accent}66` }]} onPress={() => { setComfortNudge(null); router.push('/(teen)/comfort' as any); }}>
                    <Text style={s.nudgeBtnText}>open Comfort</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setComfortNudge(null)} style={s.nudgeDismiss}>
                    <Text style={s.nudgeDismissText}>I'm okay</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ── Pages section ─────────────────────────────────────────────── */}
            <View style={s.pagesSection}>
              {/* Page tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pageTabRail}>
                {PAGE_TABS.map(tab => (
                  <TouchableOpacity key={tab.id} onPress={() => setPageTab(tab.id)} style={[s.pageTab, pageTab === tab.id && { borderBottomColor: companion.accent, borderBottomWidth: 2 }]}>
                    <Text style={[s.pageTabText, pageTab === tab.id && { color: '#f0eaf4', fontWeight: '800' }]}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={s.pageTab} onPress={() => router.push('/(teen)/pages/history' as any)}>
                  <Text style={s.pageTabText}>🔍</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* Filter chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filterRail}>
                {PAGE_FILTERS.map(f => (
                  <TouchableOpacity key={f.id} onPress={() => setPageFilter(f.id)}
                    style={[s.filterChip, pageFilter === f.id && { backgroundColor: companion.accent, borderColor: companion.accent }]}>
                    <Text style={[s.filterChipText, pageFilter === f.id && { color: '#fff', fontWeight: '800' }]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Pages grid */}
              {filteredEntries.length === 0 ? (
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>{activeTab === 'me' ? '🪞' : activeTab === 'oracle' ? '🔮' : '💜'}</Text>
                  <Text style={[s.emptyTitle, { color: companion.accent }]}>Write your first page above ♡</Text>
                  <Text style={s.emptyBody}>{companion.vibe}</Text>
                </View>
              ) : (
                <View style={s.pagesGrid}>
                  {chunkArr(filteredEntries, 3).map((row, rowIdx) => (
                    <View key={rowIdx} style={s.pagesRow}>
                      {row.map((entry, colIdx) => renderPageCard(entry, rowIdx * 3 + colIdx))}
                      {row.length < 3 && Array(3 - row.length).fill(null).map((_, i) => (
                        <View key={`fill-${i}`} style={s.pageCard} />
                      ))}
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* ── Companion chat modal ──────────────────────────────────────────────── */}
      <Modal visible={companionChatOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCompanionChatOpen(false)}>
        <View style={s.chatModal}>
          <LinearGradient colors={['#0d0920', '#11082a', '#0d0920']} style={StyleSheet.absoluteFill} />
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
            {/* Modal header with companion tab strip */}
            <View style={s.chatModalHeader}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRail}>
                {COMPANIONS.map(c => {
                  const active   = c.id === activeTab;
                  const unlocked = totalPoints >= COMPANION_UNLOCK_PTS[c.id as CompanionId];
                  const charId: SekretCharacterId | null = isAiTab(c.id as CompanionId) ? normalizeSekretCharacter(c.id as AiCompanionId) : null;
                  return (
                    <TouchableOpacity key={c.id} onPress={() => unlocked ? chooseTab(c.id as CompanionId) : undefined}
                      activeOpacity={unlocked ? 0.7 : 1}
                      style={[s.tab, active && { borderColor: c.accent, backgroundColor: `${c.accent}18` }, !unlocked && s.tabLocked]}>
                      {charId ? (
                        <Image source={avatarImage(charId, active ? avatarState : 'neutral')} style={[s.tabImg, !unlocked && { opacity: 0.3 }]} />
                      ) : (
                        <Text style={[s.tabEmoji, !unlocked && { opacity: 0.3 }]}>{c.id === 'me' ? '🪞' : '🔮'}</Text>
                      )}
                      {unlocked ? <Text style={[s.tabName, active && { color: c.accent }]}>{c.name}</Text>
                               : <Text style={s.tabLockBadge}>{COMPANION_UNLOCK_PTS[c.id as CompanionId]} pts</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <TouchableOpacity onPress={() => setCompanionChatOpen(false)} style={s.chatModalClose}>
                <Text style={s.chatModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Chat timeline */}
            <FlatList
              ref={flatListRef}
              data={threadEntries}
              keyExtractor={e => String(e.id)}
              renderItem={renderEntry}
              contentContainerStyle={s.thread}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={s.emptyState}>
                  <Text style={s.emptyEmoji}>{activeTab === 'me' ? '🪞' : activeTab === 'oracle' ? '🔮' : '💜'}</Text>
                  <Text style={[s.emptyTitle, { color: companion.accent }]}>
                    {companion.name === 'Me' ? 'Your private pages' : `Start talking to ${companion.name}`}
                  </Text>
                  <Text style={s.emptyBody}>{companion.vibe}</Text>
                </View>
              }
              ListFooterComponent={
                saving && companionAvatarId ? (
                  <View style={s.typingRow}>
                    <Image source={avatarImage(companionAvatarId, 'thinking')} style={s.typingAvatar} />
                    <View style={s.typingBubble}>
                      <Text style={[s.typingText, { color: companion.accent }]}>{companion.name} is thinking…</Text>
                    </View>
                  </View>
                ) : null
              }
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            />

            {/* Modal composer */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View style={[s.composerRow, { borderTopColor: `${companion.accent}25` }]}>
                <TextInput
                  multiline
                  value={journalText}
                  onChangeText={setJournalText}
                  onFocus={() => setAvatarState(aiCompanion ? 'listening' : 'neutral')}
                  placeholder="Dear me... what's on your mind today?"
                  placeholderTextColor="#7a6e83"
                  style={s.composerInput}
                  textAlignVertical="top"
                  maxLength={2000}
                />
                <TouchableOpacity
                  onPress={() => { saveAndReply(); setCompanionChatOpen(false); }}
                  disabled={(!journalText.trim() && !mediaUri) || saving}
                  style={[s.sendBtn, { backgroundColor: companion.accent }, ((!journalText.trim() && !mediaUri) || saving) && s.sendBtnDisabled]}
                >
                  <Text style={s.sendBtnText}>{saving ? '…' : '+ Page'}</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Safety experience sheet */}
      <SafetyExperienceSheet experience={safetyExperience} onDismiss={() => setSafetyExperience(null)} />
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#090711' },
  safe:   { flex: 1 },
  scroll: { paddingBottom: 24 },

  // Header
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  pageTitle:     { color: '#f4e8ff', fontSize: 24, fontWeight: '800', letterSpacing: 0.3 },
  pageSubtitle:  { color: '#9a8fa3', fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  libraryBtn:    { alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff18', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 10, paddingVertical: 6 },
  libraryBtnText: { fontSize: 16 },
  libraryBtnLabel: { color: '#7a6e83', fontSize: 8, fontWeight: '800', marginTop: 2 },

  // Companion section
  companionSection:       { marginBottom: 12 },
  companionSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10 },
  companionSectionTitle:  { color: '#f4e8ff', fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  companionSeeAll:        { color: '#7a6e83', fontSize: 11, fontWeight: '700' },
  companionRail:          { gap: 10, paddingHorizontal: 14, paddingBottom: 4 },
  companionCard:          { width: 90, borderRadius: 18, borderWidth: 1.5, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, position: 'relative' },
  companionCardHeart:     { position: 'absolute', top: 7, right: 10, fontSize: 10 },
  companionCardImg:       { width: 48, height: 48 },
  companionIconWrap:      { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  companionIcon:          { fontSize: 22 },
  companionCardName:      { color: '#c4b9cc', fontSize: 10, fontWeight: '800', marginTop: 5, letterSpacing: 0.3 },
  companionCardVibe:      { color: '#7a6e83', fontSize: 8, fontWeight: '500', marginTop: 2, textAlign: 'center' },
  companionLockPts:       { color: '#5a5368', fontSize: 8, fontWeight: '800', marginTop: 4 },

  // Compose card
  composeCard:       { marginHorizontal: 12, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.055)', padding: 14, marginBottom: 12, position: 'relative', overflow: 'hidden' },
  composeDecoRight:  { position: 'absolute', top: 10, right: 12, alignItems: 'center', zIndex: 0 },
  composePolaroid:   { width: 52, height: 52, borderRadius: 8, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  composePolaroidMoon: { fontSize: 24 },
  composePolaroidNote: { fontSize: 8, fontStyle: 'italic', textAlign: 'center', lineHeight: 11 },
  composeInput:      { color: '#f0eaf4', fontSize: 15, lineHeight: 23, minHeight: 70, maxHeight: 140, paddingRight: 72, zIndex: 1 },
  mediaPreviewWrap:  { marginTop: 8, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  mediaPreview:      { width: '100%', height: 110, borderRadius: 12, resizeMode: 'cover' },
  mediaRemove:       { position: 'absolute', top: 6, right: 8, color: '#fff', fontSize: 13, fontWeight: '900', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  mediaTypeRow:      { flexDirection: 'row', gap: 5, marginTop: 10 },
  mediaTypeBtn:      { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, alignItems: 'center', gap: 3 },
  mediaTypeBtnIcon:  { fontSize: 16 },
  mediaTypeBtnLabel: { color: '#9a8fa3', fontSize: 7.5, fontWeight: '700' },
  extraToolbar:      { marginTop: 10 },
  moodRail:          { gap: 6, paddingBottom: 8 },
  moodChip:          { borderRadius: 999, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 6 },
  moodChipText:      { color: '#9a8fa3', fontSize: 11, fontWeight: '700' },
  attachRow:         { flexDirection: 'row', gap: 8, marginBottom: 6 },
  iconBtn:           { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 8, alignItems: 'center', gap: 3 },
  iconBtnText:       { fontSize: 16, color: '#f0eaf4' },
  iconBtnLabel:      { color: '#9a8fa3', fontSize: 9, fontWeight: '700' },

  // Make a Page button
  makePageBtn:     { marginHorizontal: 20, borderRadius: 32, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  makePageBtnText: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },

  // Reply card
  replyCard:      { marginHorizontal: 12, marginBottom: 12, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 14 },
  replyCardTop:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  replyCardAvatar: { width: 36, height: 36, resizeMode: 'contain' },
  replyCardName:  { fontSize: 9, fontWeight: '900', marginBottom: 4, letterSpacing: 0.6 },
  replyCardText:  { color: '#cfc5d5', fontSize: 13, lineHeight: 20 },
  replyCardHear:  { paddingHorizontal: 10, paddingVertical: 8 },
  replyCardHearText: { fontSize: 18 },
  replyCardShareBtn: { marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: '#ffffff18', paddingHorizontal: 12, paddingVertical: 6 },
  replyCardShareText: { color: '#a899b4', fontSize: 10, fontWeight: '700' },

  // Typing card
  typingCard:     { marginHorizontal: 12, marginBottom: 12, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  typingCardAvatar: { width: 32, height: 32, resizeMode: 'contain', opacity: 0.75 },
  typingCardText: { fontSize: 12, fontStyle: 'italic', fontWeight: '600' },

  // Comfort nudge
  nudgeWrap:    { marginHorizontal: 12, marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 16, padding: 12 },
  nudgeText:    { fontSize: 12, fontWeight: '700', marginBottom: 8 },
  nudgeRow:     { flexDirection: 'row', gap: 10 },
  nudgeBtn:     { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  nudgeBtnText: { color: '#f0eaf4', fontSize: 12, fontWeight: '700' },
  nudgeDismiss: { justifyContent: 'center', paddingHorizontal: 12 },
  nudgeDismissText: { color: '#64748b', fontSize: 11 },

  // Pages section
  pagesSection:  { marginTop: 4 },
  pageTabRail:   { gap: 0, paddingHorizontal: 16, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  pageTab:       { paddingHorizontal: 10, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  pageTabText:   { color: '#7a6e83', fontSize: 12, fontWeight: '600' },
  filterRail:    { gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  filterChip:    { borderRadius: 999, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', paddingHorizontal: 12, paddingVertical: 6 },
  filterChipText: { color: '#9a8fa3', fontSize: 11, fontWeight: '600' },

  // Pages grid
  pagesGrid:  { paddingHorizontal: 16 },
  pagesRow:   { flexDirection: 'row', gap: 6, marginBottom: 6 },
  pageCard:   { width: CARD_W, height: CARD_W + 16, borderRadius: 14, overflow: 'hidden', position: 'relative' },

  polaroidCard:    { flex: 1, backgroundColor: '#f5f0e8', borderRadius: 10, padding: 6 },
  polaroidPhoto:   { flex: 1, borderRadius: 6, resizeMode: 'cover' },
  polaroidCaption: { color: '#3d2e1e', fontSize: 8, marginTop: 4, fontWeight: '600', textAlign: 'center' },

  voiceCard:     { flex: 1, backgroundColor: '#1a1030', alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(154,142,232,0.3)' },
  voiceCardPlay: { color: '#9a8ee8', fontSize: 22 },
  voiceCardLabel: { color: '#7a6e83', fontSize: 8, fontWeight: '700', marginTop: 4 },

  noteCard:     { flex: 1, borderRadius: 10, padding: 10 },
  noteCardText: { fontSize: 10, lineHeight: 15, fontWeight: '500' },
  noteCardMood: { position: 'absolute', bottom: 6, right: 8, fontSize: 11 },

  cardBadgeShare: { position: 'absolute', top: 5, right: 5, fontSize: 10 },
  cardBadgeLock:  { position: 'absolute', bottom: 5, right: 5, fontSize: 9 },

  emptyState: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  emptyBody:  { color: '#7a6e83', fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Companion chat modal
  chatModal:       { flex: 1, backgroundColor: '#0d0920' },
  chatModalHeader: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  chatModalClose:  { paddingHorizontal: 14, paddingVertical: 10 },
  chatModalCloseText: { color: '#7a6e83', fontSize: 16, fontWeight: '700' },

  // Chat modal tab strip (reused from original)
  tabRail:    { gap: 8, paddingHorizontal: 14, paddingBottom: 10 },
  tab:        { width: 72, minHeight: 66, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff12', backgroundColor: 'rgba(255,255,255,0.035)', alignItems: 'center', justifyContent: 'center', padding: 6 },
  tabImg:     { width: 38, height: 38, resizeMode: 'contain' },
  tabEmoji:   { fontSize: 24 },
  tabName:    { color: '#a99fb2', fontSize: 9, fontWeight: '800', marginTop: 3 },
  tabLocked:  { opacity: 0.55 },
  tabLockBadge: { color: '#6b6175', fontSize: 8, fontWeight: '800', marginTop: 3 },

  thread:     { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 20 },

  // Chat bubbles
  exchange:   { marginBottom: 18 },
  teenRow:    { alignItems: 'flex-end', marginBottom: 8 },
  teenBubble: { maxWidth: '82%', backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderRadius: 20, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
  teenText:   { color: '#f0eaf4', fontSize: 15, lineHeight: 23 },
  bubbleMedia: { width: '100%', height: 140, borderRadius: 12, marginBottom: 8, resizeMode: 'cover' },
  videoThumb: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, marginBottom: 8 },
  videoIcon:  { fontSize: 18 },
  videoLabel: { color: '#a99fb2', fontSize: 12, fontWeight: '700' },
  entryMeta:  { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  metaTime:   { color: '#7a7086', fontSize: 9 },
  metaMood:   { fontSize: 9, fontWeight: '800' },
  metaLock:   { fontSize: 10 },

  replyRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginLeft: 6 },
  replyAvatar: { width: 34, height: 34, resizeMode: 'contain', marginTop: 2 },
  replyBubble: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 20, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 12 },
  replyName:   { fontSize: 9, fontWeight: '900', marginBottom: 5, letterSpacing: 0.6 },
  replyText:   { color: '#cfc5d5', fontSize: 14, lineHeight: 22 },
  hearBtn:     { marginTop: 10, alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: '#ffffff1a', paddingHorizontal: 10, paddingVertical: 5 },
  hearBtnText: { color: '#c4b9cc', fontSize: 9, fontWeight: '800' },

  typingRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginLeft: 6, marginTop: 4, marginBottom: 8 },
  typingAvatar: { width: 32, height: 32, resizeMode: 'contain', opacity: 0.7 },
  typingBubble: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  typingText:   { fontSize: 12, fontStyle: 'italic' },

  // Modal composer row
  composerRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20, borderTopWidth: 1, backgroundColor: 'rgba(12,8,22,0.65)' },
  composerInput: { flex: 1, color: '#f0eaf4', fontSize: 15, lineHeight: 23, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.11)', maxHeight: 120 },
  sendBtn:        { height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  sendBtnText:    { fontSize: 12, fontWeight: '900', color: '#fff', letterSpacing: 0.3 },
  sendBtnDisabled: { opacity: 0.30 },
});
