# Se'kret Bip auth.md

This discovery document is for passive software agents that need to understand Se'kret Bip authentication boundaries before making a request.

## Agent audience

Se'kret Bip does not currently support external agents acting as a user, autonomous agent identities, or unattended agent account creation. User credentials and private account data must not be delegated to an external agent.

## Registration and provisioning

- Human user registration URI: `https://sekretbip.net/signup`
- Human user sign-in URI: `https://sekretbip.net/login`
- Human registration method: email and password through the Se'kret Bip user flow, followed by email confirmation and the applicable onboarding requirements.
- Agent registration endpoint: none.
- Agent provisioning method: none.
- Passive discovery clients must not submit registration or authentication requests just to test this document.

## Credential use

- Protected API resource: `https://api.sekretbip.net`
- No public agent credential is currently issued.
- Supabase user session access tokens are user credentials and must not be shared with or delegated to external agents.
- Account passwords must not be sent to `api.sekretbip.net` or to an external agent.
- Shared application/backend credentials are implementation details and are not public agent-registration credentials.

## Agent registration methods

No agent registration method is currently supported. `human_email_password` describes the human account-registration flow only; it does not create an agent identity or grant an agent authority to act for that account.

Se'kret Bip does not currently advertise OAuth dynamic client registration, ID-JAG registration, verified-email assertion registration, or anonymous agent credentials.

## OAuth discovery status

Se'kret Bip does not currently publish OAuth Protected Resource Metadata or OAuth Authorization Server Metadata for agent registration. Supabase user authentication is used by the application, but that is not a public agent authorization or delegation service.

When a scoped, consented, revocable agent authorization flow exists, this document can advertise it together with authoritative `/.well-known/oauth-protected-resource` and authorization-server metadata.
