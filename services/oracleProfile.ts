import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  OracleDimensionEntry,
  OracleMode,
  OracleQuestion,
  OracleRecord,
  OracleSignals,
  OracleTurn,
  ProfileDimension,
  SoftState,
  StrategyAxis,
  StrategyAxisEntry,
} from '../types/oracle';
import { supabase } from '@/utils/supabase';

const STORAGE_KEY: Record<OracleMode, string> = {
  teen: 'oracle_profile_teen',
  parent: 'oracle_profile_parent',
};

// ─── Teen Question Bank ───────────────────────────────────────────────────────

const TEEN_QUESTIONS: OracleQuestion[] = [
  // Identity
  { id: 'teen-identity-001', mode: 'teen', dimension: 'identity', text: "When you walk into a room full of people you don't know — what's the first thing you feel?" },
  { id: 'teen-identity-002', mode: 'teen', dimension: 'identity', text: "Is there a version of yourself that only certain people get to see? What's that version like?" },
  { id: 'teen-identity-003', mode: 'teen', dimension: 'identity', text: "What would people be surprised to know is actually a big deal to you?" },
  // Emotional
  { id: 'teen-emotional-001', mode: 'teen', dimension: 'emotional', text: "When something hits hard, do you feel it right away — or does it usually catch up to you later?" },
  { id: 'teen-emotional-002', mode: 'teen', dimension: 'emotional', text: "What does it usually take for you to feel okay again after a bad day?" },
  { id: 'teen-emotional-003', mode: 'teen', dimension: 'emotional', text: "Is there a feeling you have a lot that you don't really have a word for?" },
  // Relational
  { id: 'teen-relational-001', mode: 'teen', dimension: 'relational', text: "Who do you actually relax around? Like fully — no performance?" },
  { id: 'teen-relational-002', mode: 'teen', dimension: 'relational', text: "When someone lets you down, what do you usually do with that?" },
  { id: 'teen-relational-003', mode: 'teen', dimension: 'relational', text: "What's something you wish people understood about how you need to be treated?" },
  // Resilience
  { id: 'teen-resilience-001', mode: 'teen', dimension: 'resilience', text: "What's something you got through that you didn't think you'd get through?" },
  { id: 'teen-resilience-002', mode: 'teen', dimension: 'resilience', text: "When things fall apart, what's usually the first thing you do?" },
  { id: 'teen-resilience-003', mode: 'teen', dimension: 'resilience', text: "How do you know when you're actually okay versus just pretending to be?" },
  // Self-talk
  { id: 'teen-selfTalk-001', mode: 'teen', dimension: 'selfTalk', text: "What's something you say to yourself that you would never say out loud to someone else?" },
  { id: 'teen-selfTalk-002', mode: 'teen', dimension: 'selfTalk', text: "When you mess up, how long does it usually take before you stop replaying it?" },
  { id: 'teen-selfTalk-003', mode: 'teen', dimension: 'selfTalk', text: "What do you say to yourself to keep going when it's hard?" },
  // Drive
  { id: 'teen-drive-001', mode: 'teen', dimension: 'drive', text: "What's something you worked at even when nobody was watching or applauding?" },
  { id: 'teen-drive-002', mode: 'teen', dimension: 'drive', text: "What's the thing that, when you're doing it, time just disappears?" },
  { id: 'teen-drive-003', mode: 'teen', dimension: 'drive', text: "Is there something you want that you haven't told people you want?" },
  // Boundaries
  { id: 'teen-boundaries-001', mode: 'teen', dimension: 'boundaries', text: "Is there something you keep doing for people that you actually wish you didn't have to?" },
  { id: 'teen-boundaries-002', mode: 'teen', dimension: 'boundaries', text: "What does it feel like when someone asks too much of you — do you say something, or just manage it?" },
  { id: 'teen-boundaries-003', mode: 'teen', dimension: 'boundaries', text: "What's something you're protective of that people don't realize you're protective of?" },
  // Expression
  { id: 'teen-expression-001', mode: 'teen', dimension: 'expression', text: "When something's wrong, are you more likely to say it — or wait until someone notices?" },
  { id: 'teen-expression-002', mode: 'teen', dimension: 'expression', text: "Is there something you've been trying to say but haven't found the right way yet?" },
  { id: 'teen-expression-003', mode: 'teen', dimension: 'expression', text: "Do people usually get an honest version of you — or a version you've adjusted for the room?" },
  // Belonging
  { id: 'teen-belonging-001', mode: 'teen', dimension: 'belonging', text: "Where's the place or situation where you feel most like yourself?" },
  { id: 'teen-belonging-002', mode: 'teen', dimension: 'belonging', text: "Is there somewhere you feel like you have to earn your place? What's that like?" },
  { id: 'teen-belonging-003', mode: 'teen', dimension: 'belonging', text: "What makes you feel like you're in the right room with the right people?" },
  // Future
  { id: 'teen-future-001', mode: 'teen', dimension: 'future', text: "When you think about your life a few years from now — what's the feeling you most want to have?" },
  { id: 'teen-future-002', mode: 'teen', dimension: 'future', text: "Is there something you're afraid might not happen for you? You don't have to name it exactly." },
  { id: 'teen-future-003', mode: 'teen', dimension: 'future', text: "What would you start working on right now if you knew it would work out?" },
  // Strategy
  { id: 'teen-strategy-planning-001', mode: 'teen', dimension: 'identity', axis: 'planning', text: "When you have something big coming up, do you usually have a plan — or figure it out as you go?" },
  { id: 'teen-strategy-conflict-001', mode: 'teen', dimension: 'relational', axis: 'conflict', text: "When something bothers you about someone, what's your first instinct — say something, or let it pass?" },
  { id: 'teen-strategy-processing-001', mode: 'teen', dimension: 'emotional', axis: 'processing', text: "When you're figuring out how you feel about something — do you think it through first, or just move and see what happens?" },
  { id: 'teen-strategy-risk-001', mode: 'teen', dimension: 'resilience', axis: 'risk', text: "Are you more likely to go for something and see what happens, or wait until you're more sure it'll work?" },
  { id: 'teen-strategy-expression-001', mode: 'teen', dimension: 'expression', axis: 'expression', text: "When something's happening inside you — do you need to get it out somehow, or does keeping it to yourself feel safer?" },
  { id: 'teen-strategy-work-001', mode: 'teen', dimension: 'drive', axis: 'work', text: "When you have a goal, do you prefer to work through it alone or with people?" },
  { id: 'teen-strategy-response-001', mode: 'teen', dimension: 'emotional', axis: 'response', text: "When something unexpected happens — are you usually the first to react, or do you take a second before you respond?" },
  { id: 'teen-strategy-vision-001', mode: 'teen', dimension: 'future', axis: 'vision', text: "Do you tend to dream big and let things unfold — or do you prefer to build toward something specific, step by step?" },
];

