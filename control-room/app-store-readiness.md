# App Store Readiness — Fastest Path

This is the ordered checklist to get Se'kret Bip through Apple App Store review.
Items are sorted by: **blocking risk first, effort second.**

---

## 🔴 Blockers (App will be rejected without these)

### 1. Age Rating + Privacy Nutrition Label
- App collects data from users under 13 → must be rated **17+** OR implement full COPPA compliance
- Privacy nutrition label in App Store Connect must declare: data linked to identity, data used to track
- **Action:** In App Store Connect → App Privacy → fill out every data category honestly

### 2. Sign in with Apple (mandatory if any social login exists)
- If Bip offers Google/Facebook/email login → Apple login is required
- **Action:** Add `expo-apple-authentication`, wire to Supabase auth provider

### 3. Account Deletion Flow
- Apple requires in-app account deletion since June 2023 — no exceptions
- Must delete: account, all messages, all memories, all companion history
- **Action:** Build deletion screen → wire to Supabase cascade delete → test end-to-end

### 4. Parental Consent (COPPA/COPPA+ if under 13)
- If any user can be under 13, app needs verifiable parental consent before data collection
- **Action:** Gate onboarding on age verification → if under 13, require parent email confirmation

### 5. AI / Chatbot Disclosure
- Apple requires AI-generated content to be disclosed to the user
- **Action:** Add one-time disclosure modal on first companion message: "Raylene is an AI companion."

---

## 🟡 High Risk (Likely rejection if missing)

### 6. Content Moderation Evidence
- Reviewers will test the companion with harmful prompts
- You need to demonstrate the safety filter intercepts them
- **Action:** Run `npm run test:safety` — all cases must pass before submission

### 7. Support URL + Privacy Policy URL
- Both required in App Store Connect — must be live URLs, not placeholder
- **Action:** Publish `sekretbip.net/privacy` and `sekretbip.net/support` before submission

### 8. Screenshots — All Required Sizes
- iPhone 6.9" (1320×2868) — 3 minimum
- iPhone 6.5" (1242×2688) — 3 minimum  
- iPad 12.9" (2048×2732) — if iPad supported
- **Action:** Run EAS Build → take screenshots on simulator at correct sizes

### 9. App Review Notes
- Reviewers will not guess how parental controls work — explain in the review notes
- **Action:** Write a clear walkthrough: "To test parent bridge: create parent account → add child → ..."
- Include a demo parent account + demo child account with credentials

---

## 🟢 Polish (Won't block, but flagged on second rejection)

### 10. Crashlytics / Error Monitoring live
- If the app crashes during review, you need a log
- **Action:** Add `@sentry/react-native` or Expo's built-in crash reporting

### 11. Onboarding skippable
- Apple reviewers skip onboarding — core functionality must be reachable without completing it
- **Action:** Add a "Skip" button on every onboarding step

### 12. Deep Link handling
- If app handles URLs (parent notifications → app), test cold-start deep link
- **Action:** `npx uri-scheme open sekretbip://companion --ios`

---

## Fastest Path Timeline

| Day | Action |
|-----|--------|
| **Day 1** | Account deletion flow + Sign in with Apple + AI disclosure modal |
| **Day 2** | Privacy policy live at sekretbip.net/privacy + App Store Connect privacy label |
| **Day 3** | Safety test suite green + App Review Notes written |
| **Day 4** | Screenshots captured at all required sizes |
| **Day 5** | EAS Production build submitted |
| **Day 6–10** | Apple review window (typically 24–48h first submission) |

**Realistic first submission: 5 days of focused work.**

---

## EAS Submit command

```bash
# Build production binary
eas build --platform ios --profile production

# Submit to App Store (after build completes)
eas submit --platform ios --latest
```

---

*Last updated: July 2026 — bip-os.md v1.0*
