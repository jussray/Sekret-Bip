import { useCallback, useEffect, useRef, useState } from 'react';

export function useSekretVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceReady = true;

  const stop = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    stop();
    if (!text.trim()) return;

    // Placeholder only. A future on-device voice adapter can replace this timer
    // without changing the companion UI or introducing a paid/external API now.
    setIsSpeaking(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsSpeaking(false);
    }, 1200);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { speak, stop, isSpeaking, voiceReady };
}
