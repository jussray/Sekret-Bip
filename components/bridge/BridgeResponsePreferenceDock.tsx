import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BRIDGE_RESPONSE_PREFERENCES,
  getBridgeResponsePreference,
  loadBridgeResponsePreference,
  saveBridgeResponsePreference,
  type BridgeResponsePreference,
} from '@/features/bridge/responsePreference';

export function BridgeResponsePreferenceDock() {
  const [preference, setPreference] = useState<BridgeResponsePreference | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void loadBridgeResponsePreference().then(value => {
      if (!active) return;
      setPreference(value);
      setOpen(!value);
    });
    return () => { active = false; };
  }, []);

  const selected = useMemo(
    () => getBridgeResponsePreference(preference),
    [preference],
  );

  async function choose(next: BridgeResponsePreference) {
    setPreference(next);
    setOpen(false);
    await saveBridgeResponsePreference(next);
  }

  return (
    <>
      <TouchableOpacity
        style={styles.dock}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={selected
          ? `Change how your person should respond. Current choice: ${selected.teenLabel}`
          : 'Choose how your person should respond'}
        activeOpacity={0.88}
      >
        <Text style={styles.dockEmoji}>{selected?.emoji ?? '🫶'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.dockKicker}>HOW SHOULD THEY RESPOND?</Text>
          <Text style={styles.dockLabel}>{selected?.teenLabel ?? 'choose before you send'}</Text>
        </View>
        <Text style={styles.dockArrow}>›</Text>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => {
        if (preference) setOpen(false);
      }}>
        <Pressable style={styles.backdrop} onPress={() => {
          if (preference) setOpen(false);
        }}>
          <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
            <Text style={styles.kicker}>BRIDGE RESPONSE</Text>
            <Text style={styles.title}>What would help after you send this?</Text>
            <Text style={styles.body}>
              Your person sees this request with your Bridge signal. They still do not get the rest of your private space.
            </Text>

            <View style={styles.options}>
              {BRIDGE_RESPONSE_PREFERENCES.map(option => {
                const active = option.key === preference;
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[styles.option, active && styles.optionActive]}
                    onPress={() => void choose(option.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${option.teenLabel}. ${option.hint}`}
                  >
                    <Text style={styles.optionEmoji}>{option.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                        {option.teenLabel}
                      </Text>
                      <Text style={styles.optionHint}>{option.hint}</Text>
                    </View>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            {preference ? (
              <TouchableOpacity style={styles.closeButton} onPress={() => setOpen(false)}>
                <Text style={styles.closeText}>keep this choice</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.requiredText}>Choose one so the adult knows what support means this time.</Text>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    zIndex: 60,
    elevation: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.52)',
    backgroundColor: 'rgba(17,8,35,0.96)',
    paddingHorizontal: 14,
    paddingVertical: 11,
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.36,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
  },
  dockEmoji: { fontSize: 22 },
  dockKicker: { color: '#8f7aa6', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  dockLabel: { color: '#f3ecff', fontSize: 13, fontWeight: '900', marginTop: 2 },
  dockArrow: { color: '#c4b5fd', fontSize: 25 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,2,14,0.76)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(196,181,253,0.30)',
    backgroundColor: '#120923',
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 28,
  },
  kicker: { color: '#a78bfa', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 23, fontWeight: '900', lineHeight: 29, marginTop: 5 },
  body: { color: '#a99db8', fontSize: 12, lineHeight: 18, marginTop: 7, marginBottom: 14 },
  options: { gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    padding: 13,
  },
  optionActive: { borderColor: 'rgba(167,139,250,0.76)', backgroundColor: 'rgba(76,29,149,0.24)' },
  optionEmoji: { fontSize: 23 },
  optionTitle: { color: '#e9e2f4', fontSize: 13, fontWeight: '900' },
  optionTitleActive: { color: '#fff' },
  optionHint: { color: '#8f82a0', fontSize: 10, lineHeight: 15, marginTop: 2 },
  check: { color: '#c4b5fd', fontSize: 18, fontWeight: '900' },
  closeButton: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 12, marginTop: 10 },
  closeText: { color: '#c4b5fd', fontSize: 11, fontWeight: '800' },
  requiredText: { color: '#8f82a0', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 12 },
});
