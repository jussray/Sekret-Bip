export type ResetMode = 'mind' | 'body';
export type ResetToolKind = 'guided' | 'breath' | 'route';
export type BreathAction = 'expand' | 'hold' | 'contract' | 'rest';

export interface GuidedResetStep {
  id: string;
  title: string;
  instruction: string;
  seconds: number;
  cue?: string;
}

export interface BreathPhase {
  label: string;
  seconds: number;
  action: BreathAction;
}

export interface ResetTool {
  id: string;
  mode: ResetMode;
  kind: ResetToolKind;
  emoji: string;
  title: string;
  description: string;
  durationLabel: string;
  steps?: GuidedResetStep[];
  breathPattern?: BreathPhase[];
  cycles?: number;
  routeKey?: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  emoji: string;
  seconds: number;
  restAfterSeconds: number;
  instruction: string;
  lowImpact: string;
  equipment?: string;
}

export interface WorkoutRoutine {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  intensity: 'light' | 'medium' | 'high';
  accent: string;
  exercises: WorkoutExercise[];
}

export const MIND_RESET_TOOLS: ResetTool[] = [
  {
    id: 'physiological-sigh',
    mode: 'mind',
    kind: 'breath',
    emoji: '🫧',
    title: 'Physiological Sigh',
    description: 'Two inhales, then one slow exhale when stress feels sharp.',
    durationLabel: '30 sec',
    cycles: 3,
    breathPattern: [
      { label: 'inhale', seconds: 2, action: 'expand' },
      { label: 'tiny top-up', seconds: 1, action: 'expand' },
      { label: 'long exhale', seconds: 6, action: 'contract' },
    ],
  },
  {
    id: 'panoramic-vision',
    mode: 'mind',
    kind: 'guided',
    emoji: '👀',
    title: 'Panoramic Vision',
    description: 'Soften your focus and let the room become wider than the problem.',
    durationLabel: '45 sec',
    steps: [
      { id: 'center', title: 'Pick one point', instruction: 'Look softly at one point in front of you. Do not stare hard.', seconds: 10 },
      { id: 'edges', title: 'Notice the edges', instruction: 'Without moving your eyes much, notice what is at the far left and right.', seconds: 15 },
      { id: 'whole-room', title: 'Take in the whole room', instruction: 'Let your vision stay wide while your shoulders drop.', seconds: 20 },
    ],
  },
  {
    id: 'four-seven-eight',
    mode: 'mind',
    kind: 'breath',
    emoji: '🌙',
    title: '4-7-8 Breath',
    description: 'A slower breathing pattern for settling down, especially at night.',
    durationLabel: '1 min',
    cycles: 3,
    breathPattern: [
      { label: 'inhale', seconds: 4, action: 'expand' },
      { label: 'hold', seconds: 7, action: 'hold' },
      { label: 'exhale', seconds: 8, action: 'contract' },
    ],
  },
  {
    id: 'bilateral-tap',
    mode: 'mind',
    kind: 'guided',
    emoji: '🤲🏾',
    title: 'Bilateral Tap',
    description: 'Alternate gentle taps to give your attention a steady rhythm.',
    durationLabel: '90 sec',
    steps: [
      { id: 'cross', title: 'Cross your arms', instruction: 'Place each hand on the opposite upper arm. Keep your grip loose.', seconds: 15 },
      { id: 'alternate', title: 'Tap left, tap right', instruction: 'Alternate slow, gentle taps. Nothing forceful. Just a steady rhythm.', seconds: 55, cue: 'left • right • left • right' },
      { id: 'notice', title: 'Pause and notice', instruction: 'Let your hands rest. Notice whether anything shifted, even one percent.', seconds: 20 },
    ],
  },
  {
    id: 'five-four-three-two-one',
    mode: 'mind',
    kind: 'guided',
    emoji: '🌿',
    title: '5-4-3-2-1 Grounding',
    description: 'Use your senses to come back to what is happening right now.',
    durationLabel: '2 min',
    steps: [
      { id: 'see', title: '5 things you see', instruction: 'Name five things you can see around you.', seconds: 25 },
      { id: 'feel', title: '4 things you feel', instruction: 'Notice four physical sensations, like your feet, clothes, or the chair.', seconds: 25 },
      { id: 'hear', title: '3 things you hear', instruction: 'Listen for three sounds, including quiet ones.', seconds: 25 },
      { id: 'smell', title: '2 things you smell', instruction: 'Notice two smells, or remember two familiar scents.', seconds: 20 },
      { id: 'taste', title: '1 thing you taste', instruction: 'Notice one taste in your mouth, or take a sip of water.', seconds: 20 },
      { id: 'return', title: 'You are here', instruction: 'Take one normal breath and look around again.', seconds: 5 },
    ],
  },
  {
    id: 'brain-dump',
    mode: 'mind',
    kind: 'route',
    emoji: '🧠',
    title: 'Brain Dump',
    description: 'Put every unfinished thought somewhere outside your head.',
    durationLabel: '3 min',
    routeKey: 'pages',
  },
];

