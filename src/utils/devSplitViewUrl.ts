/**
 * The founder Split View previews only routes on this application's origin.
 * Never accept a scheme, protocol-relative host, or browser backslash alias
 * from the editable route field. The synthetic origin is used only for URL
 * parsing; no network request is made.
 */
const PREVIEW_ORIGIN = 'https://split-view.invalid';
export const DEV_SPLIT_VIEW_SIDE_PARAM = 'bipDevSide';

export type SplitViewSide = 'teen' | 'parent';

export function withDevSide(rawPath: string, side: SplitViewSide): string {
  const fallback = side === 'teen' ? '/' : '/dashboard';
  const candidate = typeof rawPath === 'string' ? rawPath.trim() : '';
  const sameOriginPath =
    candidate.startsWith('/')
    && !candidate.startsWith('//')
    && !/[\\\x00-\x1f\x7f]/.test(candidate);

  let target: URL;
  try {
    target = new URL(sameOriginPath ? candidate : fallback, PREVIEW_ORIGIN);
    if (target.origin !== PREVIEW_ORIGIN) target = new URL(fallback, PREVIEW_ORIGIN);
  } catch {
    target = new URL(fallback, PREVIEW_ORIGIN);
  }

  // An existing query parameter must not override the trusted pane's side.
  target.searchParams.set(DEV_SPLIT_VIEW_SIDE_PARAM, side);
  return `${target.pathname}${target.search}${target.hash}`;
}
