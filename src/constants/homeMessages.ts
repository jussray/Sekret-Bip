/**
 * HOME_MESSAGES
 * Rotating ambient messages shown on the dashboard/home screen.
 * Previously inlined in app/index.tsx.
 */
export const HOME_MESSAGES: string[] = [
  "Don't stay up carrying the whole world tonight.",
  'Rest is productive too.',
  'You deserve softness too.',
  'Heavy days do not define you.',
  'Your mind deserves rest.',
  'Breathe slowly tonight.',
  'You made it through today.',
];

/** Returns the message at the given index, wrapping around safely */
export function getHomeMessage(index: number): string {
  return HOME_MESSAGES[index % HOME_MESSAGES.length];
}
