import { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { loadState, saveState } from '../utils/storage';
import { SEKRET_PROFILES, HOME_MESSAGES } from '../constants/theme';

export function useSekretState() {
  const [theme, setTheme] = useState('raylene');
  const [mood, setMood] = useState('Happy');
  const [userSide, setUserSide] = useState<'teen' | 'parent'>('teen');
  const [selectedSekret, setSelectedSekret] = useState('soft');
  const [growthPath, setGrowthPath] = useState('preferNotToSay');

  const [entries, setEntries] = useState<any[]>([]);
  const [moodHistory, setMoodHistory] = useState<any[]>([]);
  const [circlePosts, setCirclePosts] = useState<any[]>([]);

  const [journalText, setJournalText] = useState('');
  const [voiceNotes, setVoiceNotes] = useState<any[]>([]);
  const [circlePostText, setCirclePostText] = useState('');
  const [sekretMessage, setSekretMessage] = useState('');
  const [sekretReply, setSekretReply] = useState(
    'I see you. You did your best with what you had today.'
  );
  const [isSekretTyping, setIsSekretTyping] = useState(false);
  const [comfortIdx, setComfortIdx] = useState(0);
  const [homeMessageIndex, setHomeMessageIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [bridgeText, setBridgeText] = useState('');
  const [selectedTone, setSelectedTone] = useState('softStart');
  const [isLoading, setIsLoading] = useState(true);

  const breatheAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<any>(null);

  const currentSekret = SEKRET_PROFILES[selectedSekret];
  const voiceKey = selectedSekret === 'rylane' ? 'rylane' : 'raylene';
  const charName = selectedSekret === 'rylane' ? 'Rylane' : 'Raylene';

  useEffect(() => {
    (async () => {
      const state = await loadState();
      if (state.theme) setTheme(state.theme);
      if (state.mood) setMood(state.mood);
      if (state.userSide) setUserSide(state.userSide);
      if (state.selectedSekret) setSelectedSekret(state.selectedSekret);
      if (state.growthPath) setGrowthPath(state.growthPath);
      if (state.entries) setEntries(state.entries);
      if (state.moodHistory) setMoodHistory(state.moodHistory);
      if (state.circlePosts) setCirclePosts(state.circlePosts);
      if (state.voiceNotes) setVoiceNotes(state.voiceNotes);
      if (state.sekretReply) setSekretReply(state.sekretReply);
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      saveState({
        theme, mood, userSide, selectedSekret, growthPath,
        entries, moodHistory, circlePosts, voiceNotes, sekretReply,
      });
    }
  }, [
    theme, mood, userSide, selectedSekret, growthPath,
    entries, moodHistory, circlePosts, voiceNotes, sekretReply, isLoading,
  ]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.1, duration: 2200, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1,   duration: 2200, useNativeDriver: true }),
      ])
    ).start();
  }, [breatheAnim]);

  useEffect(() => {
    if (!HOME_MESSAGES?.length) return;
    const interval = setInterval(() => {
      setHomeMessageIndex((prev) => (prev + 1) % HOME_MESSAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const selectMood = (newMood: string) => {
    setMood(newMood);
    setMoodHistory((h) => [{
      id: Date.now(), mood: newMood,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    }, ...h]);
  };

  const saveEntry = () => {
    if (!journalText.trim()) return;
    setEntries((e) => [{
      id: Date.now(), text: journalText, mood,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    }, ...e]);
    setJournalText('');
  };

  const saveCirclePost = () => {
    if (!circlePostText.trim()) return;
    setCirclePosts((p) => [{
      id: Date.now(), text: circlePostText,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      reactions: { felt: 0, comfort: 0, proud: 0, stay: 0 },
    }, ...p]);
    setCirclePostText('');
  };

  const reactToPost = (id: number, type: 'felt' | 'comfort' | 'proud' | 'stay') => {
    setCirclePosts((posts) =>
      posts.map((post) =>
        post.id === id
          ? { ...post, reactions: { ...post.reactions, [type]: (post.reactions?.[type] || 0) + 1 } }
          : post
      )
    );
  };

  const getDynamicTags = () => {
    if (selectedSekret === 'rylane') return ['focused', 'mind heavy', 'protecting my peace', 'trying harder', 'locked in', 'building myself'];
    if (selectedSekret === 'soft')   return ['soft but strong', 'healing', 'trying my best', 'late night thoughts', 'emotional', 'peaceful'];
    if (selectedSekret === 'cloud')  return ['resting', 'breathing', 'quiet', 'healing', 'calm', 'soft day'];
    return ['good vibes', 'overthinking', 'protecting my peace', 'growing', 'learning myself', 'late night thoughts'];
  };

  const startRecording = () => {
    setIsRecording(true);
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
    setVoiceNotes((notes) => [{
      id: Date.now(), title: 'Voice Bip',
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      duration: '~30s',
    }, ...notes]);
  };

  return {
    theme, setTheme, mood, setMood, userSide, setUserSide,
    selectedSekret, setSelectedSekret, growthPath, setGrowthPath,
    entries, setEntries, moodHistory, setMoodHistory,
    circlePosts, setCirclePosts, journalText, setJournalText,
    voiceNotes, setVoiceNotes, circlePostText, setCirclePostText,
    sekretMessage, setSekretMessage, sekretReply, setSekretReply,
    isSekretTyping, setIsSekretTyping, comfortIdx, setComfortIdx,
    homeMessageIndex, setHomeMessageIndex, isRecording, setIsRecording,
    bridgeText, setBridgeText, selectedTone, setSelectedTone,
    breatheAnim, pulseAnim, pulseLoop,
    currentSekret, voiceKey, charName,
    selectMood, saveEntry, saveCirclePost, reactToPost,
    getDynamicTags, startRecording, stopRecording, isLoading,
  };
}