export const BODY_RESET_TOOLS: ResetTool[] = [
  {
    id: 'shake-it-out',
    mode: 'body',
    kind: 'guided',
    emoji: '🫨',
    title: 'Shake It Out',
    description: 'A quick standing release for restless, buzzy energy.',
    durationLabel: '1 min',
    steps: [
      { id: 'hands', title: 'Shake your hands', instruction: 'Keep your wrists loose and shake out both hands.', seconds: 15 },
      { id: 'arms', title: 'Add your arms', instruction: 'Let the movement travel into your arms and shoulders.', seconds: 15 },
      { id: 'legs', title: 'Add your legs', instruction: 'Bounce lightly or alternate lifting your heels. Stay in control.', seconds: 20 },
      { id: 'settle', title: 'Slow it down', instruction: 'Make the movement smaller, then stand still and notice your feet.', seconds: 10 },
    ],
  },
  {
    id: 'somatic-body-tap',
    mode: 'body',
    kind: 'guided',
    emoji: '🥁',
    title: 'Body Tap',
    description: 'Gentle rhythmic tapping from shoulders to legs.',
    durationLabel: '2 min',
    steps: [
      { id: 'shoulders', title: 'Shoulders and arms', instruction: 'With loose hands, tap across your shoulders and down both arms.', seconds: 30 },
      { id: 'chest', title: 'Chest and sides', instruction: 'Tap lightly across your upper chest and along your sides. Skip any area that feels uncomfortable.', seconds: 25 },
      { id: 'hips', title: 'Hips and thighs', instruction: 'Tap around your hips and down the front and sides of your thighs.', seconds: 30 },
      { id: 'legs', title: 'Lower legs', instruction: 'Tap down your calves, then back up toward your knees.', seconds: 25 },
      { id: 'finish', title: 'Press and release', instruction: 'Place your hands on your shoulders, press gently, then let go.', seconds: 10 },
    ],
  },
  {
    id: 'progressive-muscle-release',
    mode: 'body',
    kind: 'guided',
    emoji: '💪🏾',
    title: 'Squeeze + Release',
    description: 'Tense one muscle group briefly, then notice the release.',
    durationLabel: '3 min',
    steps: [
      { id: 'hands', title: 'Hands', instruction: 'Make gentle fists for five seconds, then fully release.', seconds: 25 },
      { id: 'arms', title: 'Arms', instruction: 'Bend your elbows and gently tense your arms, then let them hang loose.', seconds: 25 },
      { id: 'shoulders', title: 'Shoulders', instruction: 'Lift your shoulders toward your ears, hold briefly, then drop them.', seconds: 25 },
      { id: 'face', title: 'Face and jaw', instruction: 'Scrunch your face gently, then soften your forehead and unclench your jaw.', seconds: 25 },
      { id: 'core', title: 'Core', instruction: 'Tighten your stomach gently, then let it soften without forcing your breath.', seconds: 25 },
      { id: 'legs', title: 'Legs', instruction: 'Press your feet into the floor and tense your legs, then release.', seconds: 25 },
      { id: 'whole-body', title: 'Whole body check', instruction: 'Notice the difference between tight and released.', seconds: 30 },
    ],
  },
  {
    id: 'spinal-wave',
    mode: 'body',
    kind: 'guided',
    emoji: '〰️',
    title: 'Spinal Wave',
    description: 'A slow standing or seated wave through your spine.',
    durationLabel: '90 sec',
    steps: [
      { id: 'setup', title: 'Get steady', instruction: 'Stand with soft knees or sit near the edge of a stable chair.', seconds: 15 },
      { id: 'round', title: 'Round slowly', instruction: 'Tuck your chin and let your upper back round a little at a time. Do not force the range.', seconds: 30 },
      { id: 'rise', title: 'Stack back up', instruction: 'Slowly rebuild your posture from the lower back upward, with your head last.', seconds: 30 },
      { id: 'repeat', title: 'One smaller wave', instruction: 'Repeat once more with less range and an easy breath.', seconds: 15 },
    ],
  },
  {
    id: 'vagus-hum',
    mode: 'body',
    kind: 'guided',
    emoji: '🎶',
    title: 'Hum It Down',
    description: 'Use a comfortable hum and long exhale to slow the pace.',
    durationLabel: '1 min',
    steps: [
      { id: 'inhale', title: 'Easy inhale', instruction: 'Breathe in normally through your nose.', seconds: 5 },
      { id: 'hum-one', title: 'Hum softly', instruction: 'Hum one comfortable note as you exhale. Stop before you strain.', seconds: 20 },
      { id: 'rest', title: 'Rest', instruction: 'Breathe normally and feel the vibration fade.', seconds: 10 },
      { id: 'hum-two', title: 'Hum again', instruction: 'Hum another easy note on a long, comfortable exhale.', seconds: 20 },
      { id: 'finish', title: 'Quiet finish', instruction: 'Let your mouth and jaw relax.', seconds: 5 },
    ],
  },
  {
    id: 'forward-fold',
    mode: 'body',
    kind: 'guided',
    emoji: '🌙',
    title: 'Forward Fold',
    description: 'A supported fold with soft knees and a longer exhale.',
    durationLabel: '1 min',
    steps: [
      { id: 'hinge', title: 'Fold with soft knees', instruction: 'Hinge forward only as far as comfortable. Rest your hands on your thighs, a counter, or a chair.', seconds: 20 },
      { id: 'breathe', title: 'Longer exhale', instruction: 'Keep your neck easy. Let each exhale be slightly longer than the inhale.', seconds: 30 },
      { id: 'rise', title: 'Come up slowly', instruction: 'Press through your feet and rise slowly. Pause if you feel lightheaded.', seconds: 10 },
    ],
  },
];

