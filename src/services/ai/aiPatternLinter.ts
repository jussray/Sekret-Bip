/**
 * Se'kret Bip Voice Pattern Audit v2.0.
 * Density-based persona voice QA for avatar responses.
 * Style signals are not evidence of AI authorship and never block on one word,
 * phrase, punctuation mark, or rhetorical structure.
 */
export type AvatarPersona = 'redteam' | 'cool-cousin' | 'caveman' | 'hype-queen' | 'ghostwriter';
export type PatternSeverity = 'strong' | 'soft';

export interface PatternHit {
  patternId: number;
  patternName: string;
  severity: PatternSeverity;
  matches: string[];
  occurrences: number;
}

export interface LintResult {
  persona: AvatarPersona;
  hits: PatternHit[];
  score: number;
  severity: 'clean' | 'warn' | 'block';
  summary: string;
  clustered: boolean;
  auditKind: 'voice-density';
  authorshipInference: 'not-supported';
}

export const VOICE_SEEDS: Record<AvatarPersona, string> = {
  redteam: `You said you want to know if he's into you. Here's what I actually see: he texts back
fast but never starts the conversation. That's not hot and cold, that's just someone
who responds well but isn't chasing. Could be a lot of reasons. Could just be how he
is with everyone. You'd know better than I do, you've seen him in person.

The thing you're circling around is whether to do something about it. That's the
actual question. I can't answer it for you. But sitting on it for another two weeks
doesn't give you more information, it just gives the anxiety more room.`,
  'cool-cousin': `Okay so I've been thinking about what you said and I don't think the problem is him
exactly. I think the problem is that you've been managing your own expectations so long
that you don't actually know what you want anymore. Like, you said "I just want things
to be chill" but the whole story you just told me was not chill. You were tracking
everything he did.

That's not a character flaw. That's just what happens when you've been burned before.
You get careful. I do it too.

I'm not saying he's the right person or the wrong person. I genuinely don't know.
What I'm actually curious about is: what would you do if you weren't scared of it
going badly? Like if that wasn't in the equation at all. What would you want then?`,
  caveman: `You ask about man who does not write first.

Caveman see this often. Some animals approach. Some wait. Waiting animal is not bad
animal. But waiting animal is waiting. You not waiting. You here, asking caveman.

This means you want to move. Moving is good. Standing still and thinking about moving
is not moving.

Caveman has simple question. You talk to him or not? That is the whole thing.
Everything else is noise.

(Noise is very bad for hunting. Caveman does not like noise.)`,
  'hype-queen': `okay wait so you actually did that? sent the message and everything? respect.
that took something. most people talk about it for three weeks and then do nothing.

now here's the part nobody tells you: the waiting after is its own thing.
it's not about him anymore, it's about you sitting with what you just did.
you made a move. that's yours regardless of how he responds.`,
  ghostwriter: `The question of whether to reach out first is less about strategy and more about
what you actually want the next two weeks to look like. Waiting has a cost.
So does moving. Neither option is free.

The texts pattern you described suggests interest but not urgency on his end.
That might change if you initiate. It might not. There isn't a way to know
without trying it.`,
};

export const AVATAR_PERSONAS: AvatarPersona[] = ['redteam', 'cool-cousin', 'caveman', 'hype-queen', 'ghostwriter'];
const ALL_PERSONAS = AVATAR_PERSONAS;

interface PatternDef {
  id: number;
  name: string;
  terms: RegExp[];
  strongFor: AvatarPersona[];
  softFor: AvatarPersona[];
}