// ─── Parent Question Bank ─────────────────────────────────────────────────────

const PARENT_QUESTIONS: OracleQuestion[] = [
  // Presence
  { id: 'par-presence-001', mode: 'parent', dimension: 'presence', text: "When your teen needs you and you're already running on empty — what do you usually do?" },
  { id: 'par-presence-002', mode: 'parent', dimension: 'presence', text: "Are you more often physically present but mentally elsewhere — or the other way around?" },
  { id: 'par-presence-003', mode: 'parent', dimension: 'presence', text: 'What does "showing up" mean to you in practice, not in theory?' },
  // Emotional
  { id: 'par-emotional-001', mode: 'parent', dimension: 'emotional', text: "What emotion do you feel most often in your parenting role that you don't let anyone see?" },
  { id: 'par-emotional-002', mode: 'parent', dimension: 'emotional', text: "When a conversation with your teen escalates — where do you feel it in your body first?" },
  { id: 'par-emotional-003', mode: 'parent', dimension: 'emotional', text: "When was the last time something related to your kid really shook you — and what was that about?" },
  // Communication
  { id: 'par-communication-001', mode: 'parent', dimension: 'communication', text: "When you're talking to your teen, are you more often trying to be understood — or trying to understand?" },
  { id: 'par-communication-002', mode: 'parent', dimension: 'communication', text: "What's something you've said to your teen that landed differently than you meant it to?" },
  { id: 'par-communication-003', mode: 'parent', dimension: 'communication', text: "Is there a topic you avoid with them? What would happen if you didn't avoid it?" },
  // Repair
  { id: 'par-repair-001', mode: 'parent', dimension: 'repair', text: "After a difficult moment with your teen, what usually happens next — who moves first?" },
  { id: 'par-repair-002', mode: 'parent', dimension: 'repair', text: "Do you find it easy or hard to apologize to your kid — and what usually stops you when it's hard?" },
  { id: 'par-repair-003', mode: 'parent', dimension: 'repair', text: "Is there something you've said or done in parenting that you wish you could take back?" },
  // Boundaries
  { id: 'par-boundaries-001', mode: 'parent', dimension: 'boundaries', text: "Where do you feel yourself giving too much — and where might you actually be giving too little?" },
  { id: 'par-boundaries-002', mode: 'parent', dimension: 'boundaries', text: "When your teen pushes a limit, what does that usually bring up in you?" },
  // Expectations
  { id: 'par-expectations-001', mode: 'parent', dimension: 'expectations', text: "What's an expectation you have of your teen that's actually about you, not them?" },
  { id: 'par-expectations-002', mode: 'parent', dimension: 'expectations', text: "Is there something you want for them that maybe they don't want for themselves?" },
  { id: 'par-expectations-003', mode: 'parent', dimension: 'expectations', text: "What would it look like for you to let them fail at something without jumping in?" },
  // Connection
  { id: 'par-connection-001', mode: 'parent', dimension: 'connection', text: "When do you feel closest to your teen? What's usually happening in those moments?" },
  { id: 'par-connection-002', mode: 'parent', dimension: 'connection', text: "Is there a version of them you miss? What was different then?" },
  { id: 'par-connection-003', mode: 'parent', dimension: 'connection', text: "What's something you do just to be near them — even when it doesn't look like connection?" },
  // Self-care
  { id: 'par-selfCare-001', mode: 'parent', dimension: 'selfCare', text: "When was the last time you did something just for yourself — not as a parent or partner?" },
  { id: 'par-selfCare-002', mode: 'parent', dimension: 'selfCare', text: "What do you tell yourself when you think about taking a break?" },
  // Values
  { id: 'par-values-001', mode: 'parent', dimension: 'values', text: "What value do you most want your kid to carry into adulthood?" },
  { id: 'par-values-002', mode: 'parent', dimension: 'values', text: "Looking at how you actually live — not how you want to — what are you teaching them right now?" },
  // Reactivity
  { id: 'par-reactivity-001', mode: 'parent', dimension: 'reactivity', text: "What does your teen do that sets you off the fastest — and what do you think is underneath that reaction?" },
  { id: 'par-reactivity-002', mode: 'parent', dimension: 'reactivity', text: "When you lose your patience, what do you usually tell yourself afterward?" },
  // Flexibility
  { id: 'par-flexibility-001', mode: 'parent', dimension: 'flexibility', text: "Is there a rule or approach you've held onto that you're not sure still works?" },
  { id: 'par-flexibility-002', mode: 'parent', dimension: 'flexibility', text: "When your teen surprises you — in any direction — how do you usually respond?" },
  // Identity
  { id: 'par-identity-001', mode: 'parent', dimension: 'identity', text: "Who are you when you're not being their parent? How present is that person right now?" },
  { id: 'par-identity-002', mode: 'parent', dimension: 'identity', text: "What part of your own teen years shows up most in how you parent?" },
  // Purpose
  { id: 'par-purpose-001', mode: 'parent', dimension: 'purpose', text: "What's the one thing you most want your teen to know about you — not as a parent, but as a person?" },
  { id: 'par-purpose-002', mode: 'parent', dimension: 'purpose', text: "What keeps you trying even on the days when nothing seems to be working?" },
  // Strategy
  { id: 'par-strategy-conflict-001', mode: 'parent', dimension: 'communication', axis: 'conflict', text: "When you sense tension coming with your teen — is your first move toward it or away from it?" },
  { id: 'par-strategy-processing-001', mode: 'parent', dimension: 'emotional', axis: 'processing', text: "When something goes wrong in a relationship — do you tend to think it through first, or jump straight to doing something about it?" },
  { id: 'par-strategy-expression-001', mode: 'parent', dimension: 'communication', axis: 'expression', text: "Are you more likely to tell your teen how you're feeling — or handle it privately and let it pass?" },
  { id: 'par-strategy-response-001', mode: 'parent', dimension: 'reactivity', axis: 'response', text: "In the heat of a moment with your teen — do you usually react right away, or do you find yourself stepping back first?" },
];

