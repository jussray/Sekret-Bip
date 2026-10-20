import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { JournalEntry } from '@/types';
import type { SavePageInput } from './PagesScreen';
import type { OracleProfile, OracleSessionSummary } from '../services/oracleDiscovery';

type ParentPageSection = 'letters' | 'bridge' | 'journal' | 'repair' | 'wins' | 'future';

interface ParentPagesScreenProps {
  entries: JournalEntry[];
  draft: string;
  setDraft: (text: string) => void;
  onSave: (entry: SavePageInput) => void;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
  mood?: string;
  parentRoomStyle?: 'mom' | 'dad';
  weatherMode?: string;
  oracleProfile?: OracleProfile;
  onCompleteOracleSession: (profile: OracleProfile, session: OracleSessionSummary) => void;
  onOpenPeriodCalendar?: () => void;
}

const SECTIONS: Array<{
  id: ParentPageSection;
  icon: string;
  label: string;
  title: string;
  subtitle: string;
  placeholder: string;
  prompts: string[];
}> = [
  {
    id: 'letters',
    icon: '💌',
    label: 'Letters',
    title: 'Letters to my teen',
    subtitle: 'Write it now. Decide later whether it should ever be shared.',
    placeholder: 'What do you want them to know, even if you are not ready to say it yet?',
    prompts: [
      'I hope you know…',
      'I was scared, not angry, when…',
      'One thing I am proud of is…',
    ],
  },
  {
    id: 'bridge',
    icon: '🌉',
    label: 'Bridge',
    title: 'Bridge replies',
    subtitle: 'A calm reply to something your teen chose to share.',
    placeholder: 'Keep it simple: I hear you. I am here. We can talk when you are ready.',
    prompts: [
      'I hear you.',
      'You do not have to explain everything right now.',
      'I can listen without fixing it.',
    ],
  },
  {
    id: 'journal',
    icon: '📖',
    label: 'Journal',
    title: 'Parenting journal',
    subtitle: 'Private space for your own thoughts. This stays on your side.',
    placeholder: 'What felt hard today? What do you need to understand better?',
    prompts: [
      'Today I noticed…',
      'I am struggling with…',
      'The part I do not know how to handle is…',
    ],
  },
  {
    id: 'repair',
    icon: '🌱',
    label: 'Repair',
    title: 'Repair notes',
    subtitle: 'Slow the moment down before you try again.',
    placeholder: 'What happened? What might they have heard? What do you want to do differently?',
    prompts: [
      'What happened?',
      'What do I think they heard?',
      'What can I do differently next time?',
    ],
  },
  {
    id: 'wins',
    icon: '✨',
    label: 'Wins',
    title: 'Wins I notice',
    subtitle: 'Save the good moments before they get swallowed by the hard ones.',
    placeholder: 'What did they do today that deserves to be remembered?',
    prompts: [
      'They kept going when…',
      'A small thing I noticed was…',
      'I want to remember this version of them…',
    ],
  },
  {
    id: 'future',
    icon: '📬',
    label: 'Future',
    title: 'Future letters',
    subtitle: 'Write for a birthday, graduation, age 20, or a day they will need your words.',
    placeholder: 'Open this when…',
    prompts: [
      'Open on your next birthday…',
      'Open when you doubt yourself…',
      'Open when you are ready to leave home…',
    ],
  },
];

function categoryOf(entry: JournalEntry): ParentPageSection {
  const tag = String(entry.moodTag ?? 'journal');
  return SECTIONS.some(section => section.id === tag) ? tag as ParentPageSection : 'journal';
}

