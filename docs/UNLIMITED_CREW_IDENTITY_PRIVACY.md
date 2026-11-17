# Unlimited Bip Crew and Identity Privacy

Status: **Integrated in source and live Supabase contracts. Device and two-account verification remain.**

Owner: [Issue #432](https://github.com/jussray/Sekret-Bip/issues/432)

## Product rule

Bip Crew has no numeric member limit.

Unlimited does **not** mean open access. Every Crew relationship must still satisfy the application’s identity, privacy, consent, and safety standards.

## Identity matrix

| Relationship state | What another account may see | Crew content access |
|---|---|---|
| Stranger | Anonymous Circle nickname/avatar only | None |
| Pending invite | Anonymous account, Bip invite/status only | None |
| Accepted Crew | Private display name may appear inside Crew | Only content deliberately shared with that account |
| Blocked | Anonymous/no trusted identity | None; active shares revoked |
| Removed | Anonymous/no trusted identity | None; active shares revoked |

The Crew owner may keep a private label for a pending invite, such as “cousin” or “study friend.” That label is owner-only metadata and is never presented to another account as their identity.

Public Circle remains anonymous even after Crew acceptance. Accepted identity is context-limited to private Crew surfaces.

## Unlimited membership contract

Removed limits:

- legacy six-person client limit;
- legacy `crews.max_members` database constraint;
- legacy `circle_members` size trigger;
- ten-recipient Crew check-in limit.

Still enforced:

- permanent authenticated accounts only;
- no self-connections;
- one owner/member relationship row per pair;
- server-controlled invitation acceptance;
- completed account profiles before acceptance;
- blocked relationships cannot be accepted or shared with;
- every check-in recipient must be accepted Crew;
- recipient lists are deduplicated;
- check-in creation and share creation are atomic;
- no parent access path to Crew check-ins;
- preset encouragements only.

## Account identity contract

The client cannot submit another user’s real name during invite redemption.

`redeem_crew_invite` retains its historical `p_first_name` argument for compatibility but ignores it. The database resolves identity from `app_profiles.private_display_name` only after acceptance.

`get_crew_connection_profiles(uuid[])` is the only Crew identity-reveal path. It returns a profile only when:

- the caller has a permanent account;
- an accepted Crew relationship exists in either direction;
- no blocked relationship exists in either direction;
- the requested account completed profile setup.

Pending, blocked, removed, self, and stranger IDs return no row.

## Check-in sharing contract

`create_crew_check_in(date, emoji, note, uuid[])` accepts any number of distinct recipients.

Before writing anything, the database verifies every recipient:

- is not the caller;
- is directly accepted in the caller’s Crew;
- is not blocked in either direction.

If one recipient fails, the entire operation fails. The app never creates a check-in that was shared partly with valid accounts and partly with invalid accounts.

## Leave and block behavior

Either participant may call `set_crew_connection_status(other_user_id, status)` with `blocked` or `removed`.

The same database transaction:

- changes the relationship status;
- removes legacy membership rows;
- revokes active Crew check-in shares between the pair;
- removes legacy Crew-circle membership;
- causes the trusted identity RPC to stop returning the private name.

## App surfaces

### Crew connection manager

- always allows another invite;
- does not display `x / max` capacity;
- pending rows show `Anonymous account` and the invite code;
- owner-only labels are explicitly marked private;
- accepted rows use the trusted identity RPC;
- block and remove states are persisted.

### Crew accountability

- lists all accepted direct Crew members;
- supports select-all for any number of accepted members;
- uses the atomic check-in RPC;
- resolves incoming sender names only through the trusted identity RPC;
- lets either recipient leave or block from the received-check-in surface;
- keeps Founder Preview samples local and labeled.

## Verification still required

Before status moves from `integrated` to `verified`:

1. Create two permanent test accounts with completed profiles.
2. Confirm both appear anonymous before acceptance.
3. Redeem an invite and confirm the trusted name appears only in Crew.
4. Confirm Public Circle remains anonymous.
5. Create more than fifteen accepted test members or fixture accounts and verify no numeric cap.
6. Share one check-in with more than ten accepted members.
7. Add one invalid recipient and confirm the entire check-in transaction fails.
8. Block from the invited-member side and confirm name/content access disappears immediately.
9. Repeat with remove/leave.
10. Run iOS and Android accessibility/layout checks with a long Crew list.
