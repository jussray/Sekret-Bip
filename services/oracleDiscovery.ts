
export type OracleSide = 'teen' | 'parent';

export type TeenOracleDimension =
  | 'Confidence'
  | 'Communication'
  | 'Boundaries'
  | 'Trust'
  | 'Leadership'
  | 'Self-Respect'
  | 'Resilience'
  | 'Relationships'
  | 'Purpose'
  | 'Authenticity'
  | 'Self Strategy';

export type ParentOracleDimension =
  | 'Confidence'
  | 'Communication'
  | 'Trust'
  | 'Boundaries'
  | 'Resilience'
  | 'Self Strategy'
  | 'Co-Regulation'
  | 'Caregiver Stress'
  | 'Repair Style'
  | 'Parent-Teen Communication'
  | 'Emotional Availability'
  | 'Support Style'
  | 'Family Leadership'
  | 'Conflict Recovery';

export type OracleDimension = TeenOracleDimension | ParentOracleDimension;
export type OracleDimensionState = 'Emerging' | 'Growing' | 'Strong' | 'Needs Attention';

export interface OracleUnderstanding {
  id: string;
  dimension: OracleDimension;
  theory: string;
  state: OracleDimensionState;
  observations: number;
  updatedAt: string;
}

export interface OracleProfile {
  version: 1;
  side: OracleSide;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
  dimensions: Partial<Record<OracleDimension, OracleDimensionState>>;
  understandings: OracleUnderstanding[];
}

export interface OracleSessionSummary {
  id: string | number;
  side: OracleSide;
  startedAt: string;
  completedAt: string;
  questionIds: string[];
  dimensions: OracleDimension[];
  understandings: string[];
  summary: string;
}

interface OracleInterpretation {
  id: string;
  theory: string;
  evidence: RegExp;
}

export interface OracleQuestion {
  id: string;
  dimension: OracleDimension;
  text: string;
  followUps: string[];
  interpretations: OracleInterpretation[];
}

export interface OracleAnswerSignal {
  dimension: OracleDimension;
  theories: string[];
}

const TEEN_DIMENSIONS: TeenOracleDimension[] = [
  'Confidence', 'Communication', 'Boundaries', 'Trust', 'Leadership', 'Self-Respect',
  'Resilience', 'Relationships', 'Purpose', 'Authenticity', 'Self Strategy',
];

const PARENT_DIMENSIONS: ParentOracleDimension[] = [
  'Confidence', 'Communication', 'Trust', 'Boundaries', 'Resilience', 'Self Strategy',
  'Co-Regulation', 'Caregiver Stress', 'Repair Style', 'Parent-Teen Communication',
  'Emotional Availability', 'Support Style', 'Family Leadership', 'Conflict Recovery',
];

const question = (
  id: string,
  dimension: OracleDimension,
  text: string,
  followUps: string[],
  interpretations: [string, string, RegExp][],
): OracleQuestion => ({
  id,
  dimension,
  text,
  followUps,
  interpretations: interpretations.map(([interpretationId, theory, evidence]) => ({
    id: interpretationId,
    theory,
    evidence,
  })),
});

