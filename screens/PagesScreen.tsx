import React, { useMemo, useRef, useState } from 'react';
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { JournalEntry, MoodEntry, VoiceNote } from '../types';
import { getParentRoomBg } from '../constants/theme';
import { OracleDiscoveryPanel } from '../components/OracleDiscoveryPanel';
import { PrivacyLabel } from '../components/PrivacyLabel';
import { MiniAvatarSticker } from '../components/MiniAvatarSticker';
import type { MiniAvatarCharacter } from '../components/MiniAvatarSticker';
import type { OracleProfile, OracleSessionSummary } from '../services/oracleDiscovery';
import { fetchPagesReply, THINKING_LABELS, tabToAvatarKey } from '../utils/sekretReply';
import { SyncBadge, type SyncStatus } from '../components/SyncBadge';
import { BipEmptyState } from '../components/BipEmptyState';

type TeenTab = 'me' | 'oracle' | 'raylene' | 'rylane' | 'cloud' | 'night';
type ParentTab = 'me' | 'oracle' | 'parentSekret' | 'bridge';
export type PagesTab = TeenTab | ParentTab;

interface TabDefinition {
  id: PagesTab;
  label: string;
  icon: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  prompts?: string[];
  placeholder?: string;
  accent: string;
}

export interface SavePageInput {
  id?: number;
  text: string;
  source: PagesTab;
  moodTag?: string;
  entryMode: 'typed' | 'voice';
  locked: boolean;
  imageUri?: string;
}

interface SharedPagesProps {
  side: 'teen' | 'parent';
  entries: JournalEntry[];
  draft: string;
  setDraft: (text: string) => void;
  onSave: (entry: SavePageInput) => void;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
  mood?: string;
  selectedSekret?: string;
  moodHistory?: MoodEntry[];
  voiceNotes?: VoiceNote[];
  streakDays?: number;
  parentRoomStyle?: 'mom' | 'dad';
  weatherMode?: string;
  oracleProfile?: OracleProfile;
  onCompleteOracleSession: (profile: OracleProfile, session: OracleSessionSummary) => void;
  /**
   * Called by PagesWorkspace after the Worker reply arrives so the parent
   * (App.tsx / state slice) can persist sekretReply to AsyncStorage.
   * Receives the entry id and the reply string.
   */
  onSekretReply?: (entryId: number, reply: string) => void;
  syncStatus?: SyncStatus;
}

export interface PagesScreenProps {
  journalText: string;
  setJournalText: (text: string) => void;
  journalEntries: JournalEntry[];
  saveJournalEntry: (override?: SavePageInput) => void;
  mood: string;
  t: Record<string, unknown>;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
  moodHistory?: MoodEntry[];
  voiceNotes?: VoiceNote[];
  streakDays?: number;
  selectedSekret?: string;
  oracleProfile?: OracleProfile;
  onCompleteOracleSession: (profile: OracleProfile, session: OracleSessionSummary) => void;
  onSekretReply?: (entryId: number, reply: string) => void;
  syncStatus?: SyncStatus;
}

