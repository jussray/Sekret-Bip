// src/parent/features/sekret/ParentSekretCoachScreen.tsx
//
// Se'kret Coach — the parent's AI coaching companion.
// Live AI chat at the top (parent talks to Se'kret Coach directly).
// Static coaching guides, conversation starters, and calm shortcut below.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Platform, Image, KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { IMAGES } from '@constants/theme';
import { sendMessage, makeUserMessage, makeAssistantMessage } from '@/parent/services';
import type { ChatMessage } from '@/parent/services';

const TOP = Platform.OS === 'ios' ? 56 : 36;

// ── Daily wisdom ─────────────────────────────────────────────────────────────
const WISDOM = [
  "teenagers aren't pushing you away. they're testing whether you'll stay.",
  "the more they pull away, the more they need to know you're still there.",
  "your presence is the message. the words matter less than you think.",
  "a repaired relationship teaches more than a perfect one.",
  "your teen doesn't need you to have answers. they need you to ask questions.",
  "what looks like defiance is often fear wearing a tough jacket.",
  "the goal shifts. from 'raise a good kid' to 'build a good relationship.'",
  "they will remember how you made them feel, long after they forget what you said.",
  "connection before correction. every time.",
  "you're not parenting your teen. you're parenting the adult they're becoming.",
  "an apology from a parent is not weakness. it's modeling.",
  "the door you leave open is the one they'll walk through when it matters most.",
  "your teen is not the problem. they're going through one.",
  "you don't need a perfect response. you need a present one.",
  "eye contact. full attention. two minutes. more powerful than you think.",
  "curiosity is not the same as interrogation. tone carries the whole message.",
  "their storms are real to them. even the ones that seem small to you.",
  "what they say isn't always what they mean. what they need isn't always what they ask for.",
  "silence isn't always withdrawal. sometimes it's processing.",
  "you can hold a boundary and still be warm. they're not opposites.",
  "being consistent is a love language for teenagers.",
  "the best time to build the relationship is before there's a crisis.",
  "if your teen trusts you with the small things, they'll come to you with the big ones.",
  "exhaustion is part of this. that doesn't mean you're failing.",
  "repair is not optional. it's the whole job.",
  "their identity is still being written. your words are part of that draft.",
  "they need to see you manage hard things without falling apart.",
  "the goal of this season is not to win arguments. it's to stay in relationship.",
  "every teenager is two people: the one you see, and the one they're becoming.",
  "showing up imperfectly is still showing up.",
];

const MOOD_WISDOM: Record<string, string[]> = {
  heavy: [
    "heavy is real. you don't have to perform okay right now.",
    "heavy days don't mean you're losing. they mean you're carrying real things.",
    "put the weight down for five minutes. it'll still be there — but so will you.",
    "exhaustion is part of this. that doesn't mean you're failing.",
  ],
  hopeful: [
    "that feeling you're holding? protect it. it's real.",
    "hope is not naive. it's brave. especially after the week you probably had.",
    "the best time to build the relationship is when things are good. use this.",
    "this is a deposit day. stay in it.",
  ],
  worried: [
    "worried means you're paying attention. that's parenting.",
    "worry without action is just pain. what's the one thing you can actually do today?",
    "curiosity is not the same as interrogation. tone carries the whole message.",
    "your teen is not the problem. they're going through one.",
  ],
  okay: [
    "okay days are the ones where the real work happens. stay close.",
    "being consistent is a love language for teenagers.",
    "the best time to build the relationship is before there's a crisis.",
    "connection before correction. every time — even on the easy days.",
  ],
};

const MOOD_MODULE: Record<string, string> = {
  heavy:   'regulate',
  hopeful: 'connect',
  worried: 'listen',
  okay:    'connect',
};