const TEEN_QUESTIONS: OracleQuestion[] = [
  question('teen-confidence', 'Confidence', 'What kind of praise actually means something to you?', ['What makes that praise believable?', 'Whose opinion tends to carry the most weight?', 'What do you notice when praise does not land?'], [
    ['specific-recognition', 'May value specific recognition more than broad approval.', /specific|detail|noticed|recognition|exactly|effort|work/i],
    ['earned-belief', 'May trust praise most when it feels earned and personally true.', /earned|honest|real|believe|true|deserve|personal/i],
  ]),
  question('teen-communication', 'Communication', 'When something matters, do you say it right away or think it through first?', ['What are you checking for before you speak?', 'What makes the unedited version easier to say?', 'What usually stays unsaid?'], [
    ['direct-communicator', 'May prefer direct communication when the situation feels clear.', /right away|direct|straight|say it|tell them|honest/i],
    ['deliberate-communicator', 'May choose words and timing carefully when something matters.', /think|process|wait|timing|ready|words|careful/i],
  ]),
  question('teen-boundaries', 'Boundaries', 'What makes it hardest for you to say no?', ['What do you expect might happen if you said it plainly?', 'What makes a no feel fair to you?', 'When is saying no easiest?'], [
    ['reaction-aware', 'May weigh other people’s reactions heavily when setting limits.', /upset|mad|disappoint|reaction|guilt|feel bad|let.*down/i],
    ['fair-boundaries', 'May hold boundaries more easily when their reason feels fair and clear.', /fair|respect|reason|clear|consistent|limit|boundary/i],
  ]),
  question('teen-trust', 'Trust', 'What makes you decide someone is safe to trust?', ['What small thing tells you the most?', 'What usually changes that trust?', 'How long does trust take for you?'], [
    ['consistency-trust', 'May build trust through repeated actions more than promises.', /consistent|action|show up|follow through|reliable|promise|proof/i],
    ['careful-trust', 'May watch carefully before becoming fully open with someone.', /time|slow|watch|notice|careful|open up|wait/i],
  ]),
  question('teen-leadership', 'Leadership', 'What do people depend on you for?', ['Did you choose that role, or did it choose you?', 'What part of that responsibility fits you?', 'What part feels less like yours?'], [
    ['steady-for-others', 'May naturally become a steady or useful person for others.', /depend|advice|listen|help|steady|solve|organize|lead/i],
    ['inherited-responsibility', 'May carry responsibility before deciding whether it belongs to them.', /have to|had to|always me|expect|responsib|carry/i],
  ]),
  question('teen-self-respect', 'Self-Respect', 'What’s something you handled lately in a way you respect?', ['What did that choice say about you?', 'Would an earlier version of you have handled it differently?', 'Which part mattered most to you?'], [
    ['choice-based-respect', 'May recognize self-respect most clearly through their own choices.', /choice|handled|said no|walked away|stood up|kept|decided/i],
    ['changing-standards', 'May be developing a clearer standard for what feels true to them.', /old me|used to|different|becoming|true to me|myself/i],
  ]),
  question('teen-resilience', 'Resilience', 'When you’re overwhelmed, what’s the first thing you stop doing?', ['What usually changes right before that?', 'What helps you notice you have reached that point?', 'What returns first when the pressure lifts?'], [
    ['routine-signals', 'May show overload first through changes in everyday routines.', /routine|sleep|eat|school|work|text|practice|habit/i],
    ['early-warning', 'May have quiet warning signs that appear before pressure piles up.', /warning|notice|sign|pressure|pile|before|overwhelm/i],
  ]),
  question('teen-relationships', 'Relationships', 'What kind of people make you feel most like yourself?', ['What do those people make room for?', 'What changes about you around them?', 'What tells you that room is real?'], [
    ['acceptance-safety', 'May feel most like themself around people who make acceptance visible.', /accept|safe|no judgment|listen|comfortable|understand/i],
    ['unedited-connection', 'May judge relationship safety by how unedited they can be.', /free|open|unedited|real me|myself|room|space/i],
  ]),
  question('teen-purpose', 'Purpose', 'What kind of problem do you actually like being the person who solves?', ['What part of solving it pulls you in?', 'Who benefits when you are good at that?', 'What makes that problem worth your energy?'], [
    ['builder-purpose', 'May find purpose through problems they can actively build, fix, or improve.', /solve|build|create|fix|teach|make|organize/i],
    ['useful-purpose', 'May feel purposeful when their strengths have a visible effect for someone.', /useful|impact|difference|benefit|strength|help/i],
  ]),
  question('teen-authenticity', 'Authenticity', 'What’s something people usually misunderstand about you?', ['What do they notice first instead?', 'What would they understand if they stayed curious?', 'What part do you protect when that happens?'], [
    ['beyond-first-impressions', 'May care deeply about being known beyond first impressions.', /misunderstand|assume|judge|rude|quiet|loud|first impression/i],
    ['protected-self', 'May protect parts of themself when they expect to be misunderstood.', /hide|private|guard|protect|real me|myself|open up/i],
  ]),
  question('teen-strategy', 'Self Strategy', 'When you have a big decision, what’s usually your first move?', ['What are you trying to protect with that move?', 'When does that approach work best?', 'When does it get in your way?'], [
    ['deliberate-strategy', 'May naturally prepare and think before moving on an important choice.', /\bplan|list|research|think|wait|careful|prepare|information\b/i],
    ['action-strategy', 'May understand choices by acting, testing, or trusting instinct.', /\bstart|act|action|doing|did|instinct|gut|improvise|try\b/i],
  ]),
];