const TEEN_TABS: TabDefinition[] = [
  { id: 'me', label: 'Me', icon: '\u25cc', title: '', accent: '#c4b5fd' },
  { id: 'oracle', label: 'Se\u2019kret', icon: '\u25c7', title: 'Se\u2019kret Discovery', accent: '#8b7bb8' },
  {
    id: 'raylene', label: 'Raylene', icon: '\u2726', eyebrow: 'Raylene pulled up',
    title: 'You been a little too quiet. What happened?',
    subtitle: 'Warm, curious, and already paying attention.', accent: '#e9a8d2',
    prompts: [
      'Okay, what happened for real?',
      'What have you been acting unbothered about?',
      'Who or what has been taking up too much space in your head?',
      'What did you need somebody to notice today?',
    ],
    placeholder: 'Tell it how it happened\u2026',
  },
  {
    id: 'rylane', label: 'Rylane', icon: '\u2014', eyebrow: 'Rylane keeps it real',
    title: 'What\u2019s real right now?',
    subtitle: 'No cushion. No lecture.', accent: '#79aaf2',
    prompts: [
      'What are you avoiding?',
      'What did you almost say?',
      'Who showed up? Who didn\u2019t?',
      'Say the part you keep editing.',
    ],
    placeholder: 'Say it straight\u2026',
  },
  {
    id: 'cloud', label: 'Cloud', icon: '\u2601', eyebrow: 'Cloud can wait',
    title: 'You don\u2019t have to know the words yet.',
    subtitle: 'Start anywhere. Or just sit here a minute.', accent: '#9bd8e5',
    prompts: [
      'A color, a feeling, one unfinished thought\u2026',
      'What feels closest to the surface?',
      'If today had weather, what would it be?',
      'One word is enough.',
    ],
    placeholder: 'Let it take shape slowly\u2026',
  },
  {
    id: 'night', label: 'Night', icon: '\u{1F319}', eyebrow: "Night Se\u2019kret",
    title: "You don\u2019t have to say much. Just don\u2019t be alone in it.",
    subtitle: 'Presence. Not conversation.', accent: '#7b8fcf',
    prompts: [
      "What\u2019s still in your head that you can\u2019t put down?",
      'What almost broke you open today?',
      "What do you wish you didn\u2019t have to carry alone?",
      'You can just start with one word.',
    ],
    placeholder: 'The night hears you\u2026',
  },
];

const PARENT_TABS: TabDefinition[] = [
  { id: 'me', label: 'Me', icon: '\u25cc', title: '', accent: '#d8c9b8' },
  { id: 'oracle', label: 'Se\u2019kret', icon: '\u25c7', title: 'Se\u2019kret Discovery', accent: '#8d877f' },
  {
    id: 'parentSekret', label: 'Parent Se\u2019kret', icon: '\u2726', eyebrow: 'Parent Se\u2019kret',
    title: 'Let\u2019s get honest before this turns into a whole thing.',
    subtitle: 'Calm, street-smart co-parent energy. No sugarcoating.', accent: '#d7a66d',
    prompts: [
      'What keeps setting you off in this situation?',
      'What are you trying to protect \u2014 and what might your teen be hearing instead?',
      'What part is yours to own before you ask them to own theirs?',
      'Are you trying to connect, correct, or control right now?',
    ],
    placeholder: 'Work through your side of it\u2026',
  },
  {
    id: 'bridge', label: 'Bridge', icon: '\u2381', eyebrow: 'Conversation prep',
    title: 'Say it here before you say it to them.',
    subtitle: 'This is prep, not monitoring. Their private pages never appear here.', accent: '#83b6a1',
    prompts: [
      'What do you need them to understand when this conversation is over?',
      'What can you say without blame, threat, or a lecture?',
      'What question could you ask \u2014 then actually listen to the answer?',
      'What would repair sound like in your own words?',
    ],
    placeholder: 'Draft the conversation\u2026',
  },
];

const TEEN_TAGS = ['heavy', 'mad', 'numb', 'confused', 'hopeful', 'okay'];
const PARENT_TAGS = ['reactive', 'worried', 'hurt', 'stuck', 'open', 'steady'];

function tabToStickerCharacter(tab: PagesTab): MiniAvatarCharacter {
  if (tab === 'raylene') return 'raylene';
  if (tab === 'rylane') return 'rylane';
  if (tab === 'cloud') return 'cloud';
  if (tab === 'night') return 'night';
  return null;
}

function normalizeSource(entry: JournalEntry): PagesTab {
  const source = entry.activeTab || entry.source;
  if (
    source === 'parentSekret' || source === 'bridge' || source === 'oracle' ||
    source === 'raylene' || source === 'rylane' || source === 'cloud' || source === 'night'
  ) {
    return source;
  }
  return 'me';
}

function formatEntryMeta(entry: JournalEntry) {
  const mode = entry.entryMode === 'voice' ? 'voice' : 'typed';
  return [entry.date, entry.time, entry.moodTag || entry.mood, mode].filter(Boolean).join(' \u00b7 ');
}

// ── Se'kret reply bubble ───────────────────────────────────────────────────
interface SekretReplyBubbleProps {
  tab: PagesTab;
  reply?: string;
  typing?: boolean;
  accent: string;
}

