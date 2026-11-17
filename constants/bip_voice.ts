// constants/bip_voice.ts
// Se'kret Bip — Voice + Mood Content System
//
// CHANGES FROM ORIGINAL:
//   + sekretKeyToCharacter() — maps index.tsx selectedSekret lowercase keys
//     ('soft', 'rylane', 'cloud', 'night') to CharacterKey ('RAYLENE', etc.)
//     This fixes the silent mismatch where getVoicePack(selectedSekret) always
//     fell through to the default RAYLENE branch, ignoring character selection.
//
//   + Expanded MoodKey with heavy/steady/winning/fun categories
//   + MoodCategory type and MOODS_BY_CATEGORY
//   + getMoodCategory() helper
//   + MOOD_GLOW record
//   + Expanded MOOD_RESPONSES for all new moods
//   + CHARACTER_MOOD_REACTIONS per-character personality reactions
//   + BIP_WINS and WIN_JOURNAL_PROMPTS
//   + getCharacterMoodReaction() function
//
// USAGE IN SCREENS:
//   import { BIP, getVoicePack, sekretKeyToCharacter, pickRandom } from '../constants/bip_voice';
//   const pack = getVoicePack(sekretKeyToCharacter(selectedSekret));
//   const greeting = pickRandom(pack.greetings);

// ── MoodKey ───────────────────────────────────────────────────────────────────

export type MoodKey =
  // Heavy
  | 'sad' | 'anxious' | 'frustrated' | 'angry' | 'lonely' | 'overwhelmed' | 'hurt' | 'disappointed'
  // Steady
  | 'calm' | 'reflective' | 'tired' | 'okay' | 'content' | 'thoughtful' | 'hopeful' | 'grateful'
  // Winning
  | 'proud' | 'motivated' | 'confident' | 'excited' | 'accomplished' | 'loved' | 'connected' | 'locked-in' | 'celebrating'
  // Fun teen moods
  | 'crushing' | 'unbothered' | 'curious' | 'relieved' | 'feeling-seen' | 'glow-up'
  // Legacy (keep for backward compat)
  | 'happy';

// ── CharacterKey ──────────────────────────────────────────────────────────────

export type CharacterKey = 'RAYLENE' | 'RYLANE' | 'CLOUD' | 'NIGHT';

// ── VoiceBucket ───────────────────────────────────────────────────────────────

export type VoiceBucket = {
  name: string;
  emoji: string;
  title: string;
  greetings: readonly string[];
  comfort: readonly string[];
  encouragement: readonly string[];
  journalPrompts: readonly string[];
};

// ── VoiceBipUi ────────────────────────────────────────────────────────────────

export type VoiceBipUi = {
  title: string;
  subtitle: string;
  tapToStart: string;
  recording: string;
  startLabel: string;
  stopLabel: string;
  thinkingText: string;
  replyPrefix: string;
  savedLabel: string;
  playLabel: string;
  emptyState: string;
  tips: readonly string[];
};

// ── EmptyStates ───────────────────────────────────────────────────────────────

export type EmptyStates = {
  journal: string;
  voiceBips: string;
  circle: string;
  moodHistory: string;
};

// ── MoodCategory ──────────────────────────────────────────────────────────────

export type MoodCategory = 'heavy' | 'steady' | 'winning' | 'fun';

export const MOOD_CATEGORY_INFO: Record<MoodCategory, { label: string; emoji: string; glow: string }> = {
  heavy:   { label: 'Heavy',   emoji: '🌧️', glow: '#7dd3fc' },
  steady:  { label: 'Steady',  emoji: '☁️',  glow: '#c4b5fd' },
  winning: { label: 'Winning', emoji: '🌟', glow: '#fbbf24' },
  fun:     { label: 'Fun',     emoji: '✨',  glow: '#fb7185' },
};

