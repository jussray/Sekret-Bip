import type { FounderProfile } from '@/services/founderAudit';

/**
 * Audit visibility alone never grants permission to send live Worker test shots.
 * The server must independently authorize every live request.
 */
export function isWorkerManagementProfile(profile: FounderProfile | null): boolean {
  return Boolean(
    profile
    && (profile.role === 'founder' || profile.role === 'admin')
    && profile.can_view_audits === true
    && profile.can_manage_app === true,
  );
}
