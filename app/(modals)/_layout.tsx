/**
 * app/(modals)/_layout.tsx
 *
 * Modal screens group.
 * In Step 2b: AgeGate, SleepGate, and overlay screens
 * will be presented as modals via router.push() with
 * presentation: 'modal' in the Stack.Screen options.
 */
import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    />
  );
}