function SekretReplyBubble({ tab, reply, typing, accent }: SekretReplyBubbleProps) {
  const avatarKey = tabToAvatarKey(tab);
  if (!avatarKey) return null;
  if (!typing && !reply) return null;

  const label = THINKING_LABELS[avatarKey] ?? `${avatarKey} is thinking\u2026`;

  return (
    <View style={[replyStyles.bubble, { borderColor: accent + '55' }]}>
      <Text style={[replyStyles.name, { color: accent }]}>{avatarKey.charAt(0).toUpperCase() + avatarKey.slice(1)}</Text>
      <Text style={replyStyles.text}>
        {typing ? label : reply}
      </Text>
    </View>
  );
}

const replyStyles = StyleSheet.create({
  bubble: {
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#0e0b18',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  name: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  text: {
    color: '#e8e0f0',
    fontSize: 15,
    lineHeight: 23,
  },
});

// ── PagesWorkspace ─────────────────────────────────────────────────────────
function PagesWorkspace({
  side, entries, draft, setDraft, onSave, setScreen, BottomNav,
  mood, oracleProfile, onCompleteOracleSession, selectedSekret,
  parentRoomStyle, weatherMode, onSekretReply, syncStatus,
}: SharedPagesProps) {
  const tabs = side === 'teen' ? TEEN_TABS : PARENT_TABS;
  const isRylane = selectedSekret === 'rylane';
  const parentBg = parentRoomStyle === 'dad' ? '#0c1219' : '#17110e';
  const charRootBg = side === 'parent' ? parentBg : (isRylane ? '#090c1b' : '#100b18');
  const parentRoomImage = side === 'parent'
    ? getParentRoomBg(parentRoomStyle ?? 'mom', weatherMode)
    : undefined;
  const moodTags = side === 'teen' ? TEEN_TAGS : PARENT_TAGS;

  const [activeTab, setActiveTab] = useState<PagesTab>('me');
  const [tabDrafts, setTabDrafts] = useState<Partial<Record<PagesTab, string>>>({});
  const [selectedTag, setSelectedTag] = useState('');
  const [locked, setLocked] = useState(false);
  const [imageUri, setImageUri] = useState<string>();
  const [promptVisible, setPromptVisible] = useState(true);
  const [promptIndex, setPromptIndex] = useState(0);
  const [noPressure, setNoPressure] = useState(false);

  /**
   * Transient Se'kret reply state keyed by entry id.
   * Shape: { [entryId]: { typing: boolean; reply?: string } }
   *
   * `typing: true`  → Worker call in flight  → show "Raylene is thinking…"
   * `typing: false` → reply received         → show reply text
   *
   * This state is local to the component. The persisted reply lives on the
   * JournalEntry.sekretReply field via onSekretReply → parent state → AsyncStorage.
   */
  const [replyState, setReplyState] = useState<
    Record<number, { typing: boolean; reply?: string }>
  >({});

  // Stable ref so the async callback after Worker returns always has the
  // latest onSekretReply without needing it as a dependency.
  const onSekretReplyRef = useRef(onSekretReply);
  onSekretReplyRef.current = onSekretReply;

  const tab = tabs.find(item => item.id === activeTab) || tabs[0];
  const text = activeTab === 'me' ? draft : tabDrafts[activeTab] || '';
  const tabEntries = useMemo(
    () => entries.filter(entry => normalizeSource(entry) === activeTab),
    [activeTab, entries],
  );
  const visiblePrompt =
    Boolean(tab.prompts?.length) && promptVisible && !noPressure && activeTab !== 'oracle';

  const miniStickerCharacter = tabToStickerCharacter(activeTab);

  const changeTab = (next: PagesTab) => {
    setActiveTab(next);
    setSelectedTag('');
    setLocked(false);
    setImageUri(undefined);
    setPromptVisible(true);
    setPromptIndex(0);
  };

  const updateText = (value: string) => {
    if (activeTab === 'me') setDraft(value);
    else setTabDrafts(current => ({ ...current, [activeTab]: value }));
  };

  const chooseImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0]?.uri);
  };

  const save = async () => {
    if (!text.trim() && !imageUri) return;

    const entryMoodTag = selectedTag || mood || '';

    // 1. Generate a stable id shared with App.tsx — must happen BEFORE onSave
    //    so saveJournalEntry receives the same id that patchJournalEntry will
    //    search for when the Worker reply arrives.
    const entryId = Date.now();

    // 2. Persist the entry immediately (local-first, unchanged behavior).
    onSave({
      id: entryId,
      text: text.trim(), source: activeTab, moodTag: entryMoodTag,
      entryMode: 'typed', locked, imageUri,
    });

    // Clear the draft right away so the user is unblocked.
    const savedText = text.trim();
    updateText('');
    setSelectedTag('');
    setLocked(false);
    setImageUri(undefined);

    // 3. Only Se'kret tabs get an AI reply. Me, Oracle, parentSekret, bridge: skip.
    if (!tabToAvatarKey(activeTab)) return;

    // 4. Show typing indicator immediately.
    setReplyState(prev => ({ ...prev, [entryId]: { typing: true } }));

    // 5. Call Worker (fetchPagesReply never throws).
    const reply = await fetchPagesReply({
      tab: activeTab,
      text: savedText,
      mood: entryMoodTag,
    });

    // 6. Store reply locally for immediate display.
    setReplyState(prev => ({ ...prev, [entryId]: { typing: false, reply } }));

    // 7. Persist reply to the entry via parent callback so it survives
    //    navigation and app restarts via AsyncStorage.
    onSekretReplyRef.current?.(entryId, reply);
  };

  return (
    <View style={[styles.root, { backgroundColor: charRootBg }]}>
      {parentRoomImage ? (
        <>
          <Image source={parentRoomImage} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFillObject, styles.parentRoomOverlay]} />
        </>
      ) : null}

      <View style={styles.header}>
        <View>
          <Text style={[styles.kicker, { color: tab.accent }]}>
            {side === 'teen' ? 'TEEN PAGES' : 'PARENT PAGES'}
          </Text>
          <Text style={styles.headerTitle}>Pages</Text>
        </View>
        <View style={styles.privatePill}>
          <Text style={styles.privatePillText}>private by default</Text>
        </View>
      </View>

      <View style={styles.tabsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map(item => {
            const active = item.id === activeTab;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => changeTab(item.id)}
                style={[
                  styles.tab,
                  active && { borderColor: item.accent, backgroundColor: item.accent + '20' },
                ]}
              >
                <Text style={[styles.tabIcon, active && { color: item.accent }]}>{item.icon}</Text>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === 'oracle' ? (
          <>
            <OracleDiscoveryPanel
              side={side}
              profile={oracleProfile}
              accent={tab.accent}
              onComplete={onCompleteOracleSession}
            />
            {tabEntries.length ? (
              <View>
                <View style={styles.savedHeader}>
                  <Text style={styles.savedTitle}>Earlier Se\u2019kret discoveries</Text>
                  <Text style={styles.savedCount}>{tabEntries.length}</Text>
                </View>
                {tabEntries.map(entry => (
                  <View key={String(entry.id)} style={styles.entryCard}>
                    <Text style={styles.entryMeta}>{formatEntryMeta(entry)}</Text>
                    <PrivacyLabel shared={false} compact />
                    {entry.text ? <Text style={styles.entryText}>{entry.text}</Text> : null}
                    {entry.imageUri
                      ? <Image source={{ uri: entry.imageUri }} style={styles.savedImage as any} />
                      : null}
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : (
          <>
            {activeTab !== 'me' && (
              <View style={styles.intro}>
                {tab.eyebrow
                  ? <Text style={[styles.eyebrow, { color: tab.accent }]}>{tab.eyebrow}</Text>
                  : null}
                <Text style={styles.title}>{tab.title}</Text>
                {tab.subtitle
                  ? <Text style={styles.subtitle}>{tab.subtitle}</Text>
                  : null}
              </View>
            )}

            {visiblePrompt && tab.prompts ? (
              <View style={[styles.promptCard, { borderColor: tab.accent + '66' }]}>
                <Text style={styles.prompt}>
                  {tab.prompts[promptIndex % tab.prompts.length]}
                </Text>
                <View style={styles.promptActions}>
                  <TouchableOpacity onPress={() => setPromptIndex(i => i + 1)}>
                    <Text style={[styles.promptAction, { color: tab.accent }]}>another</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setPromptVisible(false)}>
                    <Text style={styles.dismiss}>dismiss</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={[styles.paper, { borderColor: tab.accent + '70' }]}>
              <View pointerEvents="none" style={styles.paperMargin} />
              <View pointerEvents="none" style={styles.paperLines}>
                {Array.from({ length: 10 }, (_, index) => (
                  <View key={index} style={styles.paperLine} />
                ))}
              </View>
              <TextInput
                autoFocus={activeTab === 'me'}
                multiline
                value={text}
                onChangeText={updateText}
                placeholder={activeTab === 'me' ? undefined : tab.placeholder}
                placeholderTextColor="#736c82"
                style={styles.input}
                textAlignVertical="top"
              />
              {imageUri
                ? <Image source={{ uri: imageUri }} style={styles.attachment as any} />
                : null}
              <MiniAvatarSticker
                character={miniStickerCharacter}
                screenContext="pages"
                size={48}
                bottom={8}
                right={8}
              />
            </View>

            <View style={styles.modeRow}>
              <TouchableOpacity
                onPress={() => setNoPressure(v => !v)}
                style={[styles.modeChip, noPressure && styles.modeChipActive]}
              >
                <Text style={styles.modeChipText}>
                  {noPressure ? 'no-pressure mode on' : 'no-pressure mode'}
                </Text>
              </TouchableOpacity>
              {tab.prompts?.length && !promptVisible && !noPressure ? (
                <TouchableOpacity onPress={() => setPromptVisible(true)}>
                  <Text style={[styles.showPrompt, { color: tab.accent }]}>show a prompt</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {!noPressure ? (
              <View style={styles.tags}>
                {moodTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => setSelectedTag(current => current === tag ? '' : tag)}
                    style={[
                      styles.tag,
                      selectedTag === tag && {
                        borderColor: tab.accent,
                        backgroundColor: tab.accent + '24',
                      },
                    ]}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            <View style={styles.toolRow}>
              <TouchableOpacity style={styles.tool} onPress={() => setScreen('voiceBip')}>
                <Text style={styles.toolIcon}>\u25c9</Text>
                <Text style={styles.toolText}>Voice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tool} onPress={chooseImage}>
                <Text style={styles.toolIcon}>\u25a7</Text>
                <Text style={styles.toolText}>Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.tool,
                  locked && { borderColor: tab.accent, backgroundColor: tab.accent + '20' },
                ]}
                onPress={() => setLocked(v => !v)}
              >
                <Text style={styles.toolIcon}>{locked ? '\u25a3' : '\u25a2'}</Text>
                <Text style={styles.toolText}>Lock</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!text.trim() && !imageUri}
                onPress={save}
                style={[
                  styles.save,
                  { backgroundColor: tab.accent },
                  !text.trim() && !imageUri && styles.saveDisabled,
                ]}
              >
                <Text style={styles.saveText}>Save page</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.privacyLine}>
              {side === 'teen'
                ? 'Only you can see these pages. Nothing goes to Parent Pages unless you deliberately choose to share elsewhere.'
                : 'For your reflection only. Teen Pages are separate and never shown here.'}
            </Text>

            <View style={styles.savedHeader}>
              <Text style={styles.savedTitle}>Saved \u00b7 {tab.label}</Text>
              <Text style={styles.savedCount}>{tabEntries.length}</Text>
            </View>
            <SyncBadge status={syncStatus ?? 'idle'} />

            {tabEntries.length ? tabEntries.map(entry => {
              // Determine reply display:
              // 1. Prefer persisted reply from entry (survived navigation / restart).
              // 2. Fall back to transient replyState (typing or freshly arrived reply).
              const transient = replyState[entry.id];
              const persistedReply = entry.sekretReply;
              const showTyping = !persistedReply && transient?.typing;
              const displayReply = persistedReply || (!transient?.typing ? transient?.reply : undefined);

              return (
                <View key={String(entry.id)}>
                  <View style={styles.entryCard}>
                    <View style={styles.entryTop}>
                      <Text style={styles.entryMeta}>{formatEntryMeta(entry)}</Text>
                      {entry.locked ? <Text style={styles.locked}>extra private</Text> : null}
                    </View>
                    {entry.text ? <Text style={styles.entryText}>{entry.text}</Text> : null}
                    {entry.imageUri
                      ? <Image source={{ uri: entry.imageUri }} style={styles.savedImage as any} />
                      : null}
                  </View>
                  {/* Se'kret reply bubble — only shown for reply-eligible tabs */}
                  <SekretReplyBubble
                    tab={activeTab}
                    reply={displayReply}
                    typing={showTyping}
                    accent={tab.accent}
                  />
                </View>
              );
            }) : (
              <BipEmptyState type="empty" message="Nothing saved here yet. Your words will live here." />
            )}
          </>
        )}
      </ScrollView>
      {BottomNav}
    </View>
  );
}

export function PagesScreen({
  journalText, setJournalText, journalEntries, saveJournalEntry,
  mood, setScreen, BottomNav, oracleProfile, onCompleteOracleSession,
  selectedSekret, moodHistory, voiceNotes, streakDays, onSekretReply,
  syncStatus,
}: PagesScreenProps) {
  return (
    <PagesWorkspace
      side="teen"
      entries={journalEntries}
      draft={journalText}
      setDraft={setJournalText}
      onSave={entry => saveJournalEntry(entry)}
      mood={mood}
      setScreen={setScreen}
      BottomNav={BottomNav}
      selectedSekret={selectedSekret}
      moodHistory={moodHistory}
      voiceNotes={voiceNotes}
      streakDays={streakDays}
      oracleProfile={oracleProfile}
      onCompleteOracleSession={onCompleteOracleSession}
      onSekretReply={onSekretReply}
      syncStatus={syncStatus}
    />
  );
}

export { PagesWorkspace };

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: Platform.OS === 'ios' ? 54 : 28 },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: { fontSize: 10, fontWeight: '800', letterSpacing: 2 },
  headerTitle: { color: '#fff', fontSize: 30, fontWeight: '800', marginTop: 2 },
  privatePill: {
    borderWidth: 1,
    borderColor: '#ffffff22',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  privatePillText: { color: '#aaa2b5', fontSize: 10 },
  tabsWrap: { borderBottomWidth: 1, borderBottomColor: '#ffffff0d' },
  tabs: { paddingHorizontal: 14, paddingTop: 12, gap: 4, alignItems: 'flex-end' },
  tab: {
    minWidth: 68,
    height: 46,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#ffffff14',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
  },
  tabIcon: { color: '#8c8498', fontSize: 14, marginBottom: 3 },
  tabText: { color: '#7e7690', fontSize: 11, fontWeight: '700' },
  tabTextActive: { color: '#fff', fontWeight: '800' },
  content: { paddingHorizontal: 18, paddingBottom: 32 },
  intro: { minHeight: 72, justifyContent: 'flex-end', marginBottom: 14 },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  title: { color: '#fff', fontSize: 22, lineHeight: 28, fontWeight: '700' },
  subtitle: { color: '#aaa2b5', fontSize: 13, lineHeight: 19, marginTop: 6 },
  promptCard: {
    borderWidth: 1,
    backgroundColor: '#ffffff08',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  prompt: { color: '#f4eff7', fontSize: 15, lineHeight: 21 },
  promptActions: { flexDirection: 'row', gap: 18, marginTop: 12 },
  promptAction: { fontSize: 11, fontWeight: '800' },
  dismiss: { color: '#827b8d', fontSize: 11 },
  paper: {
    minHeight: 220,
    backgroundColor: '#fbf6e9',
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  paperMargin: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 38,
    width: 1,
    backgroundColor: 'rgba(219, 116, 129, 0.38)',
  },
  paperLines: { ...StyleSheet.absoluteFillObject, paddingTop: 26 },
  paperLine: {
    height: 29,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(92, 134, 160, 0.28)',
  },
  input: {
    minHeight: 220,
    color: '#27212c',
    fontSize: 17,
    lineHeight: 29,
    paddingTop: 20,
    paddingRight: 18,
    paddingBottom: 18,
    paddingLeft: 50,
    fontFamily: Platform.select({ ios: 'Bradley Hand', android: 'sans-serif', default: 'cursive' }),
  },
  attachment: { height: 160, margin: 12, marginTop: 0, borderRadius: 12 },
  modeRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeChip: {
    borderWidth: 1,
    borderColor: '#ffffff1c',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeChipActive: { backgroundColor: '#ffffff12' },
  modeChipText: { color: '#a79eaf', fontSize: 10 },
  showPrompt: { fontSize: 11, fontWeight: '700' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 13 },
  tag: {
    borderWidth: 1,
    borderColor: '#ffffff20',
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: { color: '#beb6c7', fontSize: 11 },
  toolRow: { flexDirection: 'row', gap: 7, alignItems: 'stretch' },
  tool: {
    width: 57,
    borderWidth: 1,
    borderColor: '#ffffff1e',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  toolIcon: { color: '#d9d1df', fontSize: 15 },
  toolText: { color: '#a9a1b2', fontSize: 9, marginTop: 3 },
  save: {
    flex: 1,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveDisabled: { opacity: 0.3 },
  saveText: { color: '#171018', fontSize: 13, fontWeight: '900' },
  privacyLine: { color: '#77707f', fontSize: 10, lineHeight: 15, marginTop: 13 },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 12,
  },
  savedTitle: { color: '#e9e2ed', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
  savedCount: { color: '#827a89', fontSize: 11 },
  entryCard: {
    backgroundColor: '#faf7f3',
    borderWidth: 1,
    borderColor: '#e2dcd5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  entryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  entryMeta: { color: '#9a8e86', fontSize: 9, flex: 1, letterSpacing: 0.3 },
  locked: { color: '#7c4f99', fontSize: 9, fontWeight: '700' },
  entryText: { color: '#2c2420', fontSize: 14, lineHeight: 22 },
  savedImage: { height: 150, borderRadius: 6, marginTop: 10 },
  empty: {
    borderWidth: 1,
    borderColor: '#ffffff12',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 22,
    alignItems: 'center',
  },
  emptyText: { color: '#746d7c', fontSize: 12 },
  oraclePresence: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  oracleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8b7bb8' },
  oraclePresenceText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  oraclePanel: { marginBottom: 14 },
  oracleListening: { color: '#7a7086', fontSize: 13, lineHeight: 20, paddingVertical: 6 },
  oracleQuestionBlock: {
    backgroundColor: '#0d0b15',
    borderWidth: 1,
    borderColor: '#4a3f6b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  oracleQuestionNum: {
    color: '#6b6077',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  oracleQuestionText: { color: '#e8e0f0', fontSize: 17, lineHeight: 27, fontWeight: '600' },
  oracleInput: {
    minHeight: 120,
    backgroundColor: '#f4efe7',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#8b7bb870',
    padding: 16,
    color: '#27212c',
    fontSize: 16,
    lineHeight: 26,
    marginBottom: 10,
  },
  oracleSubmit: {
    backgroundColor: '#8b7bb8',
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 8,
  },
  oracleSubmitDisabled: { opacity: 0.35 },
  oracleSubmitText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  oracleAckBlock: {
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  oracleAckText: { color: '#c4b5fd', fontSize: 22, fontWeight: '700', letterSpacing: 0.3 },
  oracleDoneBlock: { paddingVertical: 8 },
  oracleDoneText: {
    color: '#8b7bb8',
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  oracleHistoryHeader: {
    color: '#6b6077',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  oracleHistoryItem: {
    backgroundColor: '#0d0b15',
    borderWidth: 1,
    borderColor: '#2e2840',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  oracleHistoryQ: { color: '#7a7086', fontSize: 12, lineHeight: 18, marginBottom: 6 },
  oracleHistoryA: { color: '#c4b5fd', fontSize: 14, lineHeight: 22 },
  parentRoomOverlay: { backgroundColor: 'rgba(10, 5, 20, 0.70)' },
});