const MODULES = [
  {
    id: 'listen',
    icon: '👂',
    label: 'Listen to Understand',
    sub: '6 techniques for real hearing',
    tips: [
      "Reflect back without fixing: \"So what you're saying is…\"",
      "Tolerate silence. Teens often need 8–10 seconds before they speak.",
      "Put your phone face-down. Not on silent. Down.",
      "Ask 'what' and 'how', not 'why'. Why puts people on defense.",
      "Listen for the feeling under the words, not just the words.",
      "Validate before you pivot. 'That makes sense' before 'have you tried…'",
    ],
  },
  {
    id: 'regulate',
    icon: '🧘',
    label: 'Regulate Together',
    sub: 'co-regulation strategies',
    tips: [
      "A calm parent is the most powerful de-escalation tool you have.",
      "Say 'I need a minute' instead of exploding — they learn this from you.",
      "Side-by-side activities lower defenses better than face-to-face talks.",
      "Driving together is gold. No eye contact = safer conversations.",
      "Name your own feelings out loud. \"I'm frustrated and trying to stay calm.\"",
      "Physical movement resets both of you — a walk, a drive, even stretching together.",
    ],
  },
  {
    id: 'repair',
    icon: '🔧',
    label: 'Repair After Conflict',
    sub: 'reconnect after the hard moment',
    tips: [
      "Start with acknowledgment, not explanation. \"That was hard. I'm sorry.\"",
      "Don't wait for them to come to you. Teens almost never do. You go first.",
      "Repair doesn't erase the rupture. It teaches that ruptures can be survived.",
      "A small gesture counts: leaving a snack, a text with just a heart.",
      "Don't make repair conditional. 'I love you' isn't earned. It just is.",
      "Repair in private. Conflict in private. Never an audience.",
    ],
  },
  {
    id: 'understand',
    icon: '🧠',
    label: 'Teen Brain 101',
    sub: 'why they act this way',
    tips: [
      "The prefrontal cortex (logic, impulse control) isn't done until ~25.",
      "Emotional regulation is literally harder for them. It's biology, not attitude.",
      "Peer opinion activates the same brain region as physical pain.",
      "Sleep deprivation makes teens look dysregulated — check sleep first.",
      "They feel shame more intensely than adults. Criticism lands harder than you think.",
      "Teens need 8–10 hours of sleep. That's not laziness — that's neuroscience.",
    ],
  },
  {
    id: 'connect',
    icon: '💜',
    label: 'Connection Builders',
    sub: 'low-stakes ways to stay close',
    tips: [
      "10 minutes a day of undivided, unguided connection matters more than 2 hours of trying.",
      "Show up for the small things — they're deposits for when the big things happen.",
      "Ask about their world (music, show, game) with genuine curiosity, not strategy.",
      "Don't make connection contingent on good behavior.",
      "Text memes, songs, or just 'thinking of you.' Low-stakes contact matters.",
      "Celebrate small wins out loud — not just grades, but character moments and efforts.",
    ],
  },
  {
    id: 'mental_health',
    icon: '💙',
    label: "When They're Struggling",
    sub: 'signals, support, and when to get help',
    tips: [
      "Struggling doesn't mean broken. It means human.",
      "Don't rush them to feel better. Feeling heard often IS the help.",
      "Watch for changes in sleep, appetite, friends, or interests — these are signals.",
      "Ask once. Don't press. Then leave the door open: \"I'm here whenever.\"",
      "You don't have to fix it. Sitting with them in it is often enough.",
      "If you're worried about their mental health, name it gently without catastrophizing.",
    ],
  },
  {
    id: 'conflict',
    icon: '⚡',
    label: 'Navigating Conflict',
    sub: 'fight better, disconnect less',
    tips: [
      "Conflict is not the enemy. Disconnection is.",
      "When voices rise, one of you has to go first. Make it you.",
      "If it keeps recurring, the surface issue isn't the real one.",
      "Rules without relationship lead to rebellion. Relationship makes rules stick.",
      "Take the issue seriously without taking it personally.",
      "After conflict, reconnect before the day ends. Don't let it sit overnight.",
    ],
  },
  {
    id: 'trust',
    icon: '🔑',
    label: 'Building Trust',
    sub: 'earned in small moments',
    tips: [
      "Trust is built in the small moments, not the big speeches.",
      "If you said you'd do something, do it. Or explain why you can't. Every time.",
      "Don't share what they told you in confidence. Ever.",
      "Trust your teen before they give you a reason not to. Most will meet that.",
      "When they make a mistake, how you respond becomes their trust thermometer.",
      "Ask permission before sharing their business — even with the other parent.",
    ],
  },
  {
    id: 'identity',
    icon: '🌱',
    label: 'Supporting Their Identity',
    sub: 'let them become who they are',
    tips: [
      "Their identity is still forming. They're not who they'll be. Neither are you.",
      "Curiosity about who they're becoming is a gift. Pressure about it is a wall.",
      "Let them change their mind about themselves. That's how identity works.",
      "Don't make your approval contingent on them being who you expected.",
      "Ask 'what do you think about that?' more than \"here's what I think.\"",
      "They need space to try on identities that might not fit. Let them try.",
    ],
  },
];

