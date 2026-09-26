# bip-performance

## 5W1H operating contract

Before planning, editing, or claiming completion, establish and state:

- **Who** — the requester, decision owner, affected users, data subjects, and execution authority.
- **What** — the requested outcome, concrete deliverable, non-goals, and existing work that must be preserved.
- **Where** — the exact repository, branch, environment, runtime, route, service, table, or provider boundary involved.
- **When** — the current lifecycle or release state, required ordering, timing constraint, and rollback window.
- **Why** — the user problem and verified evidence that justify the work.
- **How** — the smallest safe implementation, required permissions, verification evidence, rollout, and rollback.

Inspect repository and runtime truth for unknowns. Ask the user only when a missing answer would materially change the safe solution or authority. Re-run 5W1H after red-team/OODA findings change the plan. Finish by mapping the result, evidence, remaining blocker, and next owner back to these six questions.


## Trigger
Any PR that adds new screens, hooks, Supabase queries, animations, asset imports,
or dependencies. Also run on any PR touching `worker/sekret-reply.ts` (AI response latency).

## Render Performance

### Unnecessary Re-renders
- [ ] New components that receive object/array props use `React.memo` or stable references
- [ ] No new inline object/array literals passed as props (`style={{ }}` in render = re-render)
- [ ] Context consumers are split — a component subscribing to a large context re-renders on any change
- [ ] `useEffect` dependency arrays are correct — missing deps cause stale closures, extra deps cause loops

### List Performance
- [ ] All lists use `FlatList` or `FlashList` — never `ScrollView` with `.map()` for variable-length data
- [ ] `keyExtractor` returns a stable, unique key (not array index)
- [ ] `getItemLayout` provided for fixed-height lists
- [ ] Heavy list items are wrapped with `React.memo`

### Animation
- [ ] Animations use `react-native-reanimated` (runs on UI thread) not Animated API for complex sequences
- [ ] No `setState` called inside an animation loop
- [ ] Particle/confetti effects are capped and cleaned up on unmount

## Bundle Size
- [ ] No new dependency added without checking its size (`npx bundlephobia` or import cost)
- [ ] Large libraries (e.g., moment.js, lodash) replaced with tree-shakeable alternatives
- [ ] Images/assets are compressed — no unoptimized PNGs over 500KB in the bundle
- [ ] Dynamic imports used for heavy screens not needed at startup

## Supabase Query Performance
- [ ] No SELECT * queries — always specify columns
- [ ] Queries on large tables have a corresponding index in the migration
- [ ] Realtime subscriptions are scoped narrowly — no full-table subscriptions
- [ ] Subscriptions are unsubscribed on component unmount
- [ ] No N+1 pattern: loading a list then fetching details per item in separate queries

## Startup Performance
- [ ] No synchronous heavy computation in the app entry point or root layout
- [ ] `app/_layout.tsx` does not block render with network calls
- [ ] Fonts are loaded with `expo-font` and awaited before rendering — but loading screen
  should appear immediately, not a blank screen
- [ ] Splash screen hides only after critical data is ready, not before

## Worker / AI Latency
- [ ] `worker/sekret-reply.ts` changes do not add synchronous blocking before streaming begins
- [ ] Streaming is used for AI replies — never wait for full response before showing output
- [ ] No new Supabase query added inside the AI request path without a timeout guard

## Output
Return: APPROVED | FLAGGED
- FLAGGED: component/file + pattern + estimated impact (High/Medium/Low)
- High: causes jank, blank screens, or crashes under load
- Medium: causes unnecessary work, detectable slowdown
- Low: minor inefficiency, low user impact