const PARENT_QUESTIONS: OracleQuestion[] = [
  question('parent-confidence', 'Confidence', 'Which parenting decisions do you trust yourself to make without outside reassurance?', ['What gives you confidence in those moments?', 'Which decisions create the most second-guessing?', 'What makes your judgment feel grounded?'], [
    ['tested-confidence', 'May trust decisions most when they align with values already tested in real life.', /values|experience|worked|learned|know|tested|grounded/i],
    ['selective-reassurance', 'May seek reassurance selectively when family stakes feel uncertain.', /reassur|second.guess|ask|uncertain|opinion|advice/i],
  ]),
  question('parent-communication', 'Communication', 'When something important needs to be said at home, how do you choose the moment?', ['What tells you the timing is right?', 'What stays unsaid when the timing never feels right?', 'What helps you speak clearly?'], [
    ['timing-aware', 'May treat timing as an important part of honest family communication.', /timing|right moment|wait|ready|calm|private/i],
    ['clarity-first', 'May communicate most clearly after deciding what truly needs to be said.', /clear|point|important|words|think|focus/i],
  ]),
  question('parent-trust', 'Trust', 'What helps you loosen control and trust someone else to handle their part?', ['What proof do you usually need?', 'What happens when their way is different from yours?', 'When is trust easiest?'], [
    ['follow-through-trust', 'May build trust through demonstrated follow-through.', /follow through|reliable|consistent|proof|done|show/i],
    ['different-not-wrong', 'May be learning to separate a different approach from an unreliable one.', /different|their way|not my way|control|let go|method/i],
  ]),
  question('parent-boundaries', 'Boundaries', 'Which family boundary is easiest for you to hold, and which one gets blurry?', ['What makes the blurry one complicated?', 'What would consistency look like without rigidity?', 'Who notices that boundary first?'], [
    ['purposeful-boundaries', 'May hold boundaries best when their purpose is clear.', /purpose|reason|clear|why|important|protect/i],
    ['responsive-consistency', 'May balance consistency with a desire to respond to the situation in front of them.', /consistent|flexible|rigid|depends|situation|exception/i],
  ]),
  question('parent-resilience', 'Resilience', 'What helps you keep one hard family moment from defining the whole day?', ['What helps reset the meaning of the moment?', 'What makes recovery take longer?', 'What tells you the day has shifted again?'], [
    ['specific-moments', 'May recover best when one hard moment can remain specific.', /one moment|specific|not whole|separate|perspective/i],
    ['reset-conditions', 'May have identifiable conditions that help pressure stop spreading.', /reset|walk|quiet|time|space|routine|talk/i],
  ]),
  question('parent-strategy', 'Self Strategy', 'When a family decision is uncertain, what is usually your first move?', ['What are you trying to protect with that move?', 'When does it serve you best?', 'When do you change approaches?'], [
    ['prepared-strategy', 'May rely on preparation and information when family choices feel uncertain.', /plan|research|list|information|prepare|think/i],
    ['collaborative-strategy', 'May understand family choices through discussion and shared input.', /ask|talk|together|input|discuss|family/i],
  ]),
  question('parent-regulation', 'Co-Regulation', 'When tension rises at home, what happens to your pace and tone?', ['What are you trying to communicate then?', 'What helps you become intentional again?', 'What does the room seem to notice?'], [
    ['room-impact', 'May influence the room strongly through pace and tone during tension.', /tone|voice|pace|loud|quiet|fast|slow|room/i],
    ['intentional-reset', 'May be building awareness of how to return to an intentional response.', /pause|breath|step away|intentional|reset|calm/i],
  ]),
  question('parent-stress', 'Caregiver Stress', 'What part of caring for everyone tends to disappear from view?', ['What do people assume you can keep carrying?', 'What is the earliest sign the load is too high?', 'What gets moved to the background first?'], [
    ['invisible-load', 'May carry important work that is easy for others to overlook.', /carry|load|everyone|invisible|overlook|assume/i],
    ['self-last', 'May notice caregiver strain after their own needs move to the background.', /my needs|background|last|too much|exhaust|tired|break/i],
  ]),
  question('parent-repair', 'Repair Style', 'After you get something wrong, what helps you come back to the conversation?', ['What makes returning easier or harder?', 'What tells you repair actually happened?', 'What do you want the return to communicate?'], [
    ['intentional-return', 'May understand repair as returning with intention rather than avoiding the moment.', /come back|return|apolog|own it|try again|conversation/i],
    ['visible-repair', 'May look for concrete signs that connection has been restored.', /repair|connection|understand|resolved|changed|follow through/i],
  ]),
  question('parent-teen-communication', 'Parent-Teen Communication', 'When your teen tells you something difficult, what is your first instinct?', ['What are you hoping that instinct accomplishes?', 'What decides whether you listen, clarify, or act?', 'What helps you hear the full version?'], [
    ['protect-or-solve', 'May enter difficult conversations with a strong instinct to protect or solve.', /protect|solve|fix|act|do something|handle/i],
    ['listen-before-action', 'May be refining when to listen, clarify, or act in parent-teen conversations.', /listen|question|clarify|hear|before|understand/i],
  ]),
  question('parent-availability', 'Emotional Availability', 'What makes it easiest for the people you love to get the real version of you?', ['What tends to close that access?', 'How do they know you are fully present?', 'What helps you stay open?'], [
    ['unguarded-access', 'May become most emotionally available when there is room to be unguarded.', /real me|unguarded|open|honest|safe|myself/i],
    ['visible-presence', 'May communicate emotional presence through specific recognizable behaviors.', /present|phone|attention|listen|eye contact|time/i],
  ]),
  question('parent-support', 'Support Style', 'When someone you love is struggling, what kind of help do you offer first?', ['How do you decide whether that help is wanted?', 'What support is hardest for you to offer?', 'When do you change your approach?'], [
    ['default-support', 'May have a default support style that reflects how they show care.', /advice|listen|help|fix|space|hug|check in|show up/i],
    ['matched-support', 'May be learning to match support to the person rather than only the problem.', /ask|wanted|need|match|different|depends/i],
  ]),
  question('parent-leadership', 'Family Leadership', 'What do you want people at home to learn from how you handle pressure?', ['What do they probably see now?', 'What part of that example already feels true?', 'What matters most about the example?'], [
    ['example-leadership', 'May define family leadership through example more than authority.', /example|model|show|teach|handle|lead|values/i],
    ['everyday-teaching', 'May care about what everyday responses teach the people they love.', /everyday|pressure|response|see me|already|learn/i],
  ]),
  question('parent-conflict', 'Conflict Recovery', 'What tells you a family conflict is actually over?', ['Is quiet enough, or do you look for something else?', 'Who makes the first move back?', 'What makes reconnection feel real?'], [
    ['quiet-vs-repair', 'May distinguish between conflict becoming quiet and becoming repaired.', /quiet|over|done|resolved|apology|talk/i],
    ['reconnection-moves', 'May pay attention to who initiates reconnection after tension.', /first move|reconnect|come back|repair|reach out|connection/i],
  ]),
];

