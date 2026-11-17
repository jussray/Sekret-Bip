export type FigmaScreenKey =
  | 'welcome'
  | 'teenOnboarding'
  | 'parentOnboarding'
  | 'limitedMode'
  | 'parentLinkVerify'
  | 'emergencyAlert'
  | 'parentDoorbell'
  | 'manualReview'
  | 'suspended'
  | 'profile';

export interface FigmaFrameSpec {
  key: FigmaScreenKey;
  frameName: string;
  route: string;
  userType: 'teen' | 'parent' | 'shared';
  purpose: string;
  sections: readonly string[];
  privacyRules: readonly string[];
  navigationIn: readonly string[];
  navigationOut: readonly string[];
}

export const FIGMA_FRAME_SPECS: readonly FigmaFrameSpec[] = [
  {
    key: 'welcome',
    frameName: 'Bip / Auth / Welcome / Night',
    route: '/(auth)/welcome',
    userType: 'shared',
    purpose: 'Separate teen and parent entry without mixing trust roles.',
    sections: ['Brand art', 'Teen entry', 'Parent entry', 'Privacy promise', 'Sign in'],
    privacyRules: ['No social preview', 'No user discovery', 'Parents verify safety, not thoughts'],
    navigationIn: ['Splash'],
    navigationOut: ['Teen onboarding', 'Parent onboarding', 'Login'],
  },
  {
    key: 'teenOnboarding',
    frameName: 'Bip / Auth / Teen Onboarding / Night',
    route: '/(auth)/teen-onboarding',
    userType: 'teen',
    purpose: 'Create a private starter identity and explain Limited Mode.',
    sections: ['Progress', 'Nickname', 'Age band', 'Avatar', 'Room vibe', 'Privacy promise'],
    privacyRules: ['Real identity stays private', 'No searchable profile', 'Social remains locked until verification'],
    navigationIn: ['Welcome', 'Signup'],
    navigationOut: ['Limited Mode', 'Parent link verification'],
  },
  {
    key: 'parentOnboarding',
    frameName: 'Bip / Auth / Parent Onboarding / Night',
    route: '/(auth)/parent-onboarding',
    userType: 'parent',
    purpose: 'Explain support, verification, and parent boundaries.',
    sections: ['Trust charter', 'Can see', 'Cannot see', 'Relationship', 'Notification preferences'],
    privacyRules: ['No journals', 'No Voice Bip transcripts', 'No AI chats', 'No private memories'],
    navigationIn: ['Welcome', 'Signup'],
    navigationOut: ['Parent link verification', 'Parent dashboard'],
  },
  {
    key: 'limitedMode',
    frameName: 'Bip / Auth / Limited Mode / Night',
    route: '/(auth)/limited-mode',
    userType: 'teen',
    purpose: 'Show what is available privately and what verification unlocks.',
    sections: ['Status art', 'Available now', 'Unlocks later', 'Invite trusted adult', 'Progress'],
    privacyRules: ['Private tools remain available', 'No Circle posting', 'No Crew invites', 'No open messaging'],
    navigationIn: ['Teen onboarding', 'Login'],
    navigationOut: ['Parent link verification', 'Private Room', 'Pages', 'Calm'],
  },
  {
    key: 'parentLinkVerify',
    frameName: 'Bip / Auth / Parent Link Verify / Night',
    route: '/(auth)/parent-link-verify',
    userType: 'shared',
    purpose: 'Link a teen and trusted adult through a visible stateful flow.',
    sections: ['Invite code', 'Share link', 'Relationship', 'Consent', 'Status'],
    privacyRules: ['Verification unlocks social scope only', 'No private-content access'],
    navigationIn: ['Limited Mode', 'Parent onboarding'],
    navigationOut: ['Teen home', 'Parent dashboard', 'Waiting state'],
  },
  {
    key: 'emergencyAlert',
    frameName: 'Bip / Safety / Emergency Alert / Night',
    route: '/(safety)/emergency-alert',
    userType: 'teen',
    purpose: 'Provide a fast safety exit and guided support flow.',
    sections: ['Immediate actions', 'Confirmation', 'Support options', 'Grounding footer'],
    privacyRules: ['Private reflection stays private', 'Parent events contain summaries only'],
    navigationIn: ['Global safety action', 'Post menu', 'Profile menu'],
    navigationOut: ['Safety check-in', 'Resources', 'Safe confirmation'],
  },
  {
    key: 'parentDoorbell',
    frameName: 'Bip / Parent / Doorbell / Night',
    route: '/(parent)/doorbell',
    userType: 'parent',
    purpose: 'Show parent-safe safety and verification events.',
    sections: ['Timeline', 'Severity', 'What happened', 'What you can do', 'Privacy reminder'],
    privacyRules: ['No private teen content', 'No raw journals', 'No transcripts', 'No message bodies'],
    navigationIn: ['Parent dashboard', 'Parent notifications'],
    navigationOut: ['Event guidance', 'Support resources'],
  },
  {
    key: 'manualReview',
    frameName: 'Bip / Safety / Manual Review / Night',
    route: '/(safety)/manual-review',
    userType: 'teen',
    purpose: 'Hold the account in a calm safety review while keeping private support reachable.',
    sections: ['Status art', 'What is happening', 'What stays open', 'Estimated timing', 'Reach support'],
    privacyRules: ['Private reflection stays private', 'Review covers safety only, not thoughts', 'Comfort and support remain available'],
    navigationIn: ['Any gated route', 'Safety flag'],
    navigationOut: ['Comfort', 'Resources', 'Verified home'],
  },
  {
    key: 'suspended',
    frameName: 'Bip / Auth / Suspended / Night',
    route: '/(auth)/suspended',
    userType: 'teen',
    purpose: 'Pause access with care and offer a clear, humane appeal path.',
    sections: ['Status art', 'What this means', 'How to appeal', 'Support contact', 'Grounding footer'],
    privacyRules: ['No private content shown', 'Appeal is reviewed by a person', 'No punishment-first framing'],
    navigationIn: ['Any gated route', 'Emergency shutoff'],
    navigationOut: ['Appeal', 'Support resources'],
  },
  {
    key: 'profile',
    frameName: 'Bip / Profile / Teen / Night',
    route: '/(profile)/profile',
    userType: 'teen',
    purpose: 'Manage private account identity and safe social presentation separately.',
    sections: ['Profile card', 'Circle identities', 'Privacy badges', 'Highlights', 'Settings links'],
    privacyRules: ['Account identity remains private', 'Public identity uses safe display data only'],
    navigationIn: ['Account avatar', 'More'],
    navigationOut: ['Circle identity', 'Avatar', 'Room theme', 'Privacy'],
  },
] as const;