const CONVERSATION_STARTERS = [
  { situation: "After a bad day",         starter: "\"That looked rough. You want company or space?\"" },
  { situation: "They seem off",           starter: "\"Hey. Not fishing. Just checking. You good?\"" },
  { situation: "After a fight",           starter: "\"I handled that badly. Can we try again?\"" },
  { situation: "They shut down",          starter: "\"You don't have to talk. I'm just here.\"" },
  { situation: "They're struggling",      starter: "\"What do you need from me right now — to talk, to listen, or to just be here?\"" },
  { situation: "Celebrating a win",       starter: "\"I see you working hard. I'm proud of you.\"" },
  { situation: "School stress",           starter: "\"School feels like a lot right now. What's the hardest part this week?\"" },
  { situation: "Friend drama",            starter: "\"That situation with your friend sounds complicated. Do you want to talk through it or just vent?\"" },
  { situation: "You overheard something", starter: "\"I wasn't trying to snoop. But I noticed something. Can I ask?\"" },
  { situation: "They got in trouble",     starter: "\"I'm not here to lecture. I just want to understand what happened.\"" },
  { situation: "They seem distant",       starter: "\"I've noticed we haven't really talked in a minute. Anything between us I should know about?\"" },
  { situation: "Big life question",       starter: "\"I don't have the answer. But I want to think through it with you if you'll let me.\"" },
  { situation: "After a disappointment",  starter: "\"That really mattered to you. I'm sorry it didn't go the way you hoped.\"" },
  { situation: "Quiet car ride",          starter: "\"No agenda. Just wondering what's been on your mind lately.\"" },
  { situation: "Before bed",              starter: "\"Hey. Before you close the door — anything you want to say?\"" },
  { situation: "You made a mistake",      starter: "\"I need to apologize for something. Can I?\"" },
  { situation: "They're excited",         starter: "\"Tell me about it. All of it. I actually want to know.\"" },
  { situation: "After a hard week",       starter: "\"This week was a lot. You holding up okay?\"" },
  { situation: "Phone/screen tension",    starter: "\"I don't want to fight about this. Can we figure out what would actually work for both of us?\"" },
  { situation: "When they push you away", starter: "\"Okay. I'm not going far. Door's open when you're ready.\"" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface ParentSekretCoachScreenProps {
  setScreen:    (s: string) => void;
  parentMood?:  string;
  BottomNav:    React.ReactNode;
}

export function ParentSekretCoachScreen({ setScreen, parentMood, BottomNav }: ParentSekretCoachScreenProps) {
  const [wisdomLine] = useState(() => {
    const moodPool = parentMood ? MOOD_WISDOM[parentMood] : null;
    return moodPool ? pick(moodPool) : pick(WISDOM);
  });

  const [chatMessages, setChatMessages]   = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]         = useState('');
  const [chatLoading, setChatLoading]     = useState(false);
  const [showGuides, setShowGuides]       = useState(false);
  const [activeModule, setActiveModule]   = useState<string | null>(null);
  const [starterIdx, setStarterIdx]       = useState(0);

  const cloudBreath = useRef(new Animated.Value(0)).current;
  const fadeIn      = useRef(new Animated.Value(0)).current;
  const scrollRef   = useRef<ScrollView>(null);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(cloudBreath, { toValue: 1, duration: 3000, useNativeDriver: true }),
      Animated.timing(cloudBreath, { toValue: 0, duration: 3000, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const cloudScale = cloudBreath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  const handleSend = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    const userMsg = makeUserMessage(text);
    setChatInput('');
    const nextMessages = [...chatMessages, userMsg];
    setChatMessages(nextMessages);
    setChatLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    try {
      const result = await sendMessage(
        'parentCoach',
        text,
        'parentCoach',
        {
          history: chatMessages,
          mood: parentMood,
          surface: 'parentCoach',
        },
      );
      setChatMessages(prev => [...prev, makeAssistantMessage(result.reply)]);
    } catch {
      setChatMessages(prev => [...prev, makeAssistantMessage("Something got in the way. Try again.")]);
    } finally {
      setChatLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [chatInput, chatLoading, chatMessages, parentMood]);

  const suggestedModuleId = parentMood ? MOOD_MODULE[parentMood] : null;
  const sortedModules = suggestedModuleId
    ? [...MODULES.filter(m => m.id === suggestedModuleId), ...MODULES.filter(m => m.id !== suggestedModuleId)]
    : MODULES;

  const currentModule = MODULES.find(m => m.id === activeModule);
  if (currentModule) {
    return (
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => setActiveModule(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={s.back}>←</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>{currentModule.icon} {currentModule.label}</Text>
              <Text style={s.sub}>{currentModule.sub}</Text>
            </View>
          </View>
          {currentModule.tips.map((tip, i) => (
            <View key={i} style={s.tipCard}>
              <Text style={s.tipNum}>{i + 1}</Text>
              <Text style={s.tipText}>{tip}</Text>
            </View>
          ))}
          <View style={s.spacer} />
        </ScrollView>
        {BottomNav}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeIn }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => setScreen('home')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.back}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Se'kret Coach</Text>
            <Text style={s.sub}>your parenting presence</Text>
          </View>
        </View>

        <View style={s.cloudBlock}>
          <Animated.View style={{ transform: [{ scale: cloudScale }] }}>
            <Image source={IMAGES.cloudHeadphones} style={s.cloudImg} resizeMode="contain" />
          </Animated.View>
          <View style={s.wisdomBubble}>
            {parentMood ? (
              <Text style={s.moodTag}>
                {parentMood === 'heavy' ? '😩' : parentMood === 'hopeful' ? '💜' : parentMood === 'worried' ? '😔' : '😌'}
                {'  '}for when you're feeling {parentMood}
              </Text>
            ) : null}
            <Text style={s.wisdomText}>"{wisdomLine}"</Text>
          </View>
        </View>

        <Text style={s.sectionLabel}>Talk to Se'kret</Text>
        <View style={s.chatArea}>
          {chatMessages.length === 0 && (
            <Text style={s.chatHint}>Tell Se'kret what's going on. She's here for you, not for your teen.</Text>
          )}
          {chatMessages.map((msg) => (
            <View
              key={msg.id}
              style={[s.bubble, msg.role === 'user' ? s.bubbleUser : s.bubbleCoach]}
            >
              <Text style={[s.bubbleText, msg.role === 'user' ? s.bubbleTextUser : s.bubbleTextCoach]}>
                {msg.text}
              </Text>
            </View>
          ))}
          {chatLoading && (
            <View style={[s.bubble, s.bubbleCoach]}>
              <ActivityIndicator size="small" color="#c084fc" />
            </View>
          )}
        </View>

        <View style={s.inputRow}>
          <TextInput
            style={s.chatInput}
            value={chatInput}
            onChangeText={setChatInput}
            placeholder="What's going on at home…"
            placeholderTextColor="#475569"
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!chatInput.trim() || chatLoading) && s.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!chatInput.trim() || chatLoading}
          >
            <Text style={s.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.guidesToggle} onPress={() => setShowGuides(v => !v)} activeOpacity={0.8}>
          <Text style={s.sectionLabel} numberOfLines={1}>Coaching Guides</Text>
          <Text style={s.guidesChevron}>{showGuides ? '↑' : '↓'}</Text>
        </TouchableOpacity>

        {showGuides && sortedModules.map(m => {
          const isSuggested = m.id === suggestedModuleId;
          return (
            <TouchableOpacity
              key={m.id}
              style={[s.moduleCard, isSuggested && s.moduleCardSuggested]}
              onPress={() => setActiveModule(m.id)}
              activeOpacity={0.8}
            >
              <Text style={s.moduleIcon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.moduleLabel}>{m.label}</Text>
                <Text style={s.moduleSub}>{m.sub}</Text>
                {isSuggested && <Text style={s.suggestedBadge}>suggested for your mood</Text>}
              </View>
              <Text style={s.moduleArrow}>›</Text>
            </TouchableOpacity>
          );
        })}

        <Text style={[s.sectionLabel, { marginTop: 24 }]}>When you don't know what to say</Text>
        <View style={s.starterCard}>
          <Text style={s.starterSituation}>{CONVERSATION_STARTERS[starterIdx].situation}</Text>
          <Text style={s.starterText}>{CONVERSATION_STARTERS[starterIdx].starter}</Text>
          <TouchableOpacity
            style={s.nextBtn}
            onPress={() => setStarterIdx(i => (i + 1) % CONVERSATION_STARTERS.length)}
          >
            <Text style={s.nextBtnText}>Next situation → ({starterIdx + 1}/{CONVERSATION_STARTERS.length})</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.calmShortcut} onPress={() => setScreen('calm')} activeOpacity={0.8}>
          <Text style={s.calmShortcutEmoji}>🌬️</Text>
          <View style={{ flex: 1 }}>
            <Text style={s.calmShortcutLabel}>Calm Before Replying</Text>
            <Text style={s.calmShortcutSub}>pause, breathe, and reconnect first</Text>
          </View>
          <Text style={s.moduleArrow}>›</Text>
        </TouchableOpacity>

        <View style={s.spacer} />
      </Animated.ScrollView>
      {BottomNav}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#06030f' },
  scroll: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: TOP, paddingHorizontal: 20, paddingBottom: 16,
  },
  back:  { color: '#c4b5fd', fontSize: 22, fontWeight: '300' },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub:   { color: '#94A3B8', fontSize: 12, marginTop: 2 },

  cloudBlock: { alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  cloudImg:   { width: 72, height: 72, marginBottom: 10 },
  wisdomBubble: {
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)',
    borderRadius: 14, padding: 16,
  },
  moodTag:    { color: '#c084fc', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, textAlign: 'center' },
  wisdomText: { color: '#e9d5ff', fontSize: 14, fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },

  sectionLabel: {
    color: '#c084fc', fontSize: 12, fontWeight: '700', letterSpacing: 0.8,
    textTransform: 'uppercase', marginHorizontal: 20, marginBottom: 10,
  },

  chatArea: {
    marginHorizontal: 20, marginBottom: 8, gap: 10,
  },
  chatHint: {
    color: '#475569', fontSize: 13, fontStyle: 'italic', lineHeight: 20,
    textAlign: 'center', paddingVertical: 12,
  },
  bubble: {
    maxWidth: '85%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(192,132,252,0.18)',
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)',
  },
  bubbleCoach: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: '#1e293b',
  },
  bubbleText:      { fontSize: 14, lineHeight: 22 },
  bubbleTextUser:  { color: '#e9d5ff' },
  bubbleTextCoach: { color: '#CBD5E1' },

  inputRow: {
    flexDirection: 'row', gap: 10, marginHorizontal: 20, marginBottom: 24, alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1, color: '#fff', fontSize: 14, lineHeight: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: 'rgba(192,132,252,0.18)',
    borderWidth: 1, borderColor: '#c084fc',
    borderRadius: 14, width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText:     { color: '#e9d5ff', fontSize: 18, fontWeight: '700' },

  guidesToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 20, marginBottom: 10,
  },
  guidesChevron: { color: '#c084fc', fontSize: 14, fontWeight: '700' },

  moduleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 16, padding: 14,
  },
  moduleCardSuggested: {
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderColor: 'rgba(192,132,252,0.3)',
  },
  moduleIcon:     { fontSize: 24 },
  moduleLabel:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  moduleSub:      { color: '#64748B', fontSize: 11, marginTop: 2 },
  suggestedBadge: { color: '#c084fc', fontSize: 10, fontWeight: '600', marginTop: 4 },
  moduleArrow:    { color: '#64748B', fontSize: 18, fontWeight: '300' },

  tipCard: {
    flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 14, padding: 14,
  },
  tipNum:  { color: '#c084fc', fontSize: 13, fontWeight: '800', width: 18, lineHeight: 22 },
  tipText: { color: '#CBD5E1', fontSize: 14, lineHeight: 22, flex: 1 },

  starterCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 16, padding: 18,
  },
  starterSituation: { color: '#c084fc', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6 },
  starterText:      { color: '#fff', fontSize: 16, lineHeight: 26, fontStyle: 'italic', marginBottom: 14 },
  nextBtn:          { alignSelf: 'flex-end' },
  nextBtnText:      { color: '#64748B', fontSize: 12 },

  calmShortcut: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    marginHorizontal: 20, marginTop: 4, marginBottom: 12,
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.25)',
    borderRadius: 16, padding: 14,
  },
  calmShortcutEmoji: { fontSize: 24 },
  calmShortcutLabel: { color: '#e9d5ff', fontSize: 14, fontWeight: '700' },
  calmShortcutSub:   { color: '#94A3B8', fontSize: 11, marginTop: 2 },

  spacer: { height: 24 },
});