const dimensionsFor = (side: OracleSide): OracleDimension[] => (
  side === 'teen' ? TEEN_DIMENSIONS : PARENT_DIMENSIONS
);

const questionsFor = (side: OracleSide): OracleQuestion[] => (
  side === 'teen' ? TEEN_QUESTIONS : PARENT_QUESTIONS
);

export function createOracleProfile(side: OracleSide, now = new Date().toISOString()): OracleProfile {
  return {
    version: 1,
    side,
    createdAt: now,
    updatedAt: now,
    sessionCount: 0,
    dimensions: {},
    understandings: [],
  };
}

export function normalizeOracleProfile(value: unknown, side: OracleSide): OracleProfile {
  if (!value || typeof value !== 'object') return createOracleProfile(side);
  const candidate = value as Partial<OracleProfile>;
  if (candidate.side !== side || !Array.isArray(candidate.understandings)) return createOracleProfile(side);

  const allowedDimensions = new Set(dimensionsFor(side));
  const allowedStates = new Set<OracleDimensionState>(['Emerging', 'Growing', 'Strong', 'Needs Attention']);
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : new Date().toISOString();
  const fresh = createOracleProfile(side, createdAt);
  const understandings = candidate.understandings.filter((item): item is OracleUnderstanding => Boolean(
    item
    && typeof item.id === 'string'
    && allowedDimensions.has(item.dimension)
    && typeof item.theory === 'string'
    && item.theory.trim()
    && allowedStates.has(item.state)
    && Number.isFinite(item.observations)
    && item.observations > 0
    && typeof item.updatedAt === 'string',
  )).slice(0, 36);
  const dimensions = Object.fromEntries(
    Object.entries(candidate.dimensions || {}).filter(([dimension, state]) => (
      allowedDimensions.has(dimension as OracleDimension)
      && allowedStates.has(state as OracleDimensionState)
    )),
  ) as Partial<Record<OracleDimension, OracleDimensionState>>;

  return {
    ...fresh,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : fresh.updatedAt,
    sessionCount: Number.isFinite(candidate.sessionCount) && Number(candidate.sessionCount) >= 0
      ? Math.floor(Number(candidate.sessionCount))
      : 0,
    dimensions,
    understandings,
  };
}

