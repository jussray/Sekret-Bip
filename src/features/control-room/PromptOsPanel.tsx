import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PERSONALITY_CONFIG } from '@/services/ai/personalities';
import { AVATAR_PERSONAS, lintAvatarResponse, type AvatarPersona } from '@/services/ai/aiPatternLinter';
import { PERSONA_OPERATIONS } from '@/config/controlRoomPersonaOperations';
import { PROMPT_OS_ENTRIES, PROMPT_OS_SCOPE, type PromptOsCategory } from '@/config/controlRoomPromptOs';
import { getCurrentFounderProfile, isFounderProfile } from '@/services/founderAudit';

type Panel = 'library' | 'personas' | 'quality' | 'deployments';
const categories: Array<'all' | PromptOsCategory> = ['all', 'personas', 'system', 'redteam', 'engineering', 'release'];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress}><Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text></TouchableOpacity>;
}

export default function PromptOsPanel() {
  const [panel, setPanel] = useState<Panel>('library');
  const [category, setCategory] = useState<'all' | PromptOsCategory>('all');
  const [query, setQuery] = useState('');
  const [lintPersona, setLintPersona] = useState<AvatarPersona>('redteam');
  const [lintDraft, setLintDraft] = useState('');
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const lintResult = useMemo(() => lintAvatarResponse(lintDraft, lintPersona), [lintDraft, lintPersona]);
  const entries = useMemo(() => PROMPT_OS_ENTRIES.filter((item) => category === 'all' || item.category === category).filter((item) => `${item.title} ${item.description} ${item.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [category, query]);

  useEffect(() => {
    void getCurrentFounderProfile().then((profile) => {
      setAuthorized(isFounderProfile(profile));
    });
  }, []);

  if (authorized === null) {
    return <View style={[s.root, s.centerContent]}><ActivityIndicator color="#a78bfa" /></View>;
  }

  if (!authorized) {
    return <View style={[s.root, s.centerContent]}>
      <Text style={s.lockedTitle}>Prompt OS is locked.</Text>
      <Text style={s.lockedBody}>Founder or admin access is required to view prompt, persona, and quality operations.</Text>
    </View>;
  }

  return <View style={s.root}>
    <View style={s.header}>
      <Text style={s.kicker}>SE'KRET BIP · CONTROL ROOM</Text>
      <Text style={s.title}>Prompt OS</Text>
      <Text style={s.muted}>{PROMPT_OS_SCOPE}. Founder-only prompt, persona, quality, and deployment operations.</Text>
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabs}>
      {(['library', 'personas', 'quality', 'deployments'] as Panel[]).map((item) => <Chip key={item} label={item} active={panel === item} onPress={() => setPanel(item)} />)}
    </ScrollView>
    <ScrollView style={s.body} contentContainerStyle={s.content}>
      {panel === 'library' ? <>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search Bip prompts" placeholderTextColor="#6b7280" style={s.input} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>{categories.map((item) => <Chip key={item} label={item} active={category === item} onPress={() => setCategory(item)} />)}</ScrollView>
        <Text style={s.result}>{entries.length} Bip prompts</Text>
        {entries.map((entry) => <View key={entry.id} style={s.card}>
          <View style={s.row}><Text style={s.badge}>{entry.category}</Text><Text style={s.platforms}>{entry.platforms.join(' · ')}</Text></View>
          <Text style={s.cardTitle}>{entry.title}</Text>
          <Text style={s.bodyText}>{entry.description}</Text>
          <Text style={s.prompt}>{entry.prompt}</Text>
          <Text style={s.tags}>{entry.tags.map((tag) => `#${tag}`).join('  ')}</Text>
        </View>)}
      </> : null}

      {panel === 'personas' ? <>
        <View style={s.panel}><Text style={s.panelTitle}>Persona Studio</Text><Text style={s.bodyText}>Existing Bip companions remain the characters. Voice profiles are internal operating rules.</Text></View>
        {Object.values(PERSONA_OPERATIONS).map((operation) => {
          const personality = PERSONALITY_CONFIG[operation.personalityId];
          return <View key={operation.personalityId} style={s.card}>
            <View style={s.row}><Text style={s.cardTitle}>{personality.emoji} {personality.name}</Text><Text style={[s.status, operation.status === 'watch' && s.watch]}>{operation.status}</Text></View>
            <Text style={s.bodyText}>{personality.title} · {personality.vibe}</Text>
            <Text style={s.detail}>Voice: {operation.voiceProfile}</Text>
            <Text style={s.detail}>Safety: {operation.safetyProfile}</Text>
            <Text style={s.detail}>Memory: {operation.memoryProfile}</Text>
            <Text style={s.muted}>{operation.notes}</Text>
          </View>;
        })}
      </> : null}

      {panel === 'quality' ? <>
        <View style={s.panel}><Text style={s.panelTitle}>AI Voice Authenticity</Text><Text style={s.bodyText}>Founder-only advisory linting. Live response retry or blocking stays off until false positives are measured.</Text><Text style={s.detail}>Source: ai_pattern_scan</Text><Text style={s.detail}>Category: ai_quality</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>{AVATAR_PERSONAS.map((item) => <Chip key={item} label={item} active={lintPersona === item} onPress={() => setLintPersona(item)} />)}</ScrollView>
        <TextInput value={lintDraft} onChangeText={setLintDraft} placeholder="Paste an avatar draft to lint" placeholderTextColor="#6b7280" multiline style={[s.input, { minHeight: 140, textAlignVertical: 'top' }]} />
        <View style={s.card}>
          <View style={s.row}><Text style={s.cardTitle}>Lint result</Text><Text style={[s.status, { color: lintResult.severity === 'block' ? '#fb7185' : lintResult.severity === 'warn' ? '#facc15' : '#4ade80' }]}>{lintResult.severity}</Text></View>
          <Text style={s.detail}>Score: {lintResult.score}</Text>
          <Text style={s.bodyText}>{lintResult.summary}</Text>
          {lintResult.hits.map((hit) => <Text key={hit.patternId} style={s.tags}>{hit.severity.toUpperCase()} · P{hit.patternId} {hit.patternName}: {hit.matches.join(', ')}</Text>)}
        </View>
        <View style={s.card}><Text style={s.cardTitle}>Quality pipeline</Text><Text style={s.bodyText}>Prompt → persona rules → model response → pattern lint → safety checks → telemetry → Control Room issue.</Text></View>
      </> : null}

      {panel === 'deployments' ? <>
        <View style={s.panel}><Text style={s.panelTitle}>Prompt lifecycle</Text><Text style={s.bodyText}>Create → test → lint → red-team → deploy → monitor → rollback.</Text></View>
        <View style={s.card}><Text style={s.cardTitle}>Deployment guard</Text><Text style={s.bodyText}>No prompt deployment is active from this screen yet. The first production deployment path must version the prompt, record the actor, preserve the prior version, and provide rollback.</Text></View>
        <View style={s.card}><Text style={s.cardTitle}>Provider boundary</Text><Text style={s.bodyText}>Prompt OS owns behavior. Provider adapters own ChatGPT, Claude, Codex, DeepSeek, Perplexity, or future model formatting. DeepSeek remains advisory-only until an authenticated server adapter, output validation, telemetry, cost limits, and rollback are verified.</Text></View>
      </> : null}
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080611' },
  centerContent: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  lockedTitle: { color: '#fff', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  lockedBody: { color: '#8f899e', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  header: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 14 },
  kicker: { color: '#a78bfa', fontWeight: '800', fontSize: 11, letterSpacing: 2 },
  title: { color: '#fff', fontWeight: '900', fontSize: 30, marginTop: 4 },
  muted: { color: '#8f899e', fontSize: 12, lineHeight: 18 },
  tabs: { maxHeight: 54, paddingHorizontal: 16 },
  body: { flex: 1 },
  content: { padding: 16, paddingBottom: 80 },
  chip: { borderWidth: 1, borderColor: '#2b2540', backgroundColor: '#12101c', paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#6d28d9', borderColor: '#a78bfa' },
  chipText: { color: '#a7a1b7', fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: '#12101c', borderColor: '#332c48', borderWidth: 1, borderRadius: 12, padding: 12, color: '#fff', marginBottom: 10 },
  result: { color: '#a78bfa', fontWeight: '800', marginVertical: 12 },
  card: { backgroundColor: '#12101c', borderColor: '#272238', borderWidth: 1, borderRadius: 16, padding: 15, marginBottom: 10 },
  panel: { backgroundColor: '#12101c', borderWidth: 1, borderColor: '#272238', borderRadius: 18, padding: 16, marginBottom: 12 },
  panelTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  cardTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginVertical: 7, flexShrink: 1 },
  bodyText: { color: '#c8c3d2', fontSize: 13, lineHeight: 19 },
  prompt: { color: '#ded8e8', fontSize: 12, lineHeight: 18, marginTop: 12, padding: 12, backgroundColor: '#0d0a15', borderRadius: 10 },
  badge: { color: '#a78bfa', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' },
  platforms: { color: '#8f899e', fontSize: 10 },
  tags: { color: '#7c73a0', fontSize: 10, marginTop: 10 },
  detail: { color: '#c4b5fd', fontSize: 12, marginTop: 6 },
  status: { color: '#4ade80', fontWeight: '900', fontSize: 10, textTransform: 'uppercase' },
  watch: { color: '#facc15' },
});