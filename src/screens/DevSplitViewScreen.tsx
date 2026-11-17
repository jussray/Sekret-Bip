import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { getCurrentFounderProfile, isFounderProfile, type FounderProfile } from '@/services/founderAudit';
import { DEV_SPLIT_VIEW_SIDE_PARAM } from '@/utils/devSplitViewSide';

type PaneSide = 'teen' | 'parent';

// Both panes load the same origin, which would otherwise share the founder's
// real AsyncStorage userSide and race to the same room. Stamp each pane's
// side onto its URL so the route gates (app/_layout.tsx, app/(teen)/_layout.tsx)
// can render the correct side for that pane specifically.
function withDevSide(path: string, side: PaneSide): string {
  const [withoutHash, hash] = path.split('#');
  const separator = withoutHash.includes('?') ? '&' : '?';
  const stamped = `${withoutHash}${separator}${DEV_SPLIT_VIEW_SIDE_PARAM}=${side}`;
  return hash ? `${stamped}#${hash}` : stamped;
}

interface QuickLink {
  label: string;
  path: string;
}

// Expo Router strips group folders like "(teen)"/"(parent)" from the web URL, so
// deep links must use the bare path. Several leaf names exist on both sides
// (room, bridge, growth, sekret, circle, settings, more, profile, s2tell,
// voicebip, calm, pages, period-calendar) and only one side's screen is
// reachable at that bare URL — the teen route group also refuses to render
// at all until it's the active session side. Only list links here that are
// verified reachable from a cold link.
const TEEN_LINKS: QuickLink[] = [
  { label: 'Home', path: '/' },
  { label: 'User Room', path: '/user-room' },
  { label: 'Companion Chat', path: '/companion-chat' },
  { label: 'Cloud', path: '/cloud' },
  { label: 'Cloud Thoughts', path: '/cloudThoughts' },
  { label: 'Comfort', path: '/comfort' },
  { label: 'Crew', path: '/crew' },
  { label: 'Points', path: '/points' },
  { label: 'History', path: '/history' },
  { label: 'Discover', path: '/discover' },
];

const PARENT_LINKS: QuickLink[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Room', path: '/room' },
  { label: 'Bridge', path: '/bridge' },
  { label: 'Sekret', path: '/sekret' },
  { label: 'Growth', path: '/growth' },
  { label: 'More', path: '/more' },
  { label: 'Profile', path: '/profile' },
  { label: 'S2Tell', path: '/s2tell' },
  { label: 'Settings', path: '/settings' },
  { label: 'Repair', path: '/repair' },
  { label: 'Voice Reflect', path: '/voicereflect' },
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipOn]} onPress={onPress}>
      <Text style={[s.chipText, active && s.chipTextOn]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Pane({ side, initialPath }: { side: PaneSide; initialPath: string }) {
  const [path, setPath] = useState(initialPath);
  const [draft, setDraft] = useState(initialPath);
  const [reloadToken, setReloadToken] = useState(0);
  const links = side === 'teen' ? TEEN_LINKS : PARENT_LINKS;

  const go = useCallback((next: string) => {
    setPath(next);
    setDraft(next);
  }, []);

  return (
    <View style={s.pane}>
      <View style={s.paneHeader}>
        <Text style={s.paneLabel}>{side === 'teen' ? '🧑 Teen side' : '👪 Parent side'}</Text>
        <View style={s.addressRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => go(draft.trim() || initialPath)}
            placeholder={side === 'teen' ? '/user-room' : '/dashboard'}
            placeholderTextColor="#6b7280"
            style={s.addressInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={s.goBtn} onPress={() => go(draft.trim() || initialPath)}>
            <Text style={s.goBtnText}>Go</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.goBtn} onPress={() => setReloadToken((v) => v + 1)}>
            <Text style={s.goBtnText}>⟳</Text>
          </TouchableOpacity>
          {Platform.OS === 'web' ? (
            <TouchableOpacity
              style={s.goBtn}
              onPress={() => {
                if (typeof window !== 'undefined') window.open(withDevSide(path, side), '_blank');
              }}
            >
              <Text style={s.goBtnText}>↗</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipRow}>
          {links.map((link) => (
            <Chip key={link.path} label={link.label} active={path === link.path} onPress={() => go(link.path)} />
          ))}
        </ScrollView>
      </View>
      <View style={s.frameWrap}>
        {Platform.OS === 'web'
          ? React.createElement('iframe', {
              key: `${side}-${reloadToken}`,
              src: withDevSide(path, side),
              title: `${side}-preview`,
              sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox',
              style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#080611' },
            })
          : (
            <View style={s.center}>
              <Text style={s.muted}>Live preview needs the web dev build.</Text>
            </View>
          )}
      </View>
    </View>
  );
}

export default function DevSplitViewScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const { width } = useWindowDimensions();
  const isRow = width >= 900;

  useEffect(() => {
    void (async () => {
      setProfile(await getCurrentFounderProfile());
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color="#a78bfa" />
        <Text style={s.muted}>Opening Split View…</Text>
      </View>
    );
  }

  if (!isFounderProfile(profile)) {
    return (
      <View style={s.center}>
        <Text style={s.lock}>🔒</Text>
        <Text style={s.modalTitle}>Developer tools locked</Text>
        <TouchableOpacity style={s.primary} onPress={() => router.replace('/')}>
          <Text style={s.primaryText}>Back to Bip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>SE'KRET BIP · FOUNDER</Text>
            <Text style={s.headerTitle}>Split View</Text>
          </View>
          <TouchableOpacity style={s.linkBtn} onPress={() => router.push('/(dev)/control-room')}>
            <Text style={s.linkBtnText}>Control Room</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.muted}>
          {Platform.OS === 'web'
            ? 'Each pane is pinned to its side (teen left, parent right) independent of your signed-in account’s stored side — sign in once and use a linked teen+parent pair to watch Bridge, Doorbell, and S2Tell interactions live in both panes at once. Some screen names exist on both sides (Room, Bridge, Growth, Sekret…); only the parent version is deep-linkable from cold, so drive those teen screens with in-app taps once you land inside.'
            : 'Independent split-screen preview requires the web dev build (npm run web). On-device navigation follows your account’s assigned side.'}
        </Text>
      </View>
      <View style={[s.body, isRow ? s.bodyRow : s.bodyCol]}>
        <Pane side="teen" initialPath="/" />
        <Pane side="parent" initialPath="/dashboard" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080611' },
  header: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 14 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
  kicker: { color: '#a78bfa', fontWeight: '800', fontSize: 11, letterSpacing: 2 },
  headerTitle: { color: '#fff', fontWeight: '900', fontSize: 30, marginTop: 4 },
  linkBtn: {
    borderWidth: 1,
    borderColor: '#2b2540',
    backgroundColor: '#12101c',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    marginTop: 6,
  },
  linkBtnText: { color: '#a7a1b7', fontWeight: '700', fontSize: 12 },
  muted: { color: '#8f899e', fontSize: 12, lineHeight: 18, marginTop: 8 },
  body: { flex: 1, padding: 12, gap: 12 },
  bodyRow: { flexDirection: 'row' },
  bodyCol: { flexDirection: 'column' },
  pane: {
    flex: 1,
    backgroundColor: '#100d1c',
    borderWidth: 1,
    borderColor: '#272238',
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 320,
  },
  paneHeader: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#272238' },
  paneLabel: { color: '#fff', fontWeight: '800', fontSize: 13, marginBottom: 8 },
  addressRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addressInput: {
    flex: 1,
    backgroundColor: '#12101c',
    borderColor: '#332c48',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    color: '#fff',
    fontSize: 12,
  },
  goBtn: {
    backgroundColor: '#6d28d9',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  goBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  chipRow: { marginTop: 8, maxHeight: 36 },
  chip: {
    borderWidth: 1,
    borderColor: '#2b2540',
    backgroundColor: '#12101c',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    marginRight: 6,
  },
  chipOn: { backgroundColor: '#6d28d9', borderColor: '#a78bfa' },
  chipText: { color: '#a7a1b7', fontWeight: '700', fontSize: 11 },
  chipTextOn: { color: '#fff' },
  frameWrap: { flex: 1 },
  center: { flex: 1, backgroundColor: '#080611', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  lock: { fontSize: 36 },
  modalTitle: { color: '#fff', fontSize: 25, fontWeight: '900', marginVertical: 10 },
  primary: { backgroundColor: '#6d28d9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
});
