# Front-door variants

The public welcome screen is selected by `EXPO_PUBLIC_APP_VARIANT` and the existing age/auth routing in `app/index.tsx`.

- `teen` renders the Se’kret Bip Family visual preview using the exact founder-selected scrapbook poster: **Sy, Night, Suhana, Ja, Cloud**. The poster's SHA-256 is `ef5888960600669fa25922bb345cdcd1b5d4cccecb2a9ef578a616a7a8085971`.
- `parent` renders the separate Bip Jr. family welcome screen and retains its own existing artwork.

The Teen poster and its five display-only cropped portraits are bound in `constants/companionVisualCanon.ts`. The public `CanonCompanionShowcase` allows an accessible intro and hands **Enter** back to the existing onboarding gate. It does not unlock chat, journals, identity or private routes. A missing CDN image is a release blocker; do not quietly substitute new/generated character faces.

Private Teen Discover uses the same artwork for the four currently registered companion runtimes. Ja appears as an informational preview only until her runtime and isolated approved character reference are implemented. Reward/unlock thresholds and routes are unchanged.

The gallery respects reduced motion and applies only gentle decorative movement. Existing Bip Jr, authentication, consent, privacy, and parent/teen boundaries are preserved.

**Authority boundary:** The poster is founder-approved **UI artwork**, not evidence that an ensemble sheet is an approved isolated Higgsfield identity reference. Video generation still requires separate per-character approval, still review, cost preflight and founder authority. No provider calls or publication are authorized by this visual integration.
