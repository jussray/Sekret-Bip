/**
 * Circle card timestamps: "just now", "12m ago", "3h ago", "2d ago",
 * then a plain date once a bip is older than a week.
 *
 * `now` is injected so the label is deterministic in tests and never
 * becomes an ID source. Future timestamps (clock skew) read as "just now".
 */
export function circleRelativeTime(createdAt: string, now: Date): string {
  const created = new Date(createdAt);
  const createdMs = created.getTime();
  if (Number.isNaN(createdMs)) return '';

  const diffSeconds = Math.max(0, Math.floor((now.getTime() - createdMs) / 1000));
  if (diffSeconds < 60) return 'just now';

  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return created.toLocaleDateString();
}
