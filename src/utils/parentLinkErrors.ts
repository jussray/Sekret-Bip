export type ParentLinkErrorCode =
  | 'not_configured'
  | 'not_authenticated'
  | 'invalid_code'
  | 'expired_or_used'
  | 'not_eligible'
  | 'active_link_exists'
  | 'cannot_link_self'
  | 'invalid_response'
  | 'server_error';

export interface ParentLinkFailure {
  code: ParentLinkErrorCode;
  message: string;
}

const RPC_ERROR_MAP: ReadonlyArray<{
  fragment: string;
  failure: ParentLinkFailure;
}> = [
  {
    fragment: 'invalid_invite_code',
    failure: { code: 'invalid_code', message: 'Enter the full eight-character code.' },
  },
  {
    fragment: 'invite_not_found',
    failure: { code: 'invalid_code', message: 'That code was not found. Ask your teen for a fresh code.' },
  },
  {
    fragment: 'invite_not_pending',
    failure: { code: 'expired_or_used', message: 'That code has expired or was already used. Ask your teen for a new one.' },
  },
  {
    fragment: 'cannot_link_self',
    failure: { code: 'cannot_link_self', message: 'A teen account cannot approve its own invite code.' },
  },
  {
    fragment: 'completed teen profile required',
    failure: { code: 'not_eligible', message: 'Finish the teen profile before creating a parent invite code.' },
  },
  {
    fragment: 'teen account is not eligible to create an invite',
    failure: { code: 'not_eligible', message: 'This teen account cannot create an invite while its verification is restricted.' },
  },
  {
    fragment: 'active parent link must be revoked first',
    failure: { code: 'active_link_exists', message: 'This teen already has an active parent link. Revoke it before creating another code.' },
  },
  {
    fragment: 'unauthorized',
    failure: { code: 'not_authenticated', message: 'Sign in with a permanent Bip account and try again.' },
  },
  {
    fragment: 'authentication required',
    failure: { code: 'not_authenticated', message: 'Sign in with a permanent Bip account and try again.' },
  },
];

export function mapParentLinkRpcError(message?: string | null): ParentLinkFailure {
  const normalized = message?.trim().toLowerCase() ?? '';
  if (!normalized) {
    return { code: 'server_error', message: 'The secure connection could not be completed. Try again.' };
  }

  for (const entry of RPC_ERROR_MAP) {
    if (normalized.includes(entry.fragment)) return entry.failure;
  }

  return { code: 'server_error', message: 'The secure connection could not be completed. Try again.' };
}
