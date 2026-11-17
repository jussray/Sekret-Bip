// hooks/usePresence.ts
// Se'kret Bip — Voice Bip Presence System
//
// The state machine behind Voice Bip's "I talked to Suhana" feel.
//
//   idle ─── beginListening ─▶ listening ─── endListening ─▶ thinking
//                                                              │
//                                       (THINKING_PAUSE_MS)    ▼
//                                                          responding
//                                       (responseShown)        │
//                                                              ▼
//                                                          comforting
//                                       (COMFORTING_HOLD_MS)   │
//                                                              ▼
//                                                            idle
//
// Oracle integration point: `notifyOracle` is called on every transition with
// the relevant event. The default impl is a NO-OP — Oracle is intentionally
// invisible until wired. The hook does no AI, no network, no analysis.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type PresenceCharacter,
  type PresenceState,
  THINKING_PAUSE_MS,
  COMFORTING_HOLD_MS,
} from '../constants/presence/avatarStates';
import { type PresenceTime } from '../constants/presence/timeOfDay';

// ─── Oracle event types ─────────────────────────────────────────────────────

export type OracleEvent =
  | { type: 'listening:start'; character: PresenceCharacter; time: PresenceTime }
  | { type: 'listening:end';   character: PresenceCharacter; time: PresenceTime; durationMs: number; transcript?: string }
  | { type: 'thinking:start';  character: PresenceCharacter; time: PresenceTime }
  | { type: 'responding:start'; character: PresenceCharacter; time: PresenceTime }
  | { type: 'responding:end';   character: PresenceCharacter; time: PresenceTime }
  | { type: 'comforting:start'; character: PresenceCharacter; time: PresenceTime }
  | { type: 'idle';             character: PresenceCharacter; time: PresenceTime };

/** Default Oracle handler — silent. Override via UsePresenceOptions.notifyOracle. */
const defaultNotifyOracle = (_event: OracleEvent): void => {
  // intentionally empty — Oracle stays invisible until wired
};

export type UsePresenceOptions = {
  character: PresenceCharacter;
  time: PresenceTime;
  /** Override to wire Oracle. Defaults to a no-op. */
  notifyOracle?: (event: OracleEvent) => void;
  /** Override the human-pause length in `thinking`. */
  thinkingPauseMs?: number;
  /** Override how long `comforting` lingers before returning to idle. */
  comfortingHoldMs?: number;
};

export type PresenceController = {
  /** Current presence state. */
  state: PresenceState | 'idle';
  /** True iff the avatar is currently listening to user audio. */
  isListening: boolean;
  /** True during the deliberate post-record pause. */
  isThinking: boolean;
  /** True while the response is being presented. */
  isResponding: boolean;
  /** True during the warm settle after a response. */
  isComforting: boolean;

  /** Begin listening (call when recording starts). */
  beginListening: () => void;
  /** End listening; presence will pause, then transition to responding. */
  endListening: (input?: { transcript?: string }) => void;
  /**
   * Tell presence the response is ready (text or voice). Optional — if not
   * called, presence advances on its own after a brief minimum window.
   */
  markResponseReady: () => void;
  /** Force-return to idle (e.g. user navigates away). */
  reset: () => void;
};

export function usePresence(options: UsePresenceOptions): PresenceController {
  const {
    character,
    time,
    notifyOracle = defaultNotifyOracle,
    thinkingPauseMs = THINKING_PAUSE_MS,
    comfortingHoldMs = COMFORTING_HOLD_MS,
  } = options;

  const [state, setState] = useState<PresenceState | 'idle'>('idle');

  const listenStartedAt = useRef<number | null>(null);
  const thinkingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comfortTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const responseReady  = useRef<boolean>(false);

  // Stable Oracle ref so we don't rebind the machine on every render.
  const oracleRef = useRef(notifyOracle);
  useEffect(() => { oracleRef.current = notifyOracle; }, [notifyOracle]);

  const clearTimers = useCallback(() => {
    if (thinkingTimer.current) { clearTimeout(thinkingTimer.current); thinkingTimer.current = null; }
    if (comfortTimer.current)  { clearTimeout(comfortTimer.current);  comfortTimer.current  = null; }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers]);

  const beginListening = useCallback(() => {
    clearTimers();
    responseReady.current = false;
    listenStartedAt.current = Date.now();
    setState('listening');
    oracleRef.current({ type: 'listening:start', character, time });
  }, [character, time, clearTimers]);

  const endListening = useCallback((input?: { transcript?: string }) => {
    const startedAt = listenStartedAt.current ?? Date.now();
    const durationMs = Date.now() - startedAt;
    listenStartedAt.current = null;
    oracleRef.current({ type: 'listening:end', character, time, durationMs, transcript: input?.transcript });

    setState('thinking');
    oracleRef.current({ type: 'thinking:start', character, time });

    // Schedule transition to responding after the deliberate pause.
    thinkingTimer.current = setTimeout(() => {
      setState('responding');
      oracleRef.current({ type: 'responding:start', character, time });

      // If response has already arrived during the pause, settle quickly.
      // Otherwise the screen will call markResponseReady() later.
      if (responseReady.current) {
        oracleRef.current({ type: 'responding:end', character, time });
        setState('comforting');
        oracleRef.current({ type: 'comforting:start', character, time });
        comfortTimer.current = setTimeout(() => {
          setState('idle');
          oracleRef.current({ type: 'idle', character, time });
        }, comfortingHoldMs);
      }
    }, thinkingPauseMs);
  }, [character, time, thinkingPauseMs, comfortingHoldMs]);

  const markResponseReady = useCallback(() => {
    responseReady.current = true;
    // If we're already past the thinking pause and showing the responding
    // state, fold straight into comforting.
    if (state === 'responding') {
      oracleRef.current({ type: 'responding:end', character, time });
      setState('comforting');
      oracleRef.current({ type: 'comforting:start', character, time });
      comfortTimer.current = setTimeout(() => {
        setState('idle');
        oracleRef.current({ type: 'idle', character, time });
      }, comfortingHoldMs);
    }
  }, [state, character, time, comfortingHoldMs]);

  const reset = useCallback(() => {
    clearTimers();
    responseReady.current = false;
    listenStartedAt.current = null;
    setState('idle');
    oracleRef.current({ type: 'idle', character, time });
  }, [character, time, clearTimers]);

  return useMemo<PresenceController>(() => ({
    state,
    isListening:  state === 'listening',
    isThinking:   state === 'thinking',
    isResponding: state === 'responding',
    isComforting: state === 'comforting',
    beginListening,
    endListening,
    markResponseReady,
    reset,
  }), [state, beginListening, endListening, markResponseReady, reset]);
}