// ─── Strategy Lean Patterns ───────────────────────────────────────────────────

const STRATEGY_PATTERNS: Record<StrategyAxis, [RegExp, RegExp]> = {
  planning: [
    /(plan|list|prepare|steps|organized|think.*through|schedule|map.*out)/i,
    /(wing|improvise|see.*what.*happens|spontan|jump.*in|figure.*out.*as|go.*with)/i,
  ],
  conflict: [
    /(avoid|let.*go|ignore|shut.*down|hope.*pass|not.*worth|drop.*it|move.*on)/i,
    /(address|say.*something|bring.*up|confront|direct|honest.*about|speak.*up)/i,
  ],
  processing: [
    /(think.*about|analyze|overthink|replay|understand.*why|process|sit.*with)/i,
    /(just.*do|try.*it|act.*first|move.*on|take.*action|do.*something)/i,
  ],
  risk: [
    /(careful|wait|sure|safe|certain|know.*it.*works|check|prepared)/i,
    /(just.*go|try|bold|jump|see.*what.*happens|take.*chance|go.*for.*it)/i,
  ],
  expression: [
    /(keep.*myself|private|inside|don't.*say|hold.*it|to.*myself|nobody.*knows)/i,
    /(get.*it.*out|talk.*about|express|say.*it|need.*to.*share|vent|tell)/i,
  ],
  work: [
    /(alone|myself|own|solo|independently|by.*myself|figure.*it.*out.*on.*my)/i,
    /(together|with.*people|team|help|others|collaborate|joint)/i,
  ],
  response: [
    /(react|immediately|right.*away|first.*instinct|without.*thinking|snap)/i,
    /(pause|think.*first|take.*a.*second|intentional|deliberate|before.*I)/i,
  ],
  vision: [
    /(dream|imagine|hope.*one.*day|picture|some.*day|eventually|let.*it.*unfold)/i,
    /(build|steps|specific|goal|work.*toward|plan.*for|concrete|milestone)/i,
  ],
};

// ─── Profile Signal Patterns ──────────────────────────────────────────────────

const DIMENSION_SIGNALS: Partial<Record<ProfileDimension, RegExp[]>> = {
  identity: [/(hide|mask|version.*of.*me|don't.*show|different.*around|protect|real.*me)/i],
  emotional: [/(numb|shut.*down|feel.*later|catch.*up|bottle|suppress|overwhelm|floods)/i],
  relational: [/(trust|let.*in|close|real.*friend|safe.*person|relax.*around)/i],
  resilience: [/(got.*through|survive|keep.*going|didn't.*think|still.*here|bounce)/i],
  selfTalk: [/(tell.*myself|inner|voice.*in.*head|replay|beat.*myself|forgive)/i],
  drive: [/(flow|lose.*track.*time|passion|care.*about|work.*hard|show.*up)/i],
  boundaries: [/(said.*yes|too.*much|people.*please|hard.*to.*say.*no|owe)/i],
  expression: [/(hard.*to.*say|can't.*find.*words|wait.*for.*them.*to.*notice)/i],
  belonging: [/(home|belong|fit.*in|accepted|right.*place|comfortable|myself)/i],
  future: [/(hope|scared|want|worried|work.*toward|dream|afraid)/i],
  presence: [/(distracted|somewhere.*else|not.*really.*there|checked.*out|fully.*there)/i],
  communication: [/(talk.*past|misunderstood|hear.*me|listen|land.*differently)/i],
  repair: [/(apologize|sorry|come.*back|who.*moves.*first|circle.*back)/i],
  expectations: [/(should|supposed|wish.*they|my.*kid|pressure|want.*for.*them)/i],
  connection: [/(close|used.*to.*be|miss.*them|those.*moments)/i],
  selfCare: [/(for.*myself|break|rest|just.*me|recharge)/i],
  values: [/(teach|pass.*on|raise|most.*important|want.*them.*to)/i],
  reactivity: [/(lose.*it|snap|set.*me.*off|underneath|trigger|patience)/i],
  flexibility: [/(holding.*on|let.*go.*of|still.*works|adapt|change.*my)/i],
  purpose: [/(keep.*trying|keep.*going|reason|point|matters|worth.*it)/i],
};

// ─── Soft State ───────────────────────────────────────────────────────────────

function computeSoftState(entry: OracleDimensionEntry): SoftState {
  const count = entry.signals.length;
  const hasConcern = entry.signals.some(s => /(struggle|avoid|can't|stuck|numb|fear|worry)/i.test(s));
  if (count >= 6 && !hasConcern) return 'strong';
  if (count >= 3 && hasConcern) return 'needsAttention';
  if (count >= 3) return 'growing';
  return 'emerging';
}

function emptyRecord(mode: OracleMode): OracleRecord {
  return {
    mode,
    profile: {},
    strategy: {},
    sessionCount: 0,
    totalTurns: 0,
    lastSession: '',
    history: [],
    signals: {},
  };
}

// ─── Load / Save ──────────────────────────────────────────────────────────────

export async function loadOracleRecord(mode: OracleMode): Promise<OracleRecord> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY[mode]);
    if (!raw) return emptyRecord(mode);
    return JSON.parse(raw) as OracleRecord;
  } catch {
    return emptyRecord(mode);
  }
}

/**
 * saveOracleRecord
 * 1. Always writes to AsyncStorage (authoritative local cache, instant).
 * 2. Best-effort upserts the full record snapshot to Supabase `oracle_records`
 *    (keyed on user_id + mode). Errors are swallowed — local state is always
 *    the source of truth for the UI.
 */
export async function saveOracleRecord(record: OracleRecord): Promise<void> {
  // 1. Local write — always succeeds even offline.
  try {
    await AsyncStorage.setItem(STORAGE_KEY[record.mode], JSON.stringify(record));
  } catch {}

  // 2. Cloud sync — best-effort.
  try {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dimensionSummary: Record<string, number> = {};
    for (const [dim, entry] of Object.entries(record.profile) as [ProfileDimension, OracleDimensionEntry][]) {
      dimensionSummary[dim] = entry.signals.length;
    }

    await supabase.from('oracle_records').upsert(
      {
        user_id:           user.id,
        mode:              record.mode,
        session_count:     record.sessionCount,
        total_turns:       record.totalTurns,
        last_session:      record.lastSession || null,
        dimension_summary: dimensionSummary,
        profile_snapshot:  JSON.stringify(record),
        updated_at:        new Date().toISOString(),
      },
      { onConflict: 'user_id,mode' },
    );
  } catch {
    // Network failure — local write above already persisted the record.
  }
}

/**
 * markSessionComplete
 * Called at the end of each oracle session to write an immutable row to
 * `oracle_session_log`. AsyncStorage is already up to date via saveOracleRecord;
 * this adds a permanent per-session audit trail for analytics and cross-device
 * restore.
 *
 * NOTE: table is oracle_session_log (not oracle_sessions) to avoid conflict
 * with the companion-memory upsert table created in 0003_oracle_parentlinks.
 */
export async function markSessionComplete(
  record: OracleRecord,
  sessionQuestionIds: string[],
): Promise<void> {
  try {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dimensionSummary: Record<string, number> = {};
    for (const [dim, entry] of Object.entries(record.profile) as [ProfileDimension, OracleDimensionEntry][]) {
      dimensionSummary[dim] = entry.signals.length;
    }

    await supabase.from('oracle_session_log').insert({
      user_id:           user.id,
      mode:              record.mode,
      session_index:     record.sessionCount,
      total_turns:       record.totalTurns,
      question_ids:      sessionQuestionIds,
      dimension_summary: dimensionSummary,
      profile_snapshot:  JSON.stringify(record),
      completed_at:      new Date().toISOString(),
    });
  } catch {
    // Best-effort — session row is analytics only, not load-path critical.
  }
}

// ─── Question Selection ───────────────────────────────────────────────────────

export function selectSessionQuestions(record: OracleRecord, count = 3): OracleQuestion[] {
  const bank = record.mode === 'teen' ? TEEN_QUESTIONS : PARENT_QUESTIONS;
  const asked = new Set(record.history.map(t => t.questionId));
  const available = bank.filter(q => !asked.has(q.id));
  if (available.length === 0) return [];

  const strategyDone = Object.keys(record.strategy).length;
  const profileEntries = Object.entries(record.profile) as [ProfileDimension, OracleDimensionEntry][];
  const leastExplored = profileEntries
    .sort((a, b) => a[1].signals.length - b[1].signals.length)
    .map(e => e[0]);

  const scored = available.map(q => {
    let score = 0;
    if (q.axis && strategyDone < 4) score += 2;
    if (!record.profile[q.dimension as ProfileDimension]) score += 3;
    const exploredIdx = leastExplored.indexOf(q.dimension as ProfileDimension);
    if (exploredIdx !== -1) score += Math.max(0, 5 - exploredIdx);
    return { q, score };
  });

  scored.sort((a, b) => b.score - a.score || Math.random() - 0.5);
  return scored.slice(0, count).map(s => s.q);
}

// ─── Answer Processing ────────────────────────────────────────────────────────

function extractStrategyLeans(answer: string): Partial<Record<StrategyAxis, { leanA: number; leanB: number }>> {
  const result: Partial<Record<StrategyAxis, { leanA: number; leanB: number }>> = {};
  for (const [axis, [patA, patB]] of Object.entries(STRATEGY_PATTERNS) as [StrategyAxis, [RegExp, RegExp]][]) {
    const matchA = patA.test(answer) ? 0.3 : 0;
    const matchB = patB.test(answer) ? 0.3 : 0;
    if (matchA > 0 || matchB > 0) result[axis] = { leanA: matchA, leanB: matchB };
  }
  return result;
}

function extractDimensionSignals(dimension: ProfileDimension, answer: string): string[] {
  const patterns = DIMENSION_SIGNALS[dimension] || [];
  const found: string[] = [];
  for (const pat of patterns) {
    const match = answer.match(pat);
    if (match) found.push(match[0].slice(0, 60).trim());
  }
  if (found.length === 0) {
    const words = answer.trim().split(/\s+/).slice(0, 8).join(' ');
    if (words.length > 5) found.push(words);
  }
  return found;
}

export function processAnswer(
  question: OracleQuestion,
  answer: string,
  record: OracleRecord,
): OracleRecord {
  if (!answer.trim()) return record;

  const dim = question.dimension as ProfileDimension;
  const existing: OracleDimensionEntry = record.profile[dim] ?? {
    dimension: dim,
    signals: [],
    softState: 'emerging',
    lastUpdated: '',
  };

  const newSignals = extractDimensionSignals(dim, answer);
  const merged = [...existing.signals, ...newSignals].slice(-20);
  const updated: OracleDimensionEntry = {
    ...existing,
    signals: merged,
    softState: computeSoftState({ ...existing, signals: merged }),
    lastUpdated: new Date().toISOString(),
  };

  const strategyLeans = extractStrategyLeans(answer);
  const newStrategy = { ...record.strategy };
  if (question.axis) {
    const lean = strategyLeans[question.axis];
    if (lean) {
      const prev = newStrategy[question.axis] ?? { axis: question.axis, leanA: 0, leanB: 0, confidence: 0 };
      newStrategy[question.axis] = {
        ...prev,
        leanA: Math.min(1, prev.leanA + lean.leanA),
        leanB: Math.min(1, prev.leanB + lean.leanB),
        confidence: Math.min(1, (prev.confidence ?? 0) + 0.2),
      };
    }
  }

  const turn: OracleTurn = {
    questionId: question.id,
    question: question.text,
    answer: answer.trim().slice(0, 500),
    dimension: dim,
    axis: question.axis,
    timestamp: new Date().toISOString(),
  };

  return {
    ...record,
    profile: { ...record.profile, [dim]: updated },
    strategy: newStrategy,
    totalTurns: record.totalTurns + 1,
    lastSession: new Date().toISOString(),
    history: [...record.history, turn],
  };
}

export function extractOracleSignals(record: OracleRecord | null | undefined): OracleSignals {
  return record?.signals ?? {};
}
