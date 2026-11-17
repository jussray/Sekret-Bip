import { Platform } from 'react-native';

export const DEV_SPLIT_VIEW_SIDE_PARAM = 'bipDevSide';

/**
 * Split View loads two same-origin iframes that would otherwise share the
 * founder's real AsyncStorage-backed userSide, so both panes end up racing
 * to the same room. Each pane appends ?bipDevSide=teen|parent to its iframe
 * src; route gates read it here to decide which side that pane renders,
 * without touching the persisted userSide.
 */
export function getDevSplitViewSideOverride(): 'teen' | 'parent' | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const side = new URLSearchParams(window.location.search).get(DEV_SPLIT_VIEW_SIDE_PARAM);
  return side === 'teen' || side === 'parent' ? side : null;
}