export function normalizeOracleSessions(value: unknown, side: OracleSide): OracleSessionSummary[] {
  if (!Array.isArray(value)) return [];
  const allowedDimensions = new Set(dimensionsFor(side));
  return value.filter((session): session is OracleSessionSummary => Boolean(
    session
    && session.side === side
    && (typeof session.id === 'string' || typeof session.id === 'number')
    && typeof session.startedAt === 'string'
    && typeof session.completedAt === 'string'
    && Array.isArray(session.questionIds)
    && session.questionIds.every((id: unknown) => typeof id === 'string')
    && Array.isArray(session.dimensions)
    && session.dimensions.every((dimension: unknown) => allowedDimensions.has(dimension as OracleDimension))
    && Array.isArray(session.understandings)
    && session.understandings.every((theory: unknown) => typeof theory === 'string')
    && typeof session.summary === 'string',
  )).slice(0, 50);
}

export function selectOracleOpening(profileValue: OracleProfile | undefined, side: OracleSide): OracleQuestion {
  const profile = normalizeOracleProfile(profileValue, side);
  const bank = questionsFor(side);
  const ranked = bank
    .map(item => ({
      item,
      count: profile.understandings.filter(understanding => understanding.dimension === item.dimension).length,
    }))
    .sort((a, b) => a.count - b.count);
  const minimum = ranked[0]?.count || 0;
  const leastExplored = ranked.filter(item => item.count === minimum);
  return leastExplored[profile.sessionCount % leastExplored.length]?.item || bank[0];
}

