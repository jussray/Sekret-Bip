import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { router, usePathname } from 'expo-router';

type Side = 'teen' | 'parent';

interface Props {
  side: Side;
}

const ROOTS: Record<Side, string> = {
  teen: '/(teen)/room',
  parent: '/(parent)/room',
};

function belongsToSide(pathname: string, side: Side) {
  if (side === 'teen') return pathname.startsWith('/room') || pathname.startsWith('/pages') || pathname.startsWith('/calm') || pathname.startsWith('/circle') || pathname.startsWith('/more') || pathname.startsWith('/sekret') || pathname.startsWith('/voicebip') || pathname.startsWith('/cloud') || pathname.startsWith('/comfort') || pathname.startsWith('/crew') || pathname.startsWith('/history') || pathname.startsWith('/bridge') || pathname.startsWith('/s2tell') || pathname.startsWith('/period-calendar') || pathname.startsWith('/discover') || pathname.startsWith('/profile') || pathname.startsWith('/chat') || pathname.startsWith('/user-room');
  return pathname.startsWith('/room') || pathname.startsWith('/pages') || pathname.startsWith('/circle') || pathname.startsWith('/more') || pathname.startsWith('/bridge') || pathname.startsWith('/voicebip') || pathname.startsWith('/settings') || pathname.startsWith('/bip-jr');
}

export function SideSafeBackButton({ side }: Props) {
  const pathname = usePathname();
  const history = useRef<string[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (!belongsToSide(pathname, side)) return;
    const stack = history.current;
    if (stack[stack.length - 1] !== pathname) stack.push(pathname);
    if (stack.length > 30) stack.shift();
    setCanGoBack(stack.length > 1);
  }, [pathname, side]);

  const isRoot = pathname === '/room';
  if (isRoot && !canGoBack) return null;

  function goBack() {
    const stack = history.current;
    if (stack.length > 1) {
      stack.pop();
      const previous = stack[stack.length - 1];
      setCanGoBack(stack.length > 1);
      router.replace(previous as never);
      return;
    }
    router.replace(ROOTS[side] as never);
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Back within ${side} side`}
      onPress={goBack}
      style={styles.button}
      activeOpacity={0.88}
    >
      <Text style={styles.arrow}>‹</Text>
      <Text style={styles.label}>Back</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 52,
    left: 14,
    zIndex: 1200,
    elevation: 24,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(15,9,25,0.92)',
  },
  arrow: { color: '#fff', fontSize: 27, lineHeight: 28, marginRight: 3, marginTop: -2 },
  label: { color: '#eee7f2', fontSize: 10, fontWeight: '900' },
});