const exercise = (
  id: string,
  name: string,
  emoji: string,
  seconds: number,
  restAfterSeconds: number,
  instruction: string,
  lowImpact: string,
  equipment?: string,
): WorkoutExercise => ({ id, name, emoji, seconds, restAfterSeconds, instruction, lowImpact, equipment });

export const BODY_WORKOUT_ROUTINES: WorkoutRoutine[] = [
  {
    id: 'one-minute-release', emoji: '⚡', title: '1-Minute Energy Release',
    subtitle: 'Fast movement when sitting still is not happening.', durationLabel: '1 min',
    intensity: 'medium', accent: '#8B5CF6',
    exercises: [
      exercise('jumping-jacks', 'Jumping Jacks', '⭐', 20, 0, 'Move your arms overhead while your feet step or jump apart and together.', 'Step one foot out at a time instead of jumping.'),
      exercise('high-knees', 'High Knees', '🏃🏾', 20, 0, 'Run or march in place, lifting one knee at a time.', 'March slowly and keep the knees lower.'),
      exercise('squats', 'Squats', '🪑', 20, 0, 'Sit your hips back like reaching for a chair, then stand tall.', 'Use a smaller range or lightly hold a stable counter.'),
    ],
  },
  {
    id: 'three-minute-burn', emoji: '🔥', title: '3-Minute Burn It Off',
    subtitle: 'A short circuit for anger, nerves, or too much energy.', durationLabel: '3 min',
    intensity: 'high', accent: '#F97316',
    exercises: [
      exercise('jumping-jacks', 'Jumping Jacks', '⭐', 25, 6, 'Move your arms overhead while your feet jump apart and together.', 'Step side to side with the same arm motion.'),
      exercise('squats', 'Squats', '🪑', 25, 6, 'Sit your hips back, keep your chest lifted, then stand.', 'Use a shallow squat or a sit-to-stand from a stable chair.'),
      exercise('mountain-climbers', 'Mountain Climbers', '⛰️', 25, 6, 'From a strong plank, alternate driving one knee forward.', 'Place hands on a wall or counter and alternate knee drives.'),
      exercise('reverse-lunges', 'Reverse Lunges', '↩️', 25, 6, 'Step one foot back, lower only as far as comfortable, then switch.', 'Tap one foot behind you without lowering deeply.'),
      exercise('power-punches', 'Power Punches', '🥊', 25, 6, 'Stand balanced and punch forward across your body without locking your elbows.', 'Punch more slowly while keeping both feet planted.'),
      exercise('shakeout', 'Shakeout Finish', '🫨', 25, 0, 'Shake out your hands, shoulders, and legs while your breathing settles.', 'Sway gently side to side.'),
    ],
  },
  {
    id: 'five-minute-mood-lift', emoji: '🌤️', title: '5-Minute Mood Lift',
    subtitle: 'A balanced full-body circuit with a dance finish.', durationLabel: '5 min',
    intensity: 'medium', accent: '#EC4899',
    exercises: [
      exercise('jog-march', 'Jog or March', '🏃🏾', 40, 12, 'Jog or march in place while your arms swing naturally.', 'March at an easy pace.'),
      exercise('squats', 'Squats', '🪑', 40, 12, 'Sit your hips back and stand tall with control.', 'Use a shallow range or sit-to-stand.'),
      exercise('push-ups', 'Push-Ups', '💪🏾', 40, 12, 'Keep a straight line from shoulders through hips as you lower and press.', 'Use a wall or stable counter.'),
      exercise('reverse-lunges', 'Reverse Lunges', '↩️', 40, 12, 'Step back one side at a time and keep your front knee tracking over your foot.', 'Alternate toe taps behind you.'),
      exercise('plank', 'Plank', '🧱', 40, 12, 'Brace gently and keep your body long without holding your breath.', 'Use a wall, counter, or knees.'),
      exercise('dance-finish', 'Freestyle Finish', '💃🏾', 40, 0, 'Move however feels good: bounce, step, sway, or dance.', 'Sway seated or standing.'),
    ],
  },
  {
    id: 'seven-minute-power', emoji: '🔥', title: '7-Minute Power Mode',
    subtitle: 'The classic 12-move bodyweight circuit. It runs about eight minutes with rests.',
    durationLabel: 'about 8 min', intensity: 'high', accent: '#EF4444',
    exercises: [
      exercise('jumping-jacks', 'Jumping Jacks', '⭐', 30, 10, 'Jump your feet apart as your arms rise, then return with control.', 'Step side to side instead of jumping.'),
      exercise('wall-sit', 'Wall Sit', '🧱', 30, 10, 'Slide down a wall to a comfortable seated angle and keep breathing.', 'Stay higher on the wall or perform a shallow standing squat hold.', 'clear wall'),
      exercise('push-ups', 'Push-Ups', '💪🏾', 30, 10, 'Lower with a braced body, then press away from the floor.', 'Use a wall, stable counter, or knees.'),
      exercise('crunches', 'Abdominal Crunches', '〰️', 30, 10, 'Lift your shoulder blades gently while keeping your neck relaxed.', 'Keep one hand behind your head and use a smaller lift.'),
      exercise('step-ups', 'Step-Ups', '🪜', 30, 10, 'Step onto a low, stable surface and alternate the leading leg.', 'March in place. Never use a rolling or unstable chair.', 'low stable step'),
      exercise('squats', 'Squats', '🪑', 30, 10, 'Sit your hips back and stand tall with your knees tracking over your feet.', 'Use a shallow range or sit-to-stand.'),
      exercise('triceps-dips', 'Triceps Dips', '💪🏾', 30, 10, 'Use a stable chair or bench, keep shoulders down, and bend your elbows only as far as comfortable.', 'Use a wall triceps press or a small range.', 'stable chair or bench'),
      exercise('plank', 'Plank', '🧱', 30, 10, 'Brace gently and keep your body long without holding your breath.', 'Use a wall, counter, or knees.'),
      exercise('high-knees', 'High Knees', '🏃🏾', 30, 10, 'Run in place and drive one knee up at a time.', 'March with controlled knee lifts.'),
      exercise('lunges', 'Lunges', '↕️', 30, 10, 'Alternate lunges with a tall chest and controlled range.', 'Alternate backward toe taps.'),
      exercise('push-up-rotation', 'Push-Up + Rotation', '🔄', 30, 10, 'After each push-up, rotate into a side reach while keeping your hips controlled.', 'Use a wall push-up followed by a gentle reach.'),
      exercise('side-plank', 'Side Plank', '🌙', 30, 0, 'Hold one side, then switch halfway through. Keep your shoulder stacked.', 'Keep the lower knee down or use a wall side plank.'),
    ],
  },
];

export function getWorkoutRoutine(id: string | undefined): WorkoutRoutine {
  return BODY_WORKOUT_ROUTINES.find(routine => routine.id === id) ?? BODY_WORKOUT_ROUTINES[1];
}

export function guidedDurationSeconds(tool: ResetTool): number {
  return (tool.steps ?? []).reduce((sum, step) => sum + step.seconds, 0);
}

export function breathDurationSeconds(tool: ResetTool): number {
  const cycleSeconds = (tool.breathPattern ?? []).reduce((sum, phase) => sum + phase.seconds, 0);
  return cycleSeconds * (tool.cycles ?? 1);
}

export function workoutDurationSeconds(routine: WorkoutRoutine): number {
  return routine.exercises.reduce((sum, item) => sum + item.seconds + item.restAfterSeconds, 0);
}
