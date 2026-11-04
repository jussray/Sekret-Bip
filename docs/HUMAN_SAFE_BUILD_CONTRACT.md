# Human-Safe Build Contract

This repository is built for the human receiving the product, not merely for code completion.

## Core rule

A user-facing component, screen, route gate, or workflow must not resolve to silence when the system knows enough to show a state.

Do not use `return null` for loading, error, empty, denied, offline, unavailable, recovery, or transitional states that can block understanding or action.

## Required human-facing states

Every user-facing flow must provide the applicable state with clear language and an honest next action:

- loading or checking;
- success;
- empty;
- denied or permission-limited;
- offline or degraded;
- error;
- recovery, retry, back, or safe exit.

Use accessible status semantics and preserve the existing product language and visual system.

A spinner by itself is not a complete loading state when the user can be left waiting. Pair blocking progress with visible status copy and an accessible announcement that explains what the system is doing.

## Truthful readiness language

Labels such as `connected`, `live`, `healthy`, `available`, `complete`, and `passed` are runtime claims. Use them only when the named path has current authoritative evidence.

When a surface is scaffolded, planned, unavailable, denied, or not yet connected, say that directly. Never turn missing proof into success-colored copy, decorative health, or a numeric zero.

## Durable identity handoff

Identity state required after confirmation, reload, logout/login, or another-device use must cross an approved durable auth/profile boundary. Local cache may support recovery and offline UX, but it must not be the only authority for Teen versus Parent side, username, or another routing-critical account fact.

User-controlled signup metadata may carry approved self-descriptive fields such as account side and username. It must never grant or copy role, founder status, verification, authorization, moderation, or administrative permissions.

## Where `null` remains valid

`null` may remain in data, parser, service, storage, cache, and optional-value contracts when it explicitly means `not found`, `not configured`, or `not applicable`.

That contract must be typed or tested. A human-facing caller must translate it into a visible state whenever the absence affects comprehension, trust, safety, or the next action.

Optional decorative elements may render nothing only when their absence cannot hide progress, failure, denial, important data, or a required action.

## Safe implementation loop

### Observe

Inspect the active route, component, caller, exact branch head, existing tests, and rendered behavior. Distinguish a valid data sentinel from a blank-screen defect.

### Orient

Identify the human consequence. Red-team slow storage, missing configuration, denied access, stale sessions, empty data, malformed input, network failure, and narrow/mobile layouts.

### Decide

Choose the smallest proven repair. Prefer platform primitives and existing components. Do not add a dependency when plain React, React Native, browser, or server behavior is sufficient.

### Act

Render the missing state, preserve privacy and authorization boundaries, add a focused regression test, and run the exact applicable proof gates.

## Proof requirements

- Unit or source-contract proof for the state decision.
- Type and build proof where applicable.
- Playwright proof for changed web-rendered behavior.
- Controlled device proof for native-critical behavior.
- Exact-head CI evidence before merge.

A screenshot, design mock, or green unrelated workflow is not runtime proof.

## Red-team constraints

Never replace `null` mechanically across a repository. Blind replacement can expose private data, weaken denied states, invent false content, or break optional component contracts.

Never show a success state when the underlying operation is unknown or failed. Never hide an error merely to avoid a blank screen.

## Definition of done

The change is complete when the human can tell:

1. what the system is doing;
2. what happened;
3. whether their data or action is safe;
4. what they can do next;
5. how to recover when recovery is possible.

Build the smallest safe thing, prove it at the exact head, and leave no human staring into an empty frame.
