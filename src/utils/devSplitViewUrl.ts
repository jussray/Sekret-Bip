/**
 * The founder Split View previews only routes on this application's origin.
 * Never accept a scheme, protocol-relative host, or browser backslash alias
 * from the editable route field. The synthetic origin is used only for URL
 * parsing; no network request is made.
 */
const PREVIEW_ORIGIN = 'https://split-view.invalid';
export const DEV_SPLIT_VIEW_SIDE_PARAM = 'bipDevSide';

export type SplitViewSide = 'teen' | 'parent';

// Malformed paths return a real failure result instead of silently claiming success.
function parseSameOriginPath(candidate: string): URL | null {
  try {
    const parsed = new URL(candidate, PREVIEW_ORIGIN);
    return parsed.origin === PREVIEW_ORIGIN ? parsed : null;
  } catch {
    return null;
  }
}

export function withDevSide(rawPath: string, side: SplitViewSide): string {
  const fallback = side === 'teen' ? '/' : '/dashboard';
  const candidate = typeof rawPath === 'string' ? rawPath.trim() : '';
  const sameOriginPath =
    candidate.startsWith('/')
    && !candidate.startsWith('//')
    && !/[\\\x00-\x1f\x7f]/.test(candidate);

  const target = (sameOriginPath ? parseSameOriginPath(candidate) : null)
    ?? new URL(fallback, PREVIEW_ORIGIN);

  // An existing query parameter must not override the trusted pane's side.
  target.searchParams.set(DEV_SPLIT_VIEW_SIDE_PARAM, side);
  return `${target.pathname}${target.search}${target.hash}`;
}
