import {
  TEEN_COMPANION_POSES,
  type TeenCompanion,
  type TeenCompanionPose,
} from '@/types/companions';

/**
 * Se'kret Bip Companion Production Pipeline v2 — spec encoded as code.
 *
 * This module is the single source of truth that an external image generator
 * (or a human) feeds from when expanding the companion cast. It mirrors the v2.0
 * pipeline spec: batch order, per-pose intent, and the locked-identity prompt.
 *
 * Generation itself happens outside this repo; the repo owns storage, manifest,
 * wiring, and the prompts that keep every pose on-model.
 */

export const PIPELINE_VERSION = '2.0';

/** Human-readable display names for the locked teen companions. */
export const COMPANION_DISPLAY_NAMES: Record<TeenCompanion, string> = {
  raylene: 'Suhana',
  rylane: 'Sy',
  night: 'Night',
};

/**
 * Short intent text per pose, used to fill the generation prompt so each pose
 * reads clearly and consistently. Covers every pose across all three companions.
 */
export const POSE_DESCRIPTIONS: Record<string, string> = {
  neutral: 'standing relaxed and centered, arms natural at the sides, calm neutral expression',
  happy: 'upbeat and smiling, light energy in the posture, welcoming body language',
  thinking: 'a thoughtful, considering pose — hand near chin or head tilted, reflective look',
  listening: 'attentive and present, leaning slightly in, an open, receptive expression',
  writing: 'mid-journaling — holding a notebook or pen, focused downward, engaged',
  encouraging: 'warm and motivating, a supportive open-handed gesture, reassuring expression',
  sleepy: 'drowsy and soft — relaxed shoulders, gentle eyes, a quiet end-of-day calm',
  calm: 'grounded and steady, even breathing posture, a settled, easy expression',
  headphones: 'wearing headphones, steady and in-the-zone, late-night focused energy',
  comfort: 'offering comfort — soft, steady presence, a gentle reassuring stance',
  window: 'standing by a window looking out, contemplative, quiet introspection',
  rain: 'quiet rainy-day mood, calm and cozy, a reflective steadiness',
};

export interface CompanionBatchMember {
  companion: TeenCompanion;
  pose: string;
}

export interface CompanionBatch {
  id: number;
  name: string;
  /** True once the batch's assets are locked/approved in the repo. */
  complete: boolean;
  members: CompanionBatchMember[];
}

const sharedPose = (pose: string): CompanionBatchMember[] =>
  (['raylene', 'rylane', 'night'] as const).map((companion) => ({ companion, pose }));

/**
 * Ordered production batches from the v2.0 spec. Shared poses are generated and
 * reviewed together across all three companions before the next batch begins;
 * Batch 5 holds each companion's signature poses (run only after shared poses pass).
 */
export const COMPANION_BATCHES: CompanionBatch[] = [
  { id: 0, name: 'Identity Lock', complete: true, members: sharedPose('neutral') },
  { id: 1, name: 'Happy Pose', complete: false, members: sharedPose('happy') },
  { id: 2, name: 'Thinking Pose', complete: false, members: sharedPose('thinking') },
  { id: 3, name: 'Listening Pose', complete: false, members: sharedPose('listening') },
  { id: 4, name: 'Writing Pose', complete: false, members: sharedPose('writing') },
  {
    id: 5,
    name: 'Signature Character Poses',
    complete: false,
    members: [
      { companion: 'raylene', pose: 'encouraging' },
      { companion: 'raylene', pose: 'sleepy' },
      { companion: 'rylane', pose: 'encouraging' },
      { companion: 'rylane', pose: 'calm' },
      { companion: 'night', pose: 'headphones' },
      { companion: 'night', pose: 'comfort' },
      { companion: 'night', pose: 'window' },
      { companion: 'night', pose: 'rain' },
    ],
  },
];

/**
 * Locked-identity prompt template from the spec. `{CHARACTER}` and `{POSE}` are
 * filled by buildCompanionPrompt(); the strict requirements keep every pose
 * indistinguishable from the canonical neutral references.
 */
export const CLAUDE_PROMPT_TEMPLATE = `Create a full-body illustration of {CHARACTER} from the Se'kret Bip companion cast in a {POSE_NAME} pose: {POSE_DESCRIPTION}.

Strict requirements:
- Match the exact face shape, skin tone, hair texture, hairstyle, age, and proportions from the official neutral reference image.
- Preserve the exact outfit and clothing details.
- Maintain the same illustration style, line weight, and rendering style.
- Character must be centered, full-body visible (hair to shoes), and facing forward or slightly angled depending on pose.
- No background elements. Use transparent or plain white background only.
- No text, labels, or additional objects.
- One character only.

Style consistency is critical. This must look like it belongs in the same set as the existing Suhana, Night, and Sy neutral images.`;

/**
 * Builds the ready-to-paste generation prompt for one companion + pose, with the
 * locked-identity requirements baked in. Throws if the pose is not valid for the
 * companion so the pipeline can't request an off-spec asset.
 */
export const buildCompanionPrompt = <C extends TeenCompanion>(
  companion: C,
  pose: TeenCompanionPose<C>,
): string => {
  const valid = TEEN_COMPANION_POSES[companion] as readonly string[];
  if (!valid.includes(pose)) {
    throw new Error(`Pose "${pose}" is not defined for companion "${companion}".`);
  }

  return CLAUDE_PROMPT_TEMPLATE.replace('{CHARACTER}', COMPANION_DISPLAY_NAMES[companion])
    .replace('{POSE_NAME}', pose)
    .replace('{POSE_DESCRIPTION}', POSE_DESCRIPTIONS[pose] ?? pose);
};