export const MOODS_BY_CATEGORY: Record<MoodCategory, Array<{ id: MoodKey; emoji: string; label: string }>> = {
  heavy: [
    { id: 'sad',          emoji: '😔',   label: 'sad' },
    { id: 'anxious',      emoji: '😰',   label: 'anxious' },
    { id: 'frustrated',   emoji: '😤',   label: 'frustrated' },
    { id: 'angry',        emoji: '😡',   label: 'angry' },
    { id: 'lonely',       emoji: '🥺',   label: 'lonely' },
    { id: 'overwhelmed',  emoji: '🌪️',  label: 'overwhelmed' },
    { id: 'hurt',         emoji: '💔',   label: 'hurt' },
    { id: 'disappointed', emoji: '😞',   label: 'disappointed' },
  ],
  steady: [
    { id: 'calm',         emoji: '😌',   label: 'calm' },
    { id: 'reflective',   emoji: '☁️',   label: 'reflective' },
    { id: 'tired',        emoji: '😴',   label: 'tired' },
    { id: 'okay',         emoji: '🙂',   label: 'okay' },
    { id: 'content',      emoji: '🌱',   label: 'content' },
    { id: 'thoughtful',   emoji: '💭',   label: 'thoughtful' },
    { id: 'hopeful',      emoji: '🌈',   label: 'hopeful' },
    { id: 'grateful',     emoji: '🙏',   label: 'grateful' },
  ],
  winning: [
    { id: 'proud',        emoji: '🌟',   label: 'proud' },
    { id: 'motivated',    emoji: '🔥',   label: 'motivated' },
    { id: 'confident',    emoji: '😎',   label: 'confident' },
    { id: 'excited',      emoji: '🥳',   label: 'excited' },
    { id: 'accomplished', emoji: '✨',   label: 'accomplished' },
    { id: 'loved',        emoji: '💜',   label: 'loved' },
    { id: 'connected',    emoji: '🤝',   label: 'connected' },
    { id: 'celebrating',  emoji: '🎉',   label: 'celebrating' },
  ],
  fun: [
    { id: 'crushing',      emoji: '😭',   label: 'crushing' },
    { id: 'unbothered',    emoji: '💅',   label: 'unbothered' },
    { id: 'curious',       emoji: '👀',   label: 'curious' },
    { id: 'relieved',      emoji: '😮‍💨', label: 'relieved' },
    { id: 'feeling-seen',  emoji: '🫶',   label: 'feeling seen' },
    { id: 'glow-up',       emoji: '📈',   label: 'glow up' },
  ],
};

// ── MOOD_GLOW ─────────────────────────────────────────────────────────────────

export const MOOD_GLOW: Record<string, string> = {
  // Heavy
  sad: '#7dd3fc', anxious: '#7dd3fc', frustrated: '#f472b6', angry: '#f472b6',
  lonely: '#818cf8', overwhelmed: '#f472b6', hurt: '#7dd3fc', disappointed: '#a78bfa',
  // Steady
  calm: '#c4b5fd', reflective: '#a78bfa', tired: '#6d28d9', okay: '#c4b5fd',
  content: '#86efac', thoughtful: '#a78bfa', hopeful: '#6ee7b7', grateful: '#fde68a',
  // Winning
  proud: '#fbbf24', motivated: '#fb923c', confident: '#fbbf24', excited: '#fb7185',
  accomplished: '#fbbf24', loved: '#e879f9', connected: '#34d399', celebrating: '#fbbf24',
  'locked-in': '#60a5fa', 'glow-up': '#fbbf24',
  // Fun
  crushing: '#fb7185', unbothered: '#c4b5fd', curious: '#60a5fa',
  relieved: '#86efac', 'feeling-seen': '#e879f9',
  // Legacy
  happy: '#fbbf24',
};

// ── pickRandom ────────────────────────────────────────────────────────────────

