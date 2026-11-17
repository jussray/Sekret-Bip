import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

export default function ParentWelcome() {
  const fade  = useRef(new Animated.Value(0)).current;
  const rise  = useRef(new Animated.Value(20)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 900, delay: 200, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 900, delay: 200, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 3000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 3000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [fade, rise, pulse]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#071410', '#0d1f18', '#08140f']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[styles.glow, { transform: [{ scale: pulse }] }]} />

      <Animated.View style={[styles.content, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <Text style={styles.kicker}>FOR PARENTS</Text>

        <Text style={styles.title}>You're here{`\n`}for them.</Text>

        <View style={styles.divider} />

        <Text style={styles.body}>
          Se'kret Bip gives you a quiet way to stay close — without hovering. You'll see what they share, not what they keep.
        </Text>
        <Text style={styles.bodyAccent}>
          Their space stays theirs. Yours is here.
        </Text>

        <View style={styles.pillRow}>
          {['🌿 Bridge', '💬 Circle', '📖 Pages', '🤝 Repair'].map(label => (
            <View key={label} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fade }]}>
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => router.push('/(auth)/signup?side=parent' as never)}
          accessibilityRole="button"
          accessibilityLabel="Create my Parent account"
        >
          <Text style={styles.btnText}>Create my Parent account →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signIn}
          onPress={() => router.push('/(auth)/login?side=parent' as never)}
          accessibilityRole="button"
          accessibilityLabel="I already have an account"
        >
          <Text style={styles.signInText}>I already have an account</Text>
        </TouchableOpacity>
        <Text style={styles.legal}>Your teen's data stays private</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#08140f' },
  glow:       { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: '#a7f3d0', opacity: 0.07, top: '16%', alignSelf: 'center' },
  content:    { flex: 1, paddingTop: Platform.OS === 'ios' ? 80 : 60, paddingHorizontal: 28 },
  kicker:     { color: '#6ee7b7', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 20 },
  title:      { color: '#fff', fontSize: 44, fontWeight: '900', lineHeight: 50 },
  divider:    { width: 40, height: 3, backgroundColor: '#a7f3d0', borderRadius: 2, marginTop: 22, marginBottom: 22 },
  body:       { color: '#b7c9bf', fontSize: 16, lineHeight: 26, marginBottom: 12 },
  bodyAccent: { color: '#789082', fontSize: 13, marginBottom: 36 },
  pillRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:       { borderRadius: 999, borderWidth: 1, borderColor: '#ffffff15', paddingHorizontal: 12, paddingVertical: 7 },
  pillText:   { color: '#8aaf9c', fontSize: 12, fontWeight: '700' },
  footer:     { paddingHorizontal: 28, paddingBottom: Platform.OS === 'ios' ? 52 : 36 },
  btn:        { height: 58, borderRadius: 20, backgroundColor: '#a7f3d0', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  btnText:    { color: '#062015', fontSize: 16, fontWeight: '900' },
  signIn:     { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  signInText: { color: '#8aaf9c', fontSize: 13, fontWeight: '800' },
  legal:      { color: '#3d5e4a', fontSize: 11, textAlign: 'center' },
});