export function ParentPagesScreen({
  entries,
  draft,
  setDraft,
  onSave,
  setScreen,
  BottomNav,
  parentRoomStyle = 'mom',
}: ParentPagesScreenProps) {
  const [section, setSection] = useState<ParentPageSection>('letters');
  const active = SECTIONS.find(item => item.id === section) ?? SECTIONS[0];
  const filteredEntries = useMemo(
    () => entries.filter(entry => categoryOf(entry) === section),
    [entries, section],
  );

  function save() {
    const text = draft.trim();
    if (!text) return;
    onSave({
      text,
      source: section === 'bridge' ? 'bridge' : 'me',
      moodTag: section,
      entryMode: 'typed',
      locked: true,
    });
  }

  const accent = parentRoomStyle === 'dad' ? '#8fb8dc' : '#b89bc8';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#f8f3ea', '#eee6da', '#ddd3c5']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.kicker}>PARENT PAGES</Text>
            <Text style={styles.title}>How do I want to show up?</Text>
          </View>
          <TouchableOpacity style={styles.roomButton} onPress={() => setScreen('room')}>
            <Text style={styles.roomButtonText}>Room</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.intro}>
          A grown-up scrapbook for letters, repair, memories, and the things you are still learning how to say.
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {SECTIONS.map(item => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSection(item.id)}
              style={[styles.tab, section === item.id && { borderColor: accent, backgroundColor: '#ffffffcc' }]}
            >
              <Text style={styles.tabIcon}>{item.icon}</Text>
              <Text style={[styles.tabText, section === item.id && { color: '#2f2633' }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.paperCard}>
          <View style={[styles.tape, { backgroundColor: `${accent}66` }]} />
          <Text style={styles.sectionEyebrow}>{active.icon} {active.label.toUpperCase()}</Text>
          <Text style={styles.sectionTitle}>{active.title}</Text>
          <Text style={styles.sectionSubtitle}>{active.subtitle}</Text>

          <View style={styles.promptRow}>
            {active.prompts.map(prompt => (
              <TouchableOpacity key={prompt} style={styles.promptChip} onPress={() => setDraft(prompt)}>
                <Text style={styles.promptText}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={active.placeholder}
            placeholderTextColor="#9b8f81"
            multiline
            textAlignVertical="top"
            style={styles.input}
          />

          <View style={styles.saveRow}>
            <Text style={styles.privateNote}>🔒 Private unless you choose to share later</Text>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: accent }, !draft.trim() && styles.saveDisabled]}
              onPress={save}
              disabled={!draft.trim()}
            >
              <Text style={styles.saveText}>Save page</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>{active.label} saved here</Text>
          <Text style={styles.historyCount}>{filteredEntries.length}</Text>
        </View>

        {filteredEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>{active.icon}</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyBody}>Your first page in this section will stay right here.</Text>
          </View>
        ) : (
          filteredEntries.map(entry => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryTop}>
                <Text style={styles.entryIcon}>{active.icon}</Text>
                <Text style={styles.entryDate}>{entry.date}{entry.time ? ` · ${entry.time}` : ''}</Text>
              </View>
              <Text style={styles.entryText}>{entry.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {BottomNav}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eee6da' },
  content: { paddingTop: Platform.OS === 'ios' ? 66 : 44, paddingHorizontal: 20, paddingBottom: 110 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  kicker: { color: '#7a6d61', fontSize: 10, fontWeight: '900', letterSpacing: 2.4, marginBottom: 8 },
  title: { color: '#2f2633', fontSize: 31, lineHeight: 37, fontWeight: '900', maxWidth: 290 },
  roomButton: { borderRadius: 999, borderWidth: 1, borderColor: '#b8aa9a', paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#ffffff88' },
  roomButtonText: { color: '#5e5147', fontSize: 12, fontWeight: '800' },
  intro: { color: '#74685d', fontSize: 14, lineHeight: 21, marginBottom: 20 },
  tabs: { gap: 10, paddingBottom: 18 },
  tab: { minWidth: 86, borderRadius: 18, borderWidth: 1, borderColor: '#cbbfb2', backgroundColor: '#ffffff66', paddingHorizontal: 13, paddingVertical: 11, alignItems: 'center' },
  tabIcon: { fontSize: 19, marginBottom: 4 },
  tabText: { color: '#75695f', fontSize: 11, fontWeight: '800' },
  paperCard: { borderRadius: 24, backgroundColor: '#fffaf1', borderWidth: 1, borderColor: '#d9ccbc', padding: 20, marginBottom: 26, shadowColor: '#4a3829', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  tape: { position: 'absolute', top: -9, alignSelf: 'center', width: 74, height: 20, transform: [{ rotate: '-2deg' }], borderRadius: 3 },
  sectionEyebrow: { color: '#8a7a6d', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 8, marginTop: 5 },
  sectionTitle: { color: '#2f2633', fontSize: 24, fontWeight: '900', marginBottom: 7 },
  sectionSubtitle: { color: '#776b61', fontSize: 13, lineHeight: 19, marginBottom: 16 },
  promptRow: { gap: 8, marginBottom: 14 },
  promptChip: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, borderColor: '#d8ccbf', backgroundColor: '#f7f0e7', paddingHorizontal: 12, paddingVertical: 8 },
  promptText: { color: '#6f6257', fontSize: 11, fontWeight: '700' },
  input: { minHeight: 180, borderRadius: 18, borderWidth: 1, borderColor: '#ded2c4', backgroundColor: '#fffdf8', padding: 16, color: '#332d28', fontSize: 16, lineHeight: 25, marginBottom: 15 },
  saveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  privateNote: { flex: 1, color: '#8a7c70', fontSize: 10, lineHeight: 15 },
  saveButton: { borderRadius: 16, paddingHorizontal: 18, paddingVertical: 13 },
  saveDisabled: { opacity: 0.35 },
  saveText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  historyTitle: { color: '#3b3137', fontSize: 17, fontWeight: '900' },
  historyCount: { minWidth: 28, textAlign: 'center', color: '#6d6157', fontSize: 12, fontWeight: '900', borderRadius: 999, backgroundColor: '#ffffff88', paddingHorizontal: 9, paddingVertical: 5 },
  emptyCard: { alignItems: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#d6cabb', backgroundColor: '#ffffff66', padding: 28 },
  emptyIcon: { fontSize: 28, marginBottom: 9 },
  emptyTitle: { color: '#3d3430', fontSize: 16, fontWeight: '900', marginBottom: 5 },
  emptyBody: { color: '#85786d', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  entryCard: { borderRadius: 20, borderWidth: 1, borderColor: '#d8ccbf', backgroundColor: '#fffaf2', padding: 17, marginBottom: 12 },
  entryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  entryIcon: { fontSize: 18 },
  entryDate: { color: '#94877a', fontSize: 10, fontWeight: '700' },
  entryText: { color: '#3b332e', fontSize: 14, lineHeight: 22 },
});