const LOW_SIGNAL = /^(i don['’]?t know|idk|not sure|nothing|none|maybe|not really)$/i;
const NEGATED_MEANING = /\b(doesn['’]?t matter|does not matter|means? nothing|don['’]?t care|do not care|none of it)\b/i;

export function analyzeOracleAnswer(questionValue: OracleQuestion, answer: string): OracleAnswerSignal {
  const clean = answer.trim();
  if (clean.split(/\s+/).length < 2 || LOW_SIGNAL.test(clean) || NEGATED_MEANING.test(clean)) {
    return { dimension: questionValue.dimension, theories: [] };
  }
  return {
    dimension: questionValue.dimension,
    theories: questionValue.interpretations
      .filter(interpretation => interpretation.evidence.test(clean))
      .map(interpretation => interpretation.theory),
  };
}

export function selectOracleFollowUp(opening: OracleQuestion, completedTurns: number): OracleQuestion {
  const followUps = [
    ...opening.followUps,
    'What part of that answer feels most true to you?',
    'What would someone close to you notice about that?',
  ];
  return {
    ...opening,
    id: `${opening.id}-follow-${completedTurns}`,
    text: followUps[Math.max(0, completedTurns - 1)] || followUps[followUps.length - 1],
  };
}

export function shouldCompleteOracleSession(turnCount: number, answer: string, theoryCount: number): boolean {
  if (turnCount >= 5) return true;
  if (turnCount < 3) return false;
  if (theoryCount === 0) return true;
  return answer.trim().split(/\s+/).length >= 8;
}

const stateFor = (observations: number): OracleDimensionState => {
  if (observations >= 4) return 'Strong';
  if (observations >= 2) return 'Growing';
  return 'Emerging';
};

export function completeOracleSession(
  profileValue: OracleProfile | undefined,
  side: OracleSide,
  startedAt: string,
  questionIds: string[],
  signals: OracleAnswerSignal[],
  now = new Date().toISOString(),
): { profile: OracleProfile; session: OracleSessionSummary } {
  const profile = normalizeOracleProfile(profileValue, side);
  const nextUnderstandings = [...profile.understandings];
  const sessionFindings = Array.from(new Map(
    signals.flatMap(signal => signal.theories.map(theory => [
      `${signal.dimension}:${theory}`,
      { dimension: signal.dimension, theory },
    ] as const)),
  ).values());

  sessionFindings.forEach(({ dimension, theory }) => {
    const existingIndex = nextUnderstandings.findIndex(item => (
      item.dimension === dimension && item.theory === theory
    ));
    const previous = existingIndex >= 0 ? nextUnderstandings[existingIndex] : undefined;
    const observations = (previous?.observations || 0) + 1;
    const understanding: OracleUnderstanding = {
      id: previous?.id || `${side}-${dimension}-${theory}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 96),
      dimension,
      theory,
      observations,
      state: stateFor(observations),
      updatedAt: now,
    };
    if (existingIndex >= 0) nextUnderstandings[existingIndex] = understanding;
    else nextUnderstandings.unshift(understanding);
  });

  const dimensions = Array.from(new Set(signals.map(signal => signal.dimension)));
  const dimensionStates = { ...profile.dimensions };
  dimensions.forEach(dimension => {
    const observations = nextUnderstandings
      .filter(item => item.dimension === dimension)
      .reduce((highest, item) => Math.max(highest, item.observations), 0);
    if (observations > 0) dimensionStates[dimension] = stateFor(observations);
  });
  const theories = sessionFindings.map(finding => finding.theory).slice(0, 5);
  const session: OracleSessionSummary = {
    id: `${side}-${now}-${profile.sessionCount + 1}`,
    side,
    startedAt,
    completedAt: now,
    questionIds,
    dimensions,
    understandings: theories,
    summary: theories.length
      ? `Se’kret explored ${dimensions.join(' and ')} and saved ${theories.length === 1 ? 'an evolving understanding' : 'a few evolving understandings'}.`
      : `Se’kret explored ${dimensions[0] || 'how this person moves through life'} without forcing a conclusion.`,
  };

  return {
    profile: {
      ...profile,
      updatedAt: now,
      sessionCount: profile.sessionCount + 1,
      dimensions: dimensionStates,
      understandings: nextUnderstandings.slice(0, 36),
    },
    session,
  };
}

export function buildOracleContext(profileValue: OracleProfile | null | undefined, side: OracleSide): string[] {
  return normalizeOracleProfile(profileValue, side).understandings
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 8)
    .map(item => `${item.dimension}: ${item.theory}`);
}

export async function syncOracleDiscovery(profile: OracleProfile, session: OracleSessionSummary): Promise<void> {
  try {
    const { getSupabase } = await import('../src/utils/supabase');
    const db = getSupabase();
    if (!db) return;
    const { data: authData } = await db.auth.getUser();
    const user = authData?.user;
    if (!user) return;
    const dimensionSummary = Object.fromEntries(Object.entries(profile.dimensions));
    await db.from('oracle_records').upsert({
      user_id: user.id,
      mode: profile.side,
      session_count: profile.sessionCount,
      total_turns: session.questionIds.length,
      last_session: profile.updatedAt,
      dimension_summary: dimensionSummary,
      profile_snapshot: JSON.stringify(profile),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,mode' });
    await db.from('oracle_session_log').insert({
      user_id: user.id,
      mode: profile.side,
      session_index: profile.sessionCount,
      total_turns: session.questionIds.length,
      question_ids: session.questionIds,
      dimension_summary: dimensionSummary,
      profile_snapshot: JSON.stringify(profile),
      completed_at: session.completedAt,
    });
  } catch { /* best-effort */ }
}

export async function restoreOracleDiscovery(side: OracleSide): Promise<OracleProfile | null> {
  try {
    const { getSupabase } = await import('../src/utils/supabase');
    const db = getSupabase();
    if (!db) return null;
    const { data: authData } = await db.auth.getUser();
    const user = authData?.user;
    if (!user) return null;
    const { data, error } = await db
      .from('oracle_records')
      .select('profile_snapshot')
      .eq('user_id', user.id)
      .eq('mode', side)
      .maybeSingle();
    if (error || !data?.profile_snapshot) return null;
    return normalizeOracleProfile(JSON.parse(data.profile_snapshot as string), side);
  } catch { return null; }
}
