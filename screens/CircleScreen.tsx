import React, { useRef, useEffect, useState, useMemo } from 'react';
import { IMAGES, getRoomBg } from '../constants/theme';
import {
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  View,
  Animated,
  Image,
  ImageBackground,
  Modal,
  StyleSheet,
  Platform,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const CLOUD_HAPPY = IMAGES.cloudHappy;

type MediaType = 'text' | 'struggle' | 'relatable' | 'growth';
type SafetyLevel = 'none' | 'soft' | 'bridge' | 'parent';

type ScanResult = {
  level: SafetyLevel;
  reason?: string;
  suggestion?: string;
};

type CirclePost = {
  id: string | number;
  text: string;
  date?: string;
  time?: string;
  bipType?: string;
  mediaUri?: string;
  mediaKind?: string;
  postMood?: string;
  circleTag?: string;
  reactions?: {
    felt?: number;
    comfort?: number;
    proud?: number;
    stay?: number;
    sameHere?: number;
  };
  quietRepliesCount?: number;
  anonymousName?: string;
};

type CircleScreenProps = {
  t: Record<string, any>;
  circlePosts: CirclePost[];
  circlePostText: string;
  setCirclePostText: (text: string) => void;
  saveCirclePost: (extra?: { text?: string; mediaKind?: string; circleTag?: string; postMood?: string }) => void;
  reactToPost: (id: string | number, type: string) => void;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
  sendQuietReply?: (postId: string, replyText: string) => void;
  selectedSekret?: 'raylene' | 'rylane' | string;
  mood?: string;
};

const MEDIA_TYPES: { id: MediaType; emoji: string; label: string; sub: string }[] = [
  { id: 'text',     emoji: '💭', label: 'Need to say it',  sub: 'put the heavy part down'          },
  { id: 'struggle', emoji: '🫂', label: 'Anybody else?',   sub: 'find the people who get it'       },
  { id: 'relatable',emoji: '👀', label: 'Real-life Bip',   sub: 'the part nobody says out loud'    },
  { id: 'growth',   emoji: '⭐', label: 'Small win',       sub: 'something shifted, even a little' },
];

const POST_TAGS = [
  'needed to say it',
  'small win',
  'anybody else?',
  'just processing',
  'grateful moment',
  'rough day',
];

const POST_MOODS = [
  { emoji: '😮‍💨', label: 'carrying something' },
  { emoji: '🌱',   label: 'growing'           },
  { emoji: '😭',   label: 'rough one'         },
  { emoji: '✨',   label: 'small win'         },
  { emoji: '😐',   label: 'just existing'     },
  { emoji: '🔥',   label: 'moving through'   },
];

const TEEN_REACTIONS = [
  { emoji: '💜', key: 'felt',     label: 'felt that'     },
  { emoji: '☁️', key: 'comfort',  label: 'stay up'       },
  { emoji: '🌟', key: 'proud',    label: 'proud of you'  },
  { emoji: '🌙', key: 'stay',     label: 'sending calm'  },
  { emoji: '🤝', key: 'sameHere', label: 'same here'     },
];

const SEED_POSTS: CirclePost[] = [
  {
    id: 'seed-1',
    text: "nobody asked if i was okay today. i was kind of not. but i smiled the whole time and now i'm tired in a different way.",
    bipType: 'text',
    circleTag: 'needed to say it',
    date: 'a few hours ago',
    reactions: { felt: 41, comfort: 22, proud: 0, stay: 17, sameHere: 29 },
    quietRepliesCount: 8,
  },
  {
    id: 'seed-2',
    text: "finished it at 2am. cried a little. submitted anyway. that's the whole story.",
    bipType: 'growth',
    circleTag: 'small win',
    date: 'yesterday',
    reactions: { felt: 29, comfort: 6, proud: 38, stay: 4, sameHere: 11 },
    quietRepliesCount: 11,
  },
  {
    id: 'seed-3',
    text: "anxiety was loud this morning. like really loud. i got up anyway. that's my win today and i'm not minimizing it.",
    bipType: 'text',
    circleTag: 'small win',
    date: 'yesterday',
    reactions: { felt: 53, comfort: 31, proud: 19, stay: 24, sameHere: 47 },
    quietRepliesCount: 9,
  },
  {
    id: 'seed-4',
    text: "i apologized to someone i hurt and they didn't accept it. i'm trying to let that be okay.",
    bipType: 'text',
    circleTag: 'just processing',
    date: '2 days ago',
    reactions: { felt: 44, comfort: 38, proud: 7, stay: 21, sameHere: 33 },
    quietRepliesCount: 14,
  },
  {
    id: 'seed-5',
    text: "i said no to something i didn't want to do and i didn't apologize for it. first time in a long time.",
    bipType: 'growth',
    circleTag: 'small win',
    date: '3 days ago',
    reactions: { felt: 18, comfort: 9, proud: 62, stay: 3, sameHere: 15 },
    quietRepliesCount: 6,
  },
  {
    id: 'seed-6',
    text: "sometimes i'm scared that being honest about how i feel will make people leave. so i stay quiet. and then i'm still alone anyway.",
    bipType: 'text',
    circleTag: 'anybody else?',
    date: '4 days ago',
    reactions: { felt: 78, comfort: 51, proud: 0, stay: 34, sameHere: 66 },
    quietRepliesCount: 19,
  },
];

const QUOTE_REPLIES_RAYLENE = [
  "I felt this too.",
  "You are not alone in this.",
  "That sounds heavy \u{1F49C}",
  "I'm glad you said it.",
  "Staying with you.",
  "No fixing, just here.",
  "Proud of you for saying it.",
  "This made sense to me.",
];

const QUOTE_REPLIES_RYLANE = [
  "felt that. fr.",
  "you're not alone bro.",
  "heavy day. respect for posting.",
  "glad you said it out loud.",
  "right here. not going anywhere.",
  "no advice. just with you.",
  "that took guts.",
  "this hit. for real.",
];

const COMMUNITY_BIPS: CirclePost[] = [
  {
    id: 'community-1',
    anonymousName: 'anonymous bip · 17',
    circleTag: 'needed to say it',
    text: "I keep telling everybody I'm just tired, but honestly I think I'm sad. I don't need advice. I just didn't want to hold it by myself tonight.",
    reactions: { felt: 34, comfort: 58, proud: 21, stay: 46, sameHere: 52 },
    quietRepliesCount: 12,
  },
  {
    id: 'community-2',
    anonymousName: 'anonymous bip · 15',
    circleTag: 'small win',
    text: "I finally told my friend that joke actually hurt me. My voice was shaking bad 😭 but I said it.",
    reactions: { felt: 19, comfort: 17, proud: 63, stay: 14, sameHere: 22 },
    quietRepliesCount: 8,
  },
  {
    id: 'community-3',
    anonymousName: 'anonymous bip · 16',
    circleTag: 'anybody else?',
    text: "Does anybody else get quiet when they're mad because they're scared they'll say too much?",
    reactions: { felt: 71, comfort: 24, proud: 8, stay: 31, sameHere: 84 },
    quietRepliesCount: 19,
  },
];

const STICKERS = ['☁️', '💜', '🌿', '✨', '🌙', '🫶', '⭐', '🌸', '🤍', '🕊️'];

const LIGHT_WORDS = ['tired', 'overwhelmed', 'stressed', 'ugh', 'annoyed', 'frustrated', 'embarrassed'];
const MEDIUM_WORDS = ['alone', 'sad', 'hurt', 'crying', 'scared', 'anxious', 'panic', 'bullied', 'ignored'];
const HEAVY_WORDS = [
  'done', 'empty', 'worthless', 'nobody', 'disappear',
  'cant anymore', "can't anymore", 'kill myself', 'self harm', 'hurt myself', 'weapon', 'gun',
];
const PII_WORDS = ['address', 'school', 'phone number', 'license plate', 'id card', 'student id', 'snapcode', 'email'];

const getSafetyLevel = (text: string): ScanResult => {
  const lower = text.toLowerCase();
  if (HEAVY_WORDS.some(w => lower.includes(w))) return { level: 'parent', reason: 'This one looks serious.', suggestion: "Let's pull in a trusted grown-up through Bridge." };
  if (PII_WORDS.some(w => lower.includes(w))) return { level: 'bridge', reason: 'This may include personal info.', suggestion: 'Try cropping or blurring before you post.' };
  if (MEDIUM_WORDS.some(w => lower.includes(w))) return { level: 'bridge', reason: 'This feels heavy.', suggestion: 'You can share a softer version through Bridge.' };
  if (LIGHT_WORDS.some(w => lower.includes(w))) return { level: 'soft', reason: 'This feels like a rough moment.', suggestion: 'Circle can hold this gently.' };
  return { level: 'none' };
};

const moodGlow = (mood?: string): string => {
  const m = (mood || '').toLowerCase();
  if (m === 'happy') return '#f0a6d2';
  if (m === 'sad' || m === 'anxious') return '#7dd3fc';
  if (m === 'angry' || m === 'overwhelmed' || m === 'stressed') return '#f472b6';
  if (m === 'tired') return '#6d28d9';
  if (m === 'calm') return '#c4b5fd';
  return '#c4b5fd';
};

const postSticker = (id: string | number): string => STICKERS[Math.abs(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % STICKERS.length];

export function CircleScreen({
  t,
  circlePosts,
  circlePostText,
  setCirclePostText,
  saveCirclePost,
  reactToPost,
  setScreen,
  BottomNav,
  sendQuietReply,
  selectedSekret,
  mood,
}: CircleScreenProps) {
  const isRylane = selectedSekret === 'rylane';
  const charLabel = isRylane ? 'rylane' : 'raylene';
  const character: 'raylene' | 'rylane' = isRylane ? 'rylane' : 'raylene';
  const hour = new Date().getHours();
  const timeOfDay = hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 17 ? 'day' : hour >= 17 && hour < 21 ? 'evening' : 'night';
  const bg = getRoomBg(character, timeOfDay as any);
  const glow = useMemo(() => moodGlow(mood), [mood]);

  const QUOTE_REPLIES = isRylane ? QUOTE_REPLIES_RYLANE : QUOTE_REPLIES_RAYLENE;
  const visiblePosts = circlePosts.length ? circlePosts : COMMUNITY_BIPS;

  const [selectedType, setSelectedType]           = useState<MediaType>('text');
  const [showTypeMenu, setShowTypeMenu]           = useState(false);
  const [selectedPostMood, setSelectedPostMood]   = useState<string>('');
  const [selectedTag, setSelectedTag]             = useState<string>('');
  const [showTagPicker, setShowTagPicker]         = useState(false);
  const [scanResult, setScanResult]               = useState<ScanResult | null>(null);
  const [isSubmitting, setIsSubmitting]           = useState(false);
  const [showSoftCheckIn, setShowSoftCheckIn]     = useState(false);
  const [showBridgeSuggestion, setShowBridgeSuggestion] = useState(false);
  const [showParentPrompt, setShowParentPrompt]   = useState(false);
  const [activeReplySheetPostId, setActiveReplySheetPostId] = useState<string | null>(null);
  const [selectedQuietReply, setSelectedQuietReply]         = useState<string>('');

  const currentType = useMemo(() => MEDIA_TYPES.find(item => item.id === selectedType) || MEDIA_TYPES[0], [selectedType]);

  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fade3 = useRef(new Animated.Value(0)).current;
  const fade4 = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stagger = (val: Animated.Value, delay: number) =>
      Animated.timing(val, { toValue: 1, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });

    Animated.parallel([stagger(fade1, 0), stagger(fade2, 140), stagger(fade3, 280), stagger(fade4, 420)]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [fade1, fade2, fade3, fade4, breath]);

  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });
  const cardStyle = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  });

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS === 'web') return;
    try { await Haptics.impactAsync(style); } catch { void 0; }
  };

  const runSafetyScan = (text: string): ScanResult => getSafetyLevel(text);

  const handleTypeChange = async (type: MediaType) => {
    setSelectedType(type);
    setShowTypeMenu(false);
    await triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSavePost = async () => {
    setIsSubmitting(true);
    const scan = runSafetyScan(circlePostText);
    setScanResult(scan);

    if (scan.level === 'parent') {
      setShowParentPrompt(true);
      setShowBridgeSuggestion(false);
      setShowSoftCheckIn(false);
      setIsSubmitting(false);
      await triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    }

    if (scan.level === 'bridge') {
      setShowBridgeSuggestion(true);
      setShowSoftCheckIn(false);
      setShowParentPrompt(false);
      setIsSubmitting(false);
      await triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    if (scan.level === 'soft') {
      setShowSoftCheckIn(true);
      setShowBridgeSuggestion(false);
      setShowParentPrompt(false);
    }

    saveCirclePost({
      text:      circlePostText,
      mediaKind: selectedType,
      circleTag: selectedTag || undefined,
      postMood:  selectedPostMood || undefined,
    });

    setCirclePostText('');
    setSelectedTag('');
    setSelectedPostMood('');
    setIsSubmitting(false);
    await triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleBridgeShare  = async () => { await triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); setScreen('bridge'); };
  const handleParentPrompt = async () => { await triggerHaptic(Haptics.ImpactFeedbackStyle.Medium); setScreen('parentBridge'); };

  const headerTagline = isRylane
    ? 'pull up a chair. nobody has to perform in here.'
    : 'pull up a chair. somebody in here gets it.';
  const energyText    = isRylane ? '⚡ support circle open' : '💜 support circle open';
  const cultureLines  = isRylane
    ? [
        'this is not the internet. nobody\'s getting exposed here.',
        'no clout. no ratio. no drama.',
        'just real ones, saying real things, held in real care.',
        'what gets posted in the circle stays in the circle.',
      ]
    : [
        'this is not a social media feed. it\'s a support circle.',
        'no bullying. no exposing. no going viral.',
        'your bips are held gently here, always.',
        'every person in this circle is going through something real.',
      ];
  const composerHint = isRylane ? 'say it plain. no filter.' : 'say it how it feels, gently.';

  return (
    <ImageBackground source={bg} style={styles.bgImage} resizeMode="cover">
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.88)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: glow + '10' }]} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Animated.View style={cardStyle(fade1)}>
          <Text style={styles.logo}>Bip Circle 🌐</Text>
          <Text style={styles.subtitle}>{headerTagline}</Text>

          <Animated.View
            style={[
              styles.energyBadge,
              { borderColor: glow, shadowColor: glow, shadowOpacity: 0.6, shadowRadius: 12 },
              { transform: [{ scale: breathScale }], opacity: breathOpacity },
            ]}
          >
            <Text style={[styles.energyText, { color: glow }]}>{energyText}</Text>
          </Animated.View>

          <View style={styles.circleFloor}>
            {[
              { label: 'here',     position: styles.seatTopLeft },
              { label: 'listening',position: styles.seatTopRight },
              { label: 'felt that',position: styles.seatBottomLeft },
              { label: 'staying',  position: styles.seatBottomRight },
            ].map(seat => (
              <View key={seat.label} style={[styles.circleSeat, seat.position]}>
                <View style={[styles.seatGlow, { backgroundColor: glow }]} />
                <Text style={styles.seatLabel}>{seat.label}</Text>
              </View>
            ))}
            <View style={[styles.circleCenter, { borderColor: glow }]}>
              <Image source={CLOUD_HAPPY} style={styles.circleCloud} resizeMode="contain" />
              <Text style={styles.circleCenterText}>you are not the only one</Text>
            </View>
          </View>

          <View style={styles.cloudWrap}>
            <View style={[styles.presencePill, { borderColor: glow }]}>
              <Text style={[styles.presenceText, { color: '#f5f0ff' }]}>
                {charLabel} pulled up too · no fixing, just here
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Intro card + type picker ───────────────────────────────────── */}
        <Animated.View style={cardStyle(fade2)}>
          <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.90)', borderColor: glow, shadowColor: glow }]}>
            <Text style={styles.cardEmoji}>🪑</Text>
            <Text style={styles.cardText}>this is a circle, not a feed.</Text>
            <Text style={styles.entryText}>
              say the part you keep skipping. leave encouragement. let somebody else's Bip remind you you're not weird or alone.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.typeSelector, { borderColor: glow, backgroundColor: 'rgba(20,12,40,0.7)' }]}
            onPress={() => setShowTypeMenu(s => !s)}
          >
            <Text style={styles.typeSelectorText}>
              {currentType.emoji} {currentType.label}
            </Text>
            <Text style={[styles.typeSelectorSub, { color: '#cbb6f7' }]}>
              {currentType.sub} {showTypeMenu ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showTypeMenu && (
            <View style={[styles.typeMenu, { backgroundColor: 'rgba(20,12,40,0.92)', borderColor: glow }]}>
              {MEDIA_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[styles.typeOption, selectedType === type.id && { backgroundColor: 'rgba(168,85,247,0.18)' }]}
                  onPress={() => handleTypeChange(type.id)}
                >
                  <Text style={styles.typeEmoji}>{type.emoji}</Text>
                  <View>
                    <Text style={styles.typeLabel}>{type.label}</Text>
                    <Text style={styles.typeSub}>{type.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>

        {/* ── Composer ───────────────────────────────────────────────────── */}
        <Animated.View style={cardStyle(fade3)}>
          <View style={[styles.composerCard, { backgroundColor: 'rgba(30,18,55,0.82)', borderColor: glow, shadowColor: glow }]}>

            {/* Mood before posting */}
            <Text style={[styles.composerLabel, { color: '#cbb6f7' }]}>how are you walking in?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodRow}>
              {POST_MOODS.map(m => (
                <TouchableOpacity
                  key={m.label}
                  onPress={() => setSelectedPostMood(selectedPostMood === m.label ? '' : m.label)}
                  style={[
                    styles.moodPill,
                    { borderColor: selectedPostMood === m.label ? glow : '#5b4a8a' },
                    selectedPostMood === m.label && { backgroundColor: glow + '28' },
                  ]}
                >
                  <Text style={styles.moodPillEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodPillLabel, { color: selectedPostMood === m.label ? glow : '#c4b5fd' }]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Tag picker */}
            <TouchableOpacity
              onPress={() => setShowTagPicker(s => !s)}
              style={[styles.tagToggle, { borderColor: selectedTag ? glow : '#5b4a8a' }]}
            >
              <Text style={[styles.tagToggleText, { color: selectedTag ? glow : '#9980c4' }]}>
                {selectedTag ? `✦ ${selectedTag}` : '+ add a tag (optional)'}
              </Text>
            </TouchableOpacity>

            {showTagPicker && (
              <View style={styles.tagGrid}>
                {POST_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => { setSelectedTag(selectedTag === tag ? '' : tag); setShowTagPicker(false); }}
                    style={[styles.tagChip, selectedTag === tag && { backgroundColor: glow + '30', borderColor: glow }]}
                  >
                    <Text style={[styles.tagChipText, selectedTag === tag && { color: glow }]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.composerPrompt, { color: '#cbb6f7', marginTop: 12 }]}>
              {currentType.emoji} drop a {currentType.label}…
            </Text>
            <TextInput
              style={[styles.input, { borderColor: glow + '66' }]}
              placeholder={composerHint}
              placeholderTextColor="#7c6b98"
              multiline
              value={circlePostText}
              onChangeText={text => {
                setCirclePostText(text);
                const scan = runSafetyScan(text);
                setScanResult(scan);
                setShowSoftCheckIn(scan.level === 'soft');
                setShowBridgeSuggestion(scan.level === 'bridge');
                setShowParentPrompt(scan.level === 'parent');
              }}
            />

            <TouchableOpacity
              style={[styles.postBtn, { backgroundColor: glow }]}
              onPress={handleSavePost}
              disabled={isSubmitting}
            >
              <Text style={styles.postBtnText}>
                {isSubmitting ? 'posting…' : '+ post anonymous bip'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.safeText}>
              no name attached · support only · you can leave anytime
            </Text>
          </View>

          <View style={styles.stickyNote}>
            <Text style={styles.stickyText}>
              {isRylane
                ? '"no count. no clout. just keep it real."'
                : '"it\'s safe here. say it gentle, say it true."'}
            </Text>
          </View>

          {showSoftCheckIn && (
            <View style={[styles.softCard, { borderColor: glow }]}>
              <Text style={styles.softTitle}>hold up 💜</Text>
              <Text style={styles.softText}>
                {isRylane
                  ? 'this one feels rough. circle\'s got you.'
                  : 'this one feels a little tender. circle can hold it gently.'}
              </Text>
            </View>
          )}

          {showBridgeSuggestion && (
            <View style={[styles.bridgeCard, { borderColor: glow }]}>
              <Text style={styles.bridgeTitle}>this might land easier through bridge.</Text>
              <Text style={styles.bridgeText}>
                share a softer version with someone you trust. you stay in control of what they see.
              </Text>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: glow + '40' }]} onPress={handleBridgeShare}>
                <Text style={styles.smallBtnText}>open bridge</Text>
              </TouchableOpacity>
            </View>
          )}

          {showParentPrompt && (
            <View style={[styles.parentCard, { borderColor: glow }]}>
              <Text style={styles.parentTitle}>we wanna keep you safe.</Text>
              <Text style={styles.parentText}>
                this one might need a trusted grown-up. you choose what gets shared.
              </Text>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: glow + '40' }]} onPress={handleParentPrompt}>
                <Text style={styles.smallBtnText}>open parent window</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* ── Posts ──────────────────────────────────────────────────────── */}
        <Animated.View style={cardStyle(fade4)}>
          <View style={[styles.sectionCard, { borderColor: glow, backgroundColor: 'rgba(20,12,40,0.7)' }]}>
            <Text style={styles.sectionTitle}>circle bips</Text>

            {circlePosts.length === 0 && (
              <>
                <Text style={styles.emptyText}>
                  {isRylane ? "circle's quiet. drop something real." : 'circle is quiet right now. you can be the first.'}
                </Text>
                <Text style={styles.seedLabel}>what circle sounds like</Text>
                {SEED_POSTS.map(post => (
                  <View key={post.id} style={[styles.postCard, { borderColor: '#c4b5fd55' }]}>
                    <Text style={styles.postSticker}>{postSticker(post.id)}</Text>
                    <Text style={[styles.postBipType, { color: '#c4b5fd' }]}>
                      {MEDIA_TYPES.find(m => m.id === post.bipType)?.emoji ?? '💜'}{' '}
                      {MEDIA_TYPES.find(m => m.id === post.bipType)?.label ?? 'Bip'}
                    </Text>
                    {!!post.circleTag && (
                      <View style={[styles.tagBadge, { backgroundColor: '#c4b5fd22', borderColor: '#c4b5fd55' }]}>
                        <Text style={[styles.tagBadgeText, { color: '#c4b5fd' }]}>{post.circleTag}</Text>
                      </View>
                    )}
                    <Text style={styles.postText}>{post.text}</Text>
                    <Text style={styles.postDate}>{post.date}</Text>
                    <View style={styles.reactionRow}>
                      {TEEN_REACTIONS.map(r => (
                        <Text key={r.key} style={styles.reactionBtn}>
                          {r.emoji} {(post.reactions as any)?.[r.key] || 0}
                        </Text>
                      ))}
                    </View>
                  </View>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>what the circle is holding</Text>
            <View style={styles.circlePromise}>
              <Text style={styles.circlePromiseText}>You don't have to know them to not feel alone.</Text>
              <Text style={styles.circlePromiseSub}>anonymous · supported · never ranked</Text>
            </View>

            {visiblePosts.map(post => (
              <View key={post.id} style={[styles.postCard, { borderColor: glow + '88' }]}>
                <Text style={styles.postSticker}>{postSticker(post.id)}</Text>
                <View style={styles.postMetaRow}>
                  <View style={[styles.anonymousDot, { backgroundColor: glow }]} />
                  <Text style={styles.anonymousName}>{post.anonymousName || 'anonymous bip'}</Text>
                  {!!post.postMood && <Text style={styles.postMoodBadge}>{post.postMood}</Text>}
                </View>
                {!!post.circleTag && (
                  <View style={[styles.tagBadge, { backgroundColor: glow + '18', borderColor: glow + '55' }]}>
                    <Text style={[styles.tagBadgeText, { color: glow }]}>{post.circleTag}</Text>
                  </View>
                )}
                <Text style={styles.postText}>{post.text}</Text>
                {!!post.date && <Text style={styles.postDate}>{post.date}</Text>}
                <View style={styles.reactionRow}>
                  {TEEN_REACTIONS.map(r => (
                    <TouchableOpacity
                      key={r.key}
                      onPress={() => {
                        if (!String(post.id).startsWith('community-')) reactToPost(post.id, r.key);
                      }}
                      style={styles.reactionBtn}
                    >
                      <Text style={styles.reactionText}>{r.emoji} {(post.reactions as any)?.[r.key] || 0}</Text>
                      <Text style={styles.reactionLabel}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.replyBtn, { backgroundColor: glow + '24' }]}
                  onPress={() => setActiveReplySheetPostId(String(post.id))}
                >
                  <Text style={styles.replyBtnText}>
                    reply softly{post.quietRepliesCount ? ` · ${post.quietRepliesCount} quiet replies sent` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          <View style={[styles.cultureCard, { borderColor: glow, backgroundColor: 'rgba(30,18,55,0.90)' }]}>
            <Text style={styles.cultureTitle}>circle culture 💜</Text>
            {cultureLines.map((line, i) => (
              <Text key={i} style={styles.cultureText}>{line}</Text>
            ))}
          </View>
        </Animated.View>

        {/* ── Quiet reply modal ─────────────────────────────────────────── */}
        <Modal
          visible={!!activeReplySheetPostId}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveReplySheetPostId(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: 'rgba(20,12,40,0.96)', borderColor: glow }]}>
              <Text style={styles.modalTitle}>reply softly</Text>
              <Text style={styles.modalSub}>pick one. anonymous. no thread. no drama.</Text>
              {QUOTE_REPLIES.map(reply => (
                <TouchableOpacity
                  key={reply}
                  style={[styles.replyOption, selectedQuietReply === reply && { backgroundColor: glow + '30' }]}
                  onPress={() => setSelectedQuietReply(reply)}
                >
                  <Text style={styles.replyOptionText}>{reply}</Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={[styles.replyInput, { borderColor: glow + '66' }]}
                placeholder={isRylane ? 'or one short note. keep it real.' : 'or one short custom note…'}
                placeholderTextColor="#7c6b98"
                value={selectedQuietReply}
                onChangeText={setSelectedQuietReply}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: glow }]}
                onPress={() => {
                  if (activeReplySheetPostId && selectedQuietReply.trim()) {
                    sendQuietReply?.(activeReplySheetPostId, selectedQuietReply.trim());
                  }
                  setSelectedQuietReply('');
                  setActiveReplySheetPostId(null);
                }}
              >
                <Text style={styles.sendBtnText}>send quietly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setSelectedQuietReply(''); setActiveReplySheetPostId(null); }}
              >
                <Text style={styles.cancelBtnText}>nevermind</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {BottomNav}
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgImage:    { flex: 1 },
  container:  {
    flexGrow: 1, padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}),
  },
  logo:     { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 6, letterSpacing: 0.3 },
  subtitle: { fontSize: 14, color: '#cbb6f7', textAlign: 'center', marginBottom: 12, fontStyle: 'italic' },

  energyBadge: { alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 14 },
  energyText:  { fontSize: 13, fontWeight: '600' },

  circleFloor:    { minHeight: 218, marginHorizontal: 2, marginBottom: 15, position: 'relative', alignItems: 'center', justifyContent: 'center' },
  circleSeat:     { position: 'absolute', alignItems: 'center', width: 74 },
  seatTopLeft:    { left: 2, top: 28 },
  seatTopRight:   { right: 2, top: 28 },
  seatBottomLeft: { left: 2, bottom: 18 },
  seatBottomRight:{ right: 2, bottom: 18 },
  seatGlow:       { width: 42, height: 42, borderRadius: 21, opacity: 0.24, borderWidth: 8, borderColor: 'rgba(255,255,255,0.22)' },
  seatLabel:      { color: '#d9cce9', fontSize: 9, fontWeight: '800', marginTop: 5, letterSpacing: 0.4 },
  circleCenter:   { width: 178, height: 178, borderRadius: 89, borderWidth: 1, backgroundColor: 'rgba(27,15,49,0.76)', alignItems: 'center', justifyContent: 'center', shadowColor: '#c4b5fd', shadowOpacity: 0.35, shadowRadius: 20 },
  circleCloud:    { width: 92, height: 76 },
  circleCenterText: { color: '#fff', fontSize: 12, fontWeight: '800', textAlign: 'center', maxWidth: 130, lineHeight: 17 },

  cloudWrap:   { alignItems: 'center', marginBottom: 14 },
  presencePill:{ borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(20,12,40,0.6)' },
  presenceText:{ fontSize: 12, fontWeight: '600' },

  card:      { padding: 16, borderRadius: 20, marginBottom: 10, borderWidth: 1, shadowOpacity: 0.45, shadowRadius: 14 },
  cardEmoji: { fontSize: 30, marginBottom: 6 },
  cardText:  { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 8 },
  entryText: { color: '#e9defc', fontSize: 14, lineHeight: 21 },

  typeSelector:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8 },
  typeSelectorText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  typeSelectorSub: { fontSize: 12 },
  typeMenu:        { borderWidth: 1, borderRadius: 16, marginBottom: 12, overflow: 'hidden' },
  typeOption:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  typeEmoji:       { fontSize: 22 },
  typeLabel:       { color: '#fff', fontSize: 14, fontWeight: '600' },
  typeSub:         { color: '#94A3B8', fontSize: 12 },

  composerCard:   { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 12, shadowOpacity: 0.4, shadowRadius: 14 },
  composerLabel:  { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  composerPrompt: { fontSize: 13, fontWeight: '600', marginBottom: 10 },

  moodRow:      { marginBottom: 10 },
  moodPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8, backgroundColor: 'rgba(0,0,0,0.25)' },
  moodPillEmoji:{ fontSize: 15 },
  moodPillLabel:{ fontSize: 11, fontWeight: '600' },

  tagToggle:     { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  tagToggleText: { fontSize: 12, fontWeight: '600' },
  tagGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tagChip:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#5b4a8a', backgroundColor: 'rgba(91,74,138,0.15)' },
  tagChipText:   { color: '#c4b5fd', fontSize: 12, fontWeight: '600' },

  tagBadge:     { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
  tagBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  input:      { color: '#fff', padding: 14, borderRadius: 14, minHeight: 110, textAlignVertical: 'top', marginBottom: 14, backgroundColor: 'rgba(0,0,0,0.35)', fontSize: 14, lineHeight: 22, borderWidth: 1 },
  postBtn:    { padding: 16, borderRadius: 18, marginBottom: 8, alignItems: 'center' },
  postBtnText:{ color: '#fff', fontSize: 16, fontWeight: 'bold' },
  safeText:   { color: '#94A3B8', fontSize: 11, textAlign: 'center', marginTop: 4 },

  stickyNote:{ backgroundColor: '#fff8e7', borderColor: '#7c3aed', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 10, marginBottom: 12, transform: [{ rotate: '-2deg' }] },
  stickyText:{ color: '#3a2461', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },

  softCard:  { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12, backgroundColor: 'rgba(124,58,237,0.16)' },
  softTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  softText:  { color: '#e9defc', fontSize: 13, lineHeight: 19 },

  bridgeCard:  { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12, backgroundColor: 'rgba(124,58,237,0.16)' },
  bridgeTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  bridgeText:  { color: '#e9defc', fontSize: 13, lineHeight: 19, marginBottom: 10 },

  parentCard:  { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12, backgroundColor: 'rgba(124,58,237,0.16)' },
  parentTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 6 },
  parentText:  { color: '#e9defc', fontSize: 13, lineHeight: 19, marginBottom: 10 },

  smallBtn:    { padding: 10, borderRadius: 12, alignItems: 'center' },
  smallBtnText:{ color: '#fff', fontWeight: '600', fontSize: 13 },

  sectionCard:       { borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 6, marginBottom: 14 },
  sectionTitle:      { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  emptyText:         { color: '#cbb6f7', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 18 },
  seedLabel:         { color: '#c4b5fd', fontSize: 11, fontWeight: '700', textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10, marginTop: 4, opacity: 0.7 },
  circlePromise:     { padding: 13, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.055)', marginBottom: 12 },
  circlePromiseText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  circlePromiseSub:  { color: '#bcaed2', fontSize: 10, letterSpacing: 0.5, marginTop: 3 },

  postCard:      { borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 10, backgroundColor: 'rgba(20,12,40,0.82)' },
  postSticker:   { fontSize: 18, position: 'absolute', top: 12, right: 14 },
  postMetaRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  anonymousDot:  { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  anonymousName: { color: '#e8def7', fontSize: 11, fontWeight: '800', flex: 1 },
  postMoodBadge: { fontSize: 10, color: '#a89dc4', fontStyle: 'italic' },
  postBipType:   { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  postDate:      { color: '#8877a9', fontSize: 11, marginTop: 4, marginBottom: 6 },
  postText:      { color: '#fff', fontSize: 15, lineHeight: 22, marginBottom: 8 },
  postMedia:     { color: '#cbb6f7', fontSize: 12, marginBottom: 10 },

  reactionRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  reactionBtn:   { backgroundColor: 'rgba(30,18,55,0.85)', padding: 8, borderRadius: 14, alignItems: 'center', minWidth: '18%', flex: 1 },
  reactionText:  { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  reactionLabel: { color: '#cbb6f7', fontSize: 9, marginTop: 2 },

  replyBtn:     { marginTop: 10, padding: 12, borderRadius: 14 },
  replyBtnText: { color: '#f5f0ff', fontWeight: '700', fontSize: 13, textAlign: 'center' },

  cultureCard:  { borderWidth: 1, borderRadius: 20, padding: 18, marginTop: 4, marginBottom: 24 },
  cultureTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  cultureText:  { color: '#e9defc', fontSize: 13, marginBottom: 4, lineHeight: 19 },

  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard:      { borderWidth: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '85%' },
  modalTitle:     { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSub:       { color: '#cbb6f7', fontSize: 12, marginBottom: 12 },
  replyOption:    { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 8 },
  replyOptionText:{ color: '#fff', fontSize: 14, fontWeight: '600' },
  replyInput:     { color: '#fff', padding: 12, borderRadius: 12, minHeight: 44, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1 },
  sendBtn:        { marginTop: 12, padding: 14, borderRadius: 16, alignItems: 'center' },
  sendBtnText:    { color: '#fff', fontWeight: '800' },
  cancelBtn:      { marginTop: 8, padding: 10, alignItems: 'center' },
  cancelBtnText:  { color: '#cbb6f7', fontSize: 13 },
});
