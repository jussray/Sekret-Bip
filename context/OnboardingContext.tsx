/**
 * Compatibility entry point for historical imports and documentation.
 *
 * The canonical runtime context lives in `src/context/OnboardingContext.tsx`.
 * This path is preserved so prior work is not deleted while duplicate active
 * state machines remain impossible.
 */
export {
  OnboardingProvider,
  useOnboarding,
} from '../src/context/OnboardingContext';