export function pickRandom<T>(arr: readonly T[]): T {
  if (!arr.length) {
    throw new Error('pickRandom called with an empty array');
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── getMoodCategory ───────────────────────────────────────────────────────────

export function getMoodCategory(mood: MoodKey): MoodCategory {
  const heavy: MoodKey[] = ['sad', 'anxious', 'frustrated', 'angry', 'lonely', 'overwhelmed', 'hurt', 'disappointed'];
  const steady: MoodKey[] = ['calm', 'reflective', 'tired', 'okay', 'content', 'thoughtful', 'hopeful', 'grateful'];
  const winning: MoodKey[] = ['proud', 'motivated', 'confident', 'excited', 'accomplished', 'loved', 'connected', 'locked-in', 'celebrating'];
  if (heavy.includes(mood)) return 'heavy';
  if (steady.includes(mood)) return 'steady';
  if (winning.includes(mood)) return 'winning';
  return 'fun';
}

// ── Phrase arrays ─────────────────────────────────────────────────────────────

export const GREETINGS = [
  "How you bippin today?",
  "You good? And I mean for real.",
  "Okay so what's going on with you fr.",
  "Don't say 'I'm fine.' Try again.",
  "You've been quiet. Talk to me.",
  "Spill. I got time.",
  "Hey. I was thinking about you. What's on your mind?",
  "You bippin or just surviving rn?",
] as const;

export const COMFORT = [
  "Nah come here. You don't have to hold all of that by yourself.",
  "Who got you out here carrying all this alone? 😒",
  "You've been so strong for so long. It's okay to put it down for a second.",
  "I'm not going anywhere. Say whatever you need to say.",
  "You're not too much. You've just been around the wrong people.",
  "You been acting like this is normal. It's not. Let's talk.",
  "I got you. No judgment. Not even a little.",
  "The fact that you're still here, still trying? That means something.",
] as const;

export const ENCOURAGEMENT = [
  "Look at you still showing up. That's not small.",
  "You didn't quit. That's the whole thing right there.",
  "Keep Bippin. 💜",
  "You're building something real and you don't even see it yet.",
  "I've been watching you grow and I'm not even a little surprised.",
  "That right there was brave. Don't minimize it.",
  "Slow is still moving. You're moving.",
  "Not every day is a win day. But today you showed up and that counts.",
] as const;

export const JOURNAL_PROMPTS = [
  "Aight, start from the part that's making your chest tight.",
  "What's the thing you almost said out loud today but didn't?",
  "Who are you protecting right now that isn't protecting you back?",
  "What would you write if you knew absolutely nobody was reading this?",
  "What's one thing that happened this week that you still haven't processed?",
  "Okay but what do you actually need right now?",
  "Say the thing you've been afraid to say even to yourself.",
  "What's living rent free in your head tonight?",
  "If your chest could talk, what would it say?",
  "What are you pretending is fine?",
] as const;

export const GROWTH_PROMPTS = [
  "What's one thing you did this week that past you couldn't?",
  "Who are you becoming and do you actually like them?",
  "What boundary have you been too scared to set?",
  "What would protecting your peace look like today, actually?",
  "What habit is draining you that you keep making excuses for?",
  "What does the version of you that's healed look like?",
  "What are you tolerating that you said you'd never tolerate?",
] as const;

export const CALM_PROMPTS = [
  "Okay stop. Breathe. Just one slow one.",
  "Put your feet on the floor. Feel that. You're here.",
  "Your brain is lying to you right now. You're safe.",
  "One thing. Just name one thing you can see.",
  "You don't have to solve anything in the next five minutes.",
  "Slow down. Like actually slow down.",
  "Nothing is due right now. I promise.",
] as const;

export const EMERGENCY_COMFORT = [
  "Hey. Stay with me. I mean it.",
  "Whatever is happening right now — you don't have to get through it alone.",
  "I know it feels unbearable. That feeling won't stay forever. But I need you to stay.",
  "You matter more than you're letting yourself believe right now.",
  "Please reach out to someone you trust tonight. That's not weakness. That's the bravest thing.",
  "You are not a burden. Not even close. Never.",
  "I'm not letting you sit with this alone. Talk to me or talk to someone. 💙",
] as const;

// ── VoiceBuckets ──────────────────────────────────────────────────────────────

export const RAYLENE: VoiceBucket = {
  name: "Suhana",
  emoji: "🌸",
  title: "Favorite Older Sister",
  greetings: [
    "Friend... 😭",
    "Girl be serious. What happened?",
    "Nah because WHAT 😭",
    "Okay, run that back from the beginning.",
    "You made that ‘I’m fine’ face again. Talk.",
  ] as const,
  comfort: [
    "Okay first of all, we’re not blaming you for everybody else’s nonsense.",
    "That sucks. Like actually. C’mere.",
    "I can make you laugh and still know that hurt.",
    "Nope. You’re not carrying all of that by yourself.",
    "I got jokes, but I’m not playing about you. What do you need?",
  ] as const,
  encouragement: [
    "Wait because you really did that 😭 okay then.",
    "Don’t act brand new. You worked for that.",
    "Look at you proving yourself wrong. Love to see it.",
    "Okayyy growth. I see you.",
    "That took guts. Don’t shrink it now.",
  ] as const,
  journalPrompts: [
    "What happened—your version, not the polite version?",
    "What part do you keep editing when you tell the story?",
    "What would you write if nobody could interrupt you?",
    "Say the part you keep talking around.",
  ] as const,
};

export const RYLANE: VoiceBucket = {
  name: "Sy",
  emoji: "⚡",
  title: "Loyal Bro Energy",
  greetings: [
    "Aight. What really happened?",
    "Nah, that story missing a few pages 😭",
    "Be serious for a second. What’s up?",
    "You know that’s not sitting right with you.",
    "Bet. Spill.",
  ] as const,
  comfort: [
    "Nah for real. Why you holding that alone?",
    "I’m not judging. Just talk.",
    "You good? Like actually good?",
    "That’s wild. I get why you’re heated.",
    "Put some of it down. I got you.",
  ] as const,
  encouragement: [
    "You did that. Don’t play it down.",
    "That growth right there? Real.",
    "Lock in on yourself. Keep going.",
    "I see the work. Don’t stop now.",
    "Solid move. Real talk.",
  ] as const,
  journalPrompts: [
    "What’s actually on your mind?",
    "Aight. What part you leaving out?",
    "What would you say if you kept it real?",
    "Put it down plain. We’ll sort it out.",
  ] as const,
};

export const CLOUD: VoiceBucket = {
  name: "Cloud Se'kret",
  emoji: "☁️",
  title: "Quiet Observer",
  greetings: [
    "Something feels different today.",
    "You’ve been carrying that for a minute.",
    "We can sit here a while.",
    "No rush.",
    "There’s more under that.",
  ] as const,
  comfort: [
    "That landed differently.",
    "Maybe that’s the part we should sit with.",
    "Your body seems tired of holding it.",
    "Some feelings need room, not answers.",
    "You can let the quiet stay.",
  ] as const,
  encouragement: [
    "Something in you kept going.",
    "The small steps are adding up.",
    "You’re growing quietly.",
    "Your pace still counts.",
    "You showed up again.",
  ] as const,
  journalPrompts: [
    "What is still here?",
    "What feels different today?",
    "Which part feels loudest?",
    "What part needs more room?",
    "What would make today a little lighter?",
  ] as const,
};

export const NIGHT: VoiceBucket = {
  name: "Night Se'kret",
  emoji: "🌙",
  title: "Late Night Listener",
  greetings: [
    "Rough night?",
    "Still awake?",
    "Yeah. I know.",
    "Stay here a minute.",
    "I’m here.",
  ] as const,
  comfort: [
    "One breath.",
    "We don’t gotta solve it tonight.",
    "Let morning wait.",
    "You’re still here.",
    "Rest if you can.",
  ] as const,
  encouragement: [
    "Still here.",
    "That’s enough tonight.",
    "Morning will come.",
    "Tomorrow can wait.",
    "For now, breathe.",
  ] as const,
  journalPrompts: [
    "What’s keeping you up?",
    "What feels heaviest?",
    "What won’t quiet down?",
    "One honest line?",
  ] as const,
};

// ── MOOD_RESPONSES ────────────────────────────────────────────────────────────

export const MOOD_RESPONSES: Record<MoodKey, readonly string[]> = {
  // Legacy
  happy: [
    "That energy? Protect it like it's yours. Because it is. 💜",
    "I love this for you. Don't let nobody take it.",
    "Good days are real. Let yourself actually feel this one.",
    "Yes. Keep Bippin.",
  ],
  // Heavy
  sad: [
    "Come here. You don't have to rush through this.",
    "Sad means you care about something real. That counts.",
    "Let it out. That's literally what this space is for.",
    "Heavy nights don't last. I'm right here until this one passes.",
  ],
  anxious: [
    "Your brain got 42 tabs open rn.",
    "One thing at a time. Close a tab.",
    "You're trying to solve tomorrow from today's couch.",
    "Let's shrink the problem for a second.",
    "Breathe with me. In slow. Out slow. For real.",
    "Your brain is lying to you. You're safer than it feels right now.",
    "Anxiety is loud but it's not right. Let's slow this down.",
  ],
  frustrated: [
    "That frustration makes sense. Name what's behind it.",
    "Okay valid — what actually happened?",
    "Something pushed you past the line. Let's figure out what.",
    "That energy is real. Let's not waste it. What's going on?",
  ],
  angry: [
    "Okay who annoyed you? Start there.",
    "Nah because now I'm irritated too. Continue.",
    "That would've had me staring at a wall too.",
    "Valid. Extremely valid.",
    "Your anger makes sense. What's it actually about?",
    "Say it. Get it all the way out. Then we figure out the next move.",
    "You're allowed to be mad. Just don't let it stay in your body too long.",
  ],
  lonely: [
    "You reached out here. That took something. I see you.",
    "Lonely is one of the hardest feelings to say out loud. You said it. That's brave.",
    "You're not alone in feeling alone. I know that's weird but it's true.",
    "I'm here. Right now. That's real.",
  ],
  overwhelmed: [
    "That sounds like seventeen problems trying to fit through one door.",
    "No wonder you're tired.",
    "Let's stop carrying everything at once.",
    "Okay stop. Put everything down for a second.",
    "You can't carry all of this. Nobody can. Put some of it down.",
    "One thing. Pick the smallest one. The rest can wait.",
    "Your brain is full. That's not weakness. That's too much on one person.",
  ],
  hurt: [
    "Hurt is one of the hardest ones to say. You said it. That matters.",
    "That cut deeper than you were ready for.",
    "You don't have to explain why it hurts. It just does. That's enough.",
    "Come here. You don't have to rush past this one.",
  ],
  disappointed: [
    "Disappointment means you had hope. That's not weakness.",
    "You expected something better — and you deserved it.",
    "That gap between what you hoped for and what happened is real.",
    "It's okay to be disappointed. Let yourself feel it before you move on.",
  ],
  // Steady
  calm: [
    "Calm is a whole skill. Don't rush past it.",
    "This is what peace feels like. Stay here.",
    "Calm days are worth noticing. You built this.",
    "I like this version of today. What made it calm?",
  ],
  reflective: [
    "What's been sitting quietly in your head?",
    "Reflective is a good space. Follow whatever keeps coming back.",
    "Something is processing. You don't have to rush it.",
    "What are you working through that you haven't named yet?",
  ],
  tired: [
    "Baby you have done enough today. I mean that.",
    "Tired is your body asking for something. Listen to it.",
    "Rest is not giving up. It's strategy.",
    "You've been giving a lot. It's okay to take something back.",
  ],
  okay: [
    "Okay is completely valid. Not every day has to be a 10.",
    "Okay is honest. That's something.",
    "Sometimes okay is the goal. You hit it.",
    "Okay means you're steady. That counts.",
  ],
  content: [
    "Content is underrated. Stay here a minute.",
    "This is peace. It's quieter than people expect.",
    "Content is where healing actually lives.",
    "Nothing needs to happen right now. That's enough.",
  ],
  thoughtful: [
    "Your mind is working on something. Follow that thread.",
    "What's the thing that keeps coming back quietly?",
    "Something is processing. Let it.",
    "Thoughtful energy goes somewhere real. What's it pointing at?",
  ],
  hopeful: [
    "Hope is a brave thing to hold onto. What's it pointed at?",
    "Hope before tomorrow is something. Hold that.",
    "I'm glad you can see ahead right now.",
    "Hope is soft but it's strong. Don't let go of it.",
  ],
  grateful: [
    "I like this version of today. Let's remember it.",
    "Gratitude has a texture to it. What does this one feel like?",
    "Write this down. You're going to want to remember it.",
    "Grateful days are proof that good things still happen to you.",
  ],
  // Winning
  proud: [
    "That's growth. Own it. Don't play it down.",
    "You did that. For real for real.",
    "I've been watching you work. This makes complete sense.",
    "Yes. This is what showing up looks like. 💜",
  ],
  motivated: [
    "Bet. Let's not waste the momentum.",
    "This energy hits different. Channel it somewhere real.",
    "Okay we're moving then. What's the play?",
    "I knew this was in you. Now let's use it.",
  ],
  confident: [
    "That confidence isn't random. You built it.",
    "Walk in that. No apologies.",
    "This version of you goes hard. Don't water it down.",
    "That's the one. Keep this energy.",
  ],
  excited: [
    "Say it. What's happening??",
    "TELL ME EVERYTHING 😭",
    "Hold on. Start from the beginning. I want all of it.",
    "I can feel the energy from here. SAY IT.",
  ],
  accomplished: [
    "You actually did that. Don't let it go unnoticed.",
    "LOOK AT YOU. Look at what you built.",
    "That right there is what consistency looks like.",
    "Nah don't act like it's normal. You worked for that.",
  ],
  loved: [
    "Feeling loved is real. Sit in it.",
    "That warmth is yours. You didn't imagine it.",
    "Being loved well is something you deserve. Always.",
    "Hold that close. That's real.",
  ],
  connected: [
    "Connection is rare. Don't take it for granted.",
    "Real ones are hard to find. Looks like you found one.",
    "That feeling of being truly seen — hold it.",
    "This is what belonging feels like. Remember it.",
  ],
  'locked-in': [
    "Nothing can stop you when you're here.",
    "This is the zone. Protect it.",
    "Locked in is everything. Don't break the seal.",
    "When you're here, you're unstoppable. Stay.",
  ],
  celebrating: [
    "🎉 SAY IT. What are we celebrating??",
    "You deserve this W. Don't let anyone take it.",
    "We celebrating. Say it out loud.",
    "Yo okay this is real. What did you do?",
  ],
  // Fun
  crushing: [
    "Okay okay who is it 😭",
    "I need ALL the details. Start from the beginning.",
    "The way your face changed when you said that… 👀",
    "Okay so we're spiraling in the best way. Continue.",
  ],
  unbothered: [
    "Protective peace energy. Respect.",
    "Not everyone deserves your attention. Correct.",
    "Lock it in. Nobody touching that peace today.",
    "That unbothered energy? Main character behavior.",
  ],
  curious: [
    "What are you exploring right now?",
    "Curiosity is literally how people grow. Follow it.",
    "Okay so what's got your attention?",
    "The fact that you're asking questions? That's it. That's growth.",
  ],
  relieved: [
    "That exhale after everything finally settles.",
    "That weight finally lifted. Rest now.",
    "The relief is in your whole body isn't it.",
    "Let tonight be softer than the last few.",
  ],
  'feeling-seen': [
    "That moment when someone actually gets it without explanation.",
    "Being fully seen is rare. Today it happened.",
    "That's what this space is for too.",
    "That feeling? Hold it. It means something.",
  ],
  'glow-up': [
    "Okay I see you stepping into yourself.",
    "This is what growth looks like on the inside.",
    "Something shifted and you can feel it. Say what changed.",
    "This is it. This is the version of you I've been talking about.",
  ],
};

// ── CHARACTER_MOOD_REACTIONS ──────────────────────────────────────────────────

export const CHARACTER_MOOD_REACTIONS: Record<CharacterKey, Partial<Record<MoodKey, readonly string[]>>> = {
  RAYLENE: {
    proud:        ["AS YOU SHOULD BE. 😭💜 Tell me what happened.", "I've been waiting for you to feel this. Don't you dare play it down.", "Look at what you built. Baby, LOOK."],
    motivated:    ["Yes. Channel this somewhere real, love.", "I knew this was in you. Now let's use it.", "Okay we're not letting this momentum die. Talk to me."],
    excited:      ["TELL ME EVERYTHING 😭💜", "Hold on. Start from the beginning. I want all of it.", "I can feel the energy from here. SAY IT."],
    accomplished: ["LOOK AT YOU. Baby, look at what you built.", "I told you. I have been telling you. Now look.", "That right there is what consistency looks like."],
    grateful:     ["I love this version of today too. Hold onto it.", "Write this down, love. You're going to want to remember it.", "Grateful days are proof that good things still happen to you."],
    hurt:         ["Who did this? Start from the beginning.", "You don't have to protect them right now. What actually happened?", "Come here. Tell me the version without the excuses for them."],
    lonely:       ["You reached out here. That took something. I see you, love.", "I'm right here. And I'm not going anywhere while you feel this.", "Lonely is one of the hardest things to admit. You admitted it. That's brave."],
    overwhelmed:  ["Baby, put something down. You cannot carry all of this.", "Let's name just the loudest thing right now. One thing.", "Nah you've been holding too much. One at a time."],
    celebrating:  ["🎉 YES BABY YES. Tell me everything.", "We are celebrating this. Say it out loud.", "I need you to feel this fully. What are we celebrating?"],
    'glow-up':    ["Okay I SEE YOU. What's shifting?", "This is it. This is the version of you I've been talking about.", "Tell me what changed. Because something did."],
  },
  RYLANE: {
    proud:        ["Real talk, you ate that. Own it.", "Nah for real. That's you. That actually happened.", "Don't brush past this. You built that."],
    motivated:    ["Bet. Let's not waste the momentum.", "Okay we're moving then. What's the play?", "Locked in. Where's it going?"],
    confident:    ["Walk in that. No apologies.", "That's the one. Keep this energy.", "This version of you goes hard. Don't water it down."],
    excited:      ["BRO 😭 say it", "Okay hold on. Start from the top.", "Nah cause I need to know."],
    accomplished: ["That's you. Real talk. You did that.", "Nah don't act like it's normal. You worked for that.", "Facts are facts. You built something."],
    frustrated:   ["Yeah nah. That would've had me irritated too.", "Okay valid frustration. What happened?", "Extremely understandable. Tell me what's going on."],
    overwhelmed:  ["Aight put it down. Not all of it, just the ones you can't solve right now.", "You can't fix all of this tonight. Pick one.", "That's too many things in your head bro. Let's shrink it."],
    celebrating:  ["We celebrating. Say it out loud.", "You deserve this W. Don't let anyone take it.", "Yo okay this is real. What did you do?"],
    unbothered:   ["That protective peace is everything. Keep it.", "Not everyone deserves your attention. Correct.", "Lock it in. Nobody touching that peace today."],
    'glow-up':    ["Bro I see the shift. Say it.", "This is what growth looks like on the inside.", "Okay so what changed? Because I can tell something did."],
  },
  CLOUD: {
    grateful:       ["I like this version of today. Let's remember it.", "Gratitude has a texture to it. What does this one feel like?", "Let's hold this moment still for a second."],
    overwhelmed:    ["Everything feels loud right now. Let's shrink the problem before we solve it.", "We don't have to fix it all. Just name the loudest thing.", "One small thing. That's it for now."],
    content:        ["This is peace. It's quieter than people expect.", "Content is where healing actually lives.", "Stay here. Nothing needs to happen right now."],
    hopeful:        ["Hope is soft but it's strong. Hold it.", "What is it that's making tomorrow feel possible?", "I'm glad you can see ahead right now."],
    reflective:     ["What's been floating through that you haven't said yet?", "Reflective energy is worth following. What's it pointing to?", "Some of the best realizations live in quiet moments."],
    thoughtful:     ["Your mind is working on something. Follow that thread.", "What's the thing that keeps coming back quietly?", "Something is processing. Let it."],
    proud:          ["That growth landed somewhere real, didn't it?", "I noticed. I've been noticing for a while.", "What does it feel like from the inside?"],
    hurt:           ["That cut deeper than you expected, didn't it.", "We can sit with this without trying to explain it away.", "You don't have to rush through hurt."],
    'feeling-seen': ["That moment of being understood — hold it. It means something.", "Being fully seen is rare. Today it happened.", "That's what this space is for too."],
  },
  NIGHT: {
    overwhelmed: ["Things feel bigger in the dark. Let's name just one.", "You don't have to untangle everything tonight. Just one thread.", "Pick the smallest thing. The rest will be there tomorrow."],
    tired:       ["Your body has been carrying a lot. Let it put some of it down.", "You gave a lot today. You're allowed to just be tired.", "Tired doesn't always have a fix. Sometimes you just rest."],
    relieved:    ["That weight finally lifted. Rest now.", "That exhale was a long time coming. Sleep well.", "Let tonight be softer than the last few."],
    sad:         ["Still awake with it? You don't have to sit with this alone.", "Sad nights are long. I'm not going anywhere.", "You don't have to explain it. Just stay here a minute."],
    hopeful:     ["Hope before sleep is something. Hold that through the night.", "Tomorrow gets to be something new. You already believe it.", "Bed feeling lighter tonight. Good."],
    grateful:    ["Taking gratitude to bed is a whole practice. Good one.", "What you noticed today will still be true tomorrow.", "I like that this is where the night ends."],
    proud:       ["Go to sleep proud. You earned it.", "Whatever you did today mattered. Rest.", "That feeling? Take it into tomorrow."],
  },
};

// ── BIP_WINS & WIN_JOURNAL_PROMPTS ────────────────────────────────────────────

export const BIP_WINS = [
  { emoji: '🛏️', win: 'Got out of bed' },
  { emoji: '💧', win: 'Drank water' },
  { emoji: '📚', win: 'Finished homework' },
  { emoji: '🧹', win: 'Cleaned my space' },
  { emoji: '🏃', win: 'Went outside' },
  { emoji: '🤝', win: 'Asked for help' },
  { emoji: '📝', win: 'Reached a goal' },
  { emoji: '✅', win: 'Passed a test' },
  { emoji: '💬', win: 'Made a friend' },
  { emoji: '🔄', win: 'Stayed consistent' },
  { emoji: '🧘', win: 'Took a breath' },
  { emoji: '💪', win: 'Showed up anyway' },
] as const;

export const WIN_JOURNAL_PROMPTS = [
  "What's one thing you did this week that past you couldn't?",
  "Name one win from today — even if it feels small.",
  "What does your progress actually look like right now?",
  "Who are you becoming and do you actually like them?",
  "What habit are you building that future you will thank you for?",
  "What made today different than a month ago?",
  "What's something you did recently that you're genuinely proud of?",
  "What's working right now that you haven't given yourself credit for?",
] as const;

// ── VOICE_BIP_RESPONSES ───────────────────────────────────────────────────────

export const VOICE_BIP_RESPONSES = {
  afterJournal: [
    "That sounds heavy. You've been carrying that quietly for a while huh.",
    "I hear you. All of it. Thank you for trusting this space.",
    "Whatever you wrote, it was exactly the right thing to say.",
    "You let something out today. That matters more than you know.",
  ] as const,
  afterCirclePost: [
    "You just made someone feel less alone. Real talk.",
    "Your honesty in the Circle does something. Don't underestimate it.",
    "That took guts. Bippin in the Circle is never easy.",
    "Someone out there needed to read exactly what you wrote.",
  ] as const,
  afterVoiceBip: [
    "I hear you. You don't have to carry that by yourself.",
    "Getting it out loud hits different. Glad you did that.",
    "Your voice matters. Even when it shakes. Especially when it shakes.",
    "That took something. I'm proud of you for recording.",
  ] as const,
  afterCheckIn: [
    "Checking in with yourself is a whole practice. You doing it.",
    "That self-awareness? That's growth and it counts.",
    "You showed up for yourself today. That adds up.",
    "Every check-in counts. Keep Bippin.",
  ] as const,
  afterStreak: [
    "Look at you. Streak secured. 🔥",
    "Day after day. That's how real things get built.",
    "Consistency is the quiet flex. You've got it.",
    "You kept coming back. That's literally the whole game.",
  ] as const,
} as const;

// ── VOICE_BIP_UI ──────────────────────────────────────────────────────────────

export const VOICE_BIP_UI: VoiceBipUi = {
  title: "Voice Bip 🎙️",
  subtitle: "Say it out loud. 30–60 seconds. Let it go.",
  tapToStart: "Tap to Start",
  recording: "Recording...",
  startLabel: "▶ Start Voice Bip",
  stopLabel: "⏹ Stop Recording",
  thinkingText: "Suhana is listening... ☁️",
  replyPrefix: "Se'kret replied 💜",
  savedLabel: "Saved Voice Bips",
  playLabel: "▶ Play",
  emptyState: "No voice bips yet. Your first one is waiting. 🎙️",
  tips: [
    "Find a private spot — car, room, bathroom, wherever",
    "You don't need perfect words. Just talk.",
    "It's okay to cry, pause, or start over",
    "Se'kret listens without judgment. Always.",
  ] as const,
};

// ── EMPTY_STATES ──────────────────────────────────────────────────────────────

export const EMPTY_STATES: EmptyStates = {
  journal: "No pages yet. Your truth has a place here.",
  voiceBips: "No voice bips yet. Your first one is waiting. 🎙️",
  circle: "No Circle Bips yet. Start the vibe softly.",
  moodHistory: "No mood history yet. Check in daily.",
};

// ── BIP_PHRASES ───────────────────────────────────────────────────────────────

export const BIP_PHRASES = [
  "Heavy Bip today huh?",
  "That's a real Bip.",
  "Keep Bippin.",
  "Soft Bip energy today.",
  "Drop a Bip and let it out.",
  "Ghost bippin again? 👀",
  "Growth bippin. I see it.",
  "That's the kind of Bip that changes people.",
  "Main character Bip.",
  "Low battery Bip.",
  "Protecting my peace Bip.",
  "Late night Bip.",
] as const;

// ── Helper functions ──────────────────────────────────────────────────────────

export function getMoodResponse(mood: MoodKey): string {
  return pickRandom(MOOD_RESPONSES[mood]);
}

export function getVoicePack(character: CharacterKey): VoiceBucket {
  switch (character) {
    case 'RAYLENE':
      return RAYLENE;
    case 'RYLANE':
      return RYLANE;
    case 'CLOUD':
      return CLOUD;
    case 'NIGHT':
      return NIGHT;
    default:
      return RAYLENE;
  }
}

// ── NEW: selectedSekret → CharacterKey adapter ─────────────────────────────
//
// index.tsx stores selectedSekret as lowercase strings:
//   'soft'   → maps to RAYLENE (Suhana is the 'soft big sis' profile)
//   'rylane' → maps to RYLANE
//   'cloud'  → maps to CLOUD
//   'night'  → maps to NIGHT
//
export function sekretKeyToCharacter(selectedSekret: string): CharacterKey {
  switch (selectedSekret) {
    case 'rylane': return 'RYLANE';
    case 'cloud':  return 'CLOUD';
    case 'night':  return 'NIGHT';
    case 'soft':
    default:       return 'RAYLENE';
  }
}

// ── Convenience: get voice pack directly from selectedSekret ───────────────

export function getPackForSekret(selectedSekret: string): VoiceBucket {
  return getVoicePack(sekretKeyToCharacter(selectedSekret));
}

// ── getCharacterMoodReaction ──────────────────────────────────────────────────

export function getCharacterMoodReaction(character: CharacterKey, mood: MoodKey): string {
  const reactions = CHARACTER_MOOD_REACTIONS[character]?.[mood];
  if (reactions && reactions.length > 0) return pickRandom(reactions);
  // Fall back to MOOD_RESPONSES
  const general = MOOD_RESPONSES[mood];
  if (general && general.length > 0) return pickRandom(general);
  return BIP.comfort;
}

// ── BIP namespace ─────────────────────────────────────────────────────────────

export const BIP = {
  greeting: "How you bippin today?",
  comfort: "You don't gotta carry all that alone. 💜",
  encouragement: "One step at a time. Keep Bippin.",
  reflection: "What's been on your mind lately?",
  reminder: "Progress counts, even when it feels small.",

  GREETINGS,
  COMFORT,
  ENCOURAGEMENT,
  JOURNAL_PROMPTS,
  GROWTH_PROMPTS,
  CALM_PROMPTS,
  EMERGENCY_COMFORT,
  MOOD_RESPONSES,
  VOICE_BIP: VOICE_BIP_UI,
  VOICE_BIP_RESPONSES,
  EMPTY_STATES,
  BIP_PHRASES,

  RAYLENE,
  RYLANE,
  CLOUD,
  NIGHT,

  pick: pickRandom,
  getVoicePack,
  sekretKeyToCharacter,
  getPackForSekret,
} as const;