const PATTERNS: PatternDef[] = [
  { id: 20, name: 'Chatbot artifacts', terms: [/\bgreat question\b/i, /\bof course[!,]/i, /\bcertainly[!,]/i, /\byou're absolutely right\b/i, /\bi hope this helps\b/i, /\blet me know if you need\b/i, /\bwould you like me to\b/i, /\bshould i continue\b/i, /\bhere is (an? )?(overview|summary|breakdown)\b/i, /\bwant me to give examples\b/i], strongFor: ALL_PERSONAS, softFor: [] },
  { id: 22, name: 'Sycophancy', terms: [/\bfascinating (question|point|perspective|insight)\b/i, /\bexcellent (question|point|observation)\b/i, /\bthat'?s a (great|fantastic|wonderful|brilliant) (point|question|observation)\b/i, /\bwhat an insightful\b/i, /\bthank you for sharing\b/i], strongFor: ALL_PERSONAS, softFor: [] },
  { id: 28, name: 'Canned signposting', terms: [/\blet'?s dive in\b/i, /\blet'?s explore\b/i, /\blet'?s break (this|it) down\b/i, /\bhere'?s what you need to know\b/i, /\bwithout further ado\b/i, /\bnow let'?s (look at|turn to)\b/i], strongFor: ALL_PERSONAS, softFor: [] },
  { id: 1, name: 'Significance inflation', terms: [/\bpivotal (moment|role|part|dynamic|shift)\b/i, /\bkey turning point\b/i, /\bindelible mark\b/i, /\bevolving landscape\b/i, /\bstands as a testament\b/i, /\bdeeply rooted\b/i, /\bsetting the stage for\b/i, /\bmarks (a|the) shift\b/i], strongFor: ALL_PERSONAS, softFor: [] },
  { id: 14, name: 'Dash overuse', terms: [/[—–]/, / -- /], strongFor: ALL_PERSONAS, softFor: [] },
  { id: 25, name: 'Vague positive conclusions', terms: [/\bthe future looks bright\b/i, /\bexciting times (lie ahead|ahead)\b/i, /\ba (major |big )?step in the right direction\b/i, /\bcontinues to thrive\b/i, /\bjourney toward excellence\b/i], strongFor: ALL_PERSONAS, softFor: [] },
  { id: 27, name: 'Authority tropes', terms: [/\bthe real question is\b/i, /\bat its core\b/i, /\bwhat really matters\b/i, /\bfundamentally[,. ]/i, /\bthe heart of the matter\b/i, /\bthe deeper issue\b/i], strongFor: ALL_PERSONAS, softFor: [] },
  { id: 7, name: 'Loaded vocabulary cluster', terms: [/\btapestry\b/i, /\blandscape\b/i, /\bdelve\b/i, /\bunderscore(s|d)?\b/i, /\bshowcase(s|d|ing)?\b/i, /\bvibrant\b/i, /\bpivotal\b/i, /\bintricate(ly|ies)?\b/i, /\bgarner(s|ed|ing)?\b/i, /\bfostering\b/i, /\benduring\b/i, /\btestament\b/i, /\binterplay\b/i], strongFor: ['redteam', 'caveman', 'hype-queen'], softFor: ['cool-cousin', 'ghostwriter'] },
  { id: 31, name: 'Manufactured punchlines / staccato drama', terms: [/(?:\b[\w][\w ,']{0,30}[.!?]\s*){3,}/], strongFor: ['redteam', 'caveman'], softFor: ['cool-cousin', 'hype-queen', 'ghostwriter'] },
  { id: 32, name: 'Aphorism formulas', terms: [/\b\w+ is the \w+ of \w+\b/i, /\b\w+ becomes a trap\b/i, /\bis not a tool but\b/i, /\bthe language of\b/i, /\bthe currency of\b/i, /\bthe architecture of\b/i], strongFor: ['redteam', 'caveman'], softFor: ['cool-cousin', 'hype-queen', 'ghostwriter'] },
  { id: 33, name: 'Performative candor openers', terms: [/^honestly\?/im, /^look,/im, /^here'?s the thing[,:.]/im, /^the thing is[,:.]/im, /^let'?s be honest[,:.]/im, /^real talk[,:.]/im], strongFor: ['redteam', 'caveman'], softFor: ['cool-cousin', 'hype-queen', 'ghostwriter'] },
  { id: 24, name: 'Excessive hedging', terms: [/\bcould potentially possibly\b/i, /\bmight possibly\b/i, /\bit could be argued that\b/i, /\bone could argue\b/i, /\bsome might say\b/i], strongFor: ['redteam', 'caveman'], softFor: ['cool-cousin', 'hype-queen', 'ghostwriter'] },
  { id: 201, name: 'Therapy-script clustering', terms: [/\bi hear that you'?re feeling\b/i, /\bthat'?s totally valid\b/i, /\byour feelings are valid\b/i, /\bit sounds like you need to\b/i, /\byou'?ve got this[!.]/i, /\byou'?re stronger than you know\b/i], strongFor: ['cool-cousin'], softFor: [] },
  { id: 4, name: 'Promotional language', terms: [/\bboasts (a|an|the)\b/i, /\bvibrant (community|culture|scene)\b/i, /\bgroundbreaking\b/i, /\bbreathtaking\b/i, /\brenowned\b/i, /\bnestled\b/i, /\bin the heart of\b/i], strongFor: ['redteam', 'caveman', 'ghostwriter'], softFor: ['cool-cousin', 'hype-queen'] },
  { id: 3, name: 'Shallow -ing analysis', terms: [/\bhighlighting that\b/i, /\bunderscoring (the|that|its|their)\b/i, /\bsymbolizing\b/i, /\bcultivating (a|the|deeper)\b/i, /\bencompassing\b/i], strongFor: ['redteam', 'caveman'], softFor: ['cool-cousin', 'hype-queen', 'ghostwriter'] },
  { id: 23, name: 'Filler phrases', terms: [/\bin order to\b/i, /\bdue to the fact that\b/i, /\bat this point in time\b/i, /\bin the event that\b/i, /\bit is important to note that\b/i, /\bhas the ability to\b/i], strongFor: ['redteam', 'caveman'], softFor: ['cool-cousin', 'hype-queen', 'ghostwriter'] },
  { id: 10, name: 'Repeated rule-of-three structure', terms: [/\b[\w-]+ [\w-]+, [\w-]+ [\w-]+, and [\w-]+ [\w-]+\b/], strongFor: ['redteam', 'caveman', 'hype-queen'], softFor: ['cool-cousin', 'ghostwriter'] },
];

export function lintAvatarResponse(text: string, persona: AvatarPersona): LintResult {
  const hits: PatternHit[] = [];
  for (const pattern of PATTERNS) {
    const isStrong = pattern.strongFor.includes(persona);
    const isSoft = pattern.softFor.includes(persona);
    if (!isStrong && !isSoft) continue;

    const matches: string[] = [];
    for (const regex of pattern.terms) {
      const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
      const found = text.match(new RegExp(regex.source, flags));
      if (found) matches.push(...found);
    }
    if (matches.length > 0) {
      hits.push({
        patternId: pattern.id,
        patternName: pattern.name,
        severity: isStrong ? 'strong' : 'soft',
        matches: [...new Set(matches)].slice(0, 4),
        occurrences: matches.length,
      });
    }
  }

  const totalOccurrences = hits.reduce((acc, hit) => acc + hit.occurrences, 0);
  const clustered = hits.length >= 2 || totalOccurrences >= 3;
  const score = clustered
    ? hits.reduce((acc, hit) => acc + (hit.severity === 'strong' ? 2 : 1) * hit.occurrences, 0)
    : 0;
  const severity: LintResult['severity'] = clustered ? 'warn' : 'clean';
  const summary = hits.length === 0
    ? `No clustered voice-pattern drift observed for persona "${persona}".`
    : clustered
      ? `Voice-density warning for persona "${persona}". Review the cluster; do not infer authorship or blindly replace every match.\n${hits.map((hit) => `[P${hit.patternId} ${hit.severity.toUpperCase()} ×${hit.occurrences}] ${hit.patternName}: ${hit.matches.join(', ')}`).join('\n')}`
      : `Isolated style marker observed for persona "${persona}"; no cluster and no rewrite required. ${hits.map((hit) => `[P${hit.patternId}] ${hit.patternName}: ${hit.matches.join(', ')}`).join(' ')}`;

  return {
    persona,
    hits,
    score,
    severity,
    summary,
    clustered,
    auditKind: 'voice-density',
    authorshipInference: 'not-supported',
  };
}

interface AvatarPromptParts { watchList: string; styleRules: string; }

const SHARED_AUDIT_RULES = [
  'This is a voice-quality audit, not an AI detector.',
  'Do not ban a word, punctuation mark, compound, list, or rhetorical structure because it appears once.',
  'Review clusters: repeated canned transitions, filler, authority theater, scripted empathy, staccato drama, or loaded vocabulary can signal persona drift when they accumulate.',
  'Preserve precise vocabulary and correct punctuation when they fit the sentence.',
  'Do not invent personal experience, certainty, opinions, or emotional texture just to sound human.',
].join('\n');

const AVATAR_PROMPT_PARTS: Record<AvatarPersona, AvatarPromptParts> = {
  redteam: {
    watchList: 'Watch for clusters of canned chatbot service language, significance inflation, authority tropes, staccato drama, aphorism formulas, filler, and repeated loaded vocabulary.',
    styleRules: ['Default to direct sentences.', 'Use "you" and "I" naturally.', 'State judgments only when evidence supports them.', 'When uncertain, say so plainly.', 'End on an action item, direct call-out, or genuine question when that fits the conversation.', 'Vary rhythm when the thought earns it.'].join('\n'),
  },
  'cool-cousin': {
    watchList: 'Watch for clusters of therapy-script language, chatbot service phrases, vague pep-talk closers, sycophancy, and repeated canned transitions.',
    styleRules: ['Warm but grounded and specific.', 'Share judgments without performing certainty.', 'Hedge only when genuinely uncertain.', 'Ask questions that are actually curious, not scripted therapy prompts.', 'Parenthetical asides and self-corrections are fine.', 'Mix short and longer sentences.'].join('\n'),
  },
  caveman: {
    watchList: 'Watch for clusters of abstract language, hedging, promotional copy, formulaic rhetoric, and repeated list structures that pull the voice away from simple concrete speech.',
    styleRules: ['One clear idea at a time.', 'Prefer short familiar words when they are accurate.', 'Use concrete nouns and physical verbs.', 'Sensory detail over vague abstraction.', 'If uncertain, say "don\'t know."', 'Keep the comic caveman rhythm without forcing every sentence into the same length.'].join('\n'),
  },
  'hype-queen': {
    watchList: 'Watch for clusters of vague superlatives, generic positive endings, promotional language, repeated rule-of-three structures, or emoji overload.',
    styleRules: ['Energy must attach to a real specific detail.', 'Vary sentence length.', 'Use emojis sparingly and only when they add tone.', 'End on a concrete invitation or call to action when appropriate.'].join('\n'),
  },
  ghostwriter: {
    watchList: 'Watch for clusters of canned signposting, vague positive conclusions, promotional copy, loaded vocabulary, repetitive cadence, or authority tropes.',
    styleRules: ['Active voice preferred when natural.', 'Specific nouns over vague abstraction.', 'Use punctuation according to the sentence, including em dashes when they genuinely fit.', 'End on the fact or scene beat when possible instead of restating the paragraph.'].join('\n'),
  },
};

export function buildAvatarSystemPrompt(persona: AvatarPersona, voiceSeed?: string): string {
  const parts = AVATAR_PROMPT_PARTS[persona];
  const seed = voiceSeed ?? VOICE_SEEDS[persona];
  return [
    `## Voice and style rules — persona: ${persona}`,
    '',
    '### Shared voice-integrity rules',
    SHARED_AUDIT_RULES,
    '',
    '### Patterns to self-audit as density, not a blacklist',
    parts.watchList,
    '',
    '### How this avatar sounds',
    parts.styleRules,
    '',
    '### Voice reference',
    'Here is a sample of how this avatar speaks. Match its rhythm, vocabulary, and attitude without copying claims of lived experience:',
    '',
    seed,
  ].join('\n');
}

export function composeAvatarPrompt(basePersonaPrompt: string, persona: AvatarPersona, voiceSeed?: string): string {
  return [basePersonaPrompt.trim(), '', buildAvatarSystemPrompt(persona, voiceSeed)].join('\n');
}
