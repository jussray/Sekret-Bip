# Se'kret Bip Password Recovery

## User journey

1. The user opens **Sign In** and selects **Forgot password?**.
2. The app validates the email format locally.
3. Supabase Auth receives `resetPasswordForEmail` with an explicit redirect URL.
4. The confirmation screen always uses account-neutral wording. It never confirms whether the email exists.
5. The email link opens `/reset-password` on web or the `sekret` app scheme on native.
6. The reset screen accepts only recovery evidence:
   - implicit-flow access and refresh tokens with `type=recovery`;
   - a PKCE `code` with `type=recovery`; or
   - Supabase's `PASSWORD_RECOVERY` auth event.
7. The user enters and confirms a password of at least eight characters.
8. `updateUser({ password })` changes the password.
9. The temporary recovery session signs out.
10. Sign In shows a confirmation and accepts the new password.

## Required Supabase Auth redirect URLs

Configure these under **Authentication → URL Configuration → Redirect URLs** for the hosted Se'kret Bip project:

```text
https://sekretbip.net/reset-password
sekret://reset-password
```

Development builds may generate an Expo development URL. Add only the exact temporary development redirect being tested; do not use an unrestricted wildcard in production.

The production Site URL should remain the canonical Se'kret Bip web origin:

```text
https://sekretbip.net
```

## Security boundaries

- The request confirmation does not reveal whether an account exists.
- Recovery tokens and passwords are never logged or written to application storage.
- Web recovery parameters are removed from browser history after the session is accepted.
- An ordinary signed-in session does not unlock the recovery form.
- Links with another auth type, missing credentials, malformed values, or Supabase errors fail closed.
- Password content is not trimmed or transformed.
- The recovery session is signed out after a successful password update.

## Email delivery

Supabase's built-in SMTP service is suitable only for early testing and has limited best-effort delivery. Before a public pilot, configure a production SMTP provider, sender identity, and branded recovery template.

The recovery email must preserve the supplied redirect target so the user returns to the Se'kret Bip reset route.

## Verification

Repository checks:

```bash
npm test
npm run type-check
npm run test:e2e
```

Playwright covers:

- Sign In → Forgot password navigation;
- blank and malformed email validation;
- fail-closed behavior without Supabase configuration;
- direct reset-page access without recovery evidence;
- post-reset Sign In confirmation;
- phone-width overflow guardrails.

A complete production proof still requires a controlled test account and a real received email:

1. request a reset from `https://sekretbip.net/login`;
2. confirm receipt in the controlled inbox;
3. open the link on web and on a native device;
4. set a temporary test password;
5. verify the recovery session signs out;
6. sign in with the new password;
7. rotate the test password again or delete the controlled account;
8. retain no email-link tokens in screenshots or logs.
