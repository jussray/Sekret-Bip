# Se'kret Bip Voice Pattern Audit v2.0

Density-based persona voice-quality audit for Se'kret Bip avatars. The historical filename remains `AI_PATTERN_LINTER.md` for compatibility, but this system is **not an AI-authorship detector**.

## Core rule

A word, phrase, punctuation mark, list structure, or rhetorical pattern is never treated as proof of AI authorship and never blocks a response by itself.

The audit looks for **clusters** that can weaken a persona's voice, such as repeated canned signposting, chatbot closers, scripted empathy, authority tropes, staccato drama, filler, or loaded vocabulary. Isolated markers remain clean. Clustered style drift produces a warning for review, not an automatic detector-evasion rewrite.

The audit also preserves valid punctuation and precise vocabulary. It must not invent personal experience, certainty, opinions, or emotional texture merely to make text appear human.

## Personas

| Persona | Tag | Primary voice-drift watch |
|---|---|---|
| Redteam | `redteam` | canned service language, authority tropes, staccato drama, aphorism formulas |
| Cool cousin | `cool-cousin` | scripted empathy, sycophancy, vague pep-talk closers |
| Caveman | `caveman` | abstraction, hedging, promotional copy, formulaic rhetoric |
| Hype queen | `hype-queen` | vague superlatives, generic positive endings, promotional clusters |
| Ghostwriter | `ghostwriter` | canned signposting, vague conclusions, repetitive cadence |

## Library location

```text
src/services/ai/aiPatternLinter.ts
```

The library intentionally has no CLI demo. Use the founder Control Room for local voice checks.

## Usage

```typescript
import {
  lintAvatarResponse,
  buildAvatarSystemPrompt,
  composeAvatarPrompt,
  VOICE_SEEDS,
} from '@/services/ai/aiPatternLinter';

const result = lintAvatarResponse(draftText, 'redteam');

if (result.severity === 'warn') {
  // A density cluster exists. Review the surrounding prose and rewrite only
  // what weakens the persona or truth. Do not blindly replace every match.
}

// `block` remains in the result type only for backward compatibility.
// Style-only findings do not emit it.

const systemPrompt = composeAvatarPrompt(myBasePrompt, 'redteam');
const customSeedPrompt = composeAvatarPrompt(myBasePrompt, 'redteam', VOICE_SEEDS.redteam);
const promptRulesOnly = buildAvatarSystemPrompt('cool-cousin');
```

Every result declares:

```text
auditKind = voice-density
authorshipInference = not-supported
```

## Control Room workflow

1. Open the existing founder Control Room.
2. Choose the quality tab.
3. Select a persona.
4. Paste an avatar draft.
5. Review whether style markers form a real cluster.
6. Preserve unaffected language and rewrite only spans that weaken voice, truth, or usefulness.

## Adding a new avatar

1. Add the tag to the `AvatarPersona` union type.
2. Add a voice seed to `VOICE_SEEDS`.
3. Add prompt parts to `AVATAR_PROMPT_PARTS`.
4. Add the persona to `AVATAR_PERSONAS` when it should participate in the shared voice-density audit.
5. Add only evidence-backed persona drift patterns. Do not create vocabulary or punctuation blacklists.
6. Update this document with the persona status and primary voice-drift patterns.
7. Verify TypeScript, focused contract tests, and the Control Room browser flow.
