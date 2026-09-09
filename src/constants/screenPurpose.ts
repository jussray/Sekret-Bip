export type AppSide = 'teen' | 'parent';

export type PrimarySurface =
  | 'room'
  | 'pages'
  | 'calm'
  | 'voicebip'
  | 'circle'
  | 'more'
  | 'bridge';

export interface ScreenPurpose {
  id: PrimarySurface;
  side: AppSide;
  title: string;
  purpose: string;
  owns: string[];
  mustNotBecome: string[];
}

export const SCREEN_PURPOSES: ScreenPurpose[] = [
  { id: 'room', side: 'teen', title: 'Room', purpose: 'Visual home base and companion presence.', owns: ['time/weather atmosphere', 'mood check-in', 'continue last activity', 'feature hotspots'], mustNotBecome: ['a second dashboard', 'a journal editor', 'a chat transcript'] },
  { id: 'pages', side: 'teen', title: 'Pages', purpose: 'Journal and notebook hub.', owns: ['typed entries', 'voice attachments', 'prompts', 'saved history', "entry-linked Se'kret replies"], mustNotBecome: ['a full companion chat', 'a comfort hub', 'a duplicate home screen'] },
  { id: 'calm', side: 'teen', title: 'Calm', purpose: 'Comfort tools and regulation exercises.', owns: ['breathing', 'grounding', 'Cloud Thoughts', 'comfort cards', 'wind-down tools'], mustNotBecome: ['a journal editor', 'a chat screen', 'a social feed'] },
  { id: 'voicebip', side: 'teen', title: 'Voice Bip', purpose: 'Voice-first talk mode.', owns: ['recording', 'playback', 'transcript', 'spoken companion reply', 'save to Pages'], mustNotBecome: ['Pages with a microphone', 'a text chat clone', 'a calm dashboard'] },
  { id: 'circle', side: 'teen', title: 'Circle', purpose: 'Teen community, friends, and Crew.', owns: ['public anonymous posts', 'accepted Crew', 'reactions', 'moderation'], mustNotBecome: ['parent communication', 'private journaling', 'family messaging'] },
  { id: 'bridge', side: 'teen', title: 'Bridge', purpose: 'Private teen-to-parent connection.', owns: ['Doorbell signals', 'S2Tell shares', 'parent replies', 'shared moments', 'connection history'], mustNotBecome: ['Circle', 'public community', 'parent surveillance'] },
  { id: 'more', side: 'teen', title: 'More', purpose: 'Feature drawer, account tools, and settings.', owns: ['Profile', 'Bippin 2', 'Parent Link', 'Safety', 'Settings', 'Help and legal'], mustNotBecome: ['a second home', 'a flat junk drawer', 'a duplicate feature screen'] },
  { id: 'room', side: 'parent', title: 'Parent Room', purpose: 'Parent home base and calm starting point.', owns: ['parent mood check-in', 'return shortcuts', 'Bridge presence', 'time/weather atmosphere'], mustNotBecome: ['a monitoring dashboard', 'a copy of Teen Room', 'a private teen activity feed'] },
  { id: 'pages', side: 'parent', title: 'Parent Pages', purpose: 'Parent-owned notebook and reflection hub.', owns: ['letters', 'private journal', 'repair notes', 'wins', 'future letters', 'Bridge reply drafts'], mustNotBecome: ['teen journal access', 'a companion chat clone', 'Bridge inbox'] },
  { id: 'calm', side: 'parent', title: 'Parent Calm', purpose: 'Pause-before-replying and parent regulation tools.', owns: ['breathing', 'grounding', 'reply reset', 'wind-down', 'support prompts'], mustNotBecome: ['Teen Calm copied word-for-word', 'a journal screen', 'a dashboard'] },
  { id: 'voicebip', side: 'parent', title: 'Parent Voice Bip', purpose: 'Voice reflection and optional spoken Bridge replies.', owns: ['private recording', 'playback', 'transcript', 'reflection reply', 'save to Parent Pages'], mustNotBecome: ['teen voice-note access', 'a text chat clone', 'a second journal editor'] },
  { id: 'circle', side: 'parent', title: 'Parent Circle', purpose: 'Parent-to-parent community and support.', owns: ['parent community posts', 'reactions', 'resources', 'moderation', 'anonymous identity'], mustNotBecome: ['teen Circle access', 'Bridge', 'family monitoring'] },
  { id: 'bridge', side: 'parent', title: 'Parent Bridge', purpose: 'Private parent-to-teen connection and replies.', owns: ['Doorbell signals', 'S2Tell shares', 'parent replies', 'shared moments', 'connection history'], mustNotBecome: ['Parent Circle', 'teen activity tracking', 'journal access'] },
  { id: 'more', side: 'parent', title: 'Parent More', purpose: 'Parent feature drawer, connection management, and settings.', owns: ['Parent Profile', 'Parent Circle', 'Settings', 'Resources', 'Parent Link', 'Help and legal'], mustNotBecome: ['a second Parent Room', 'Bridge', 'a flat junk drawer'] },
];

export interface FeatureDrawerItem { emoji: string; label: string; route: string; description: string; }
export interface FeatureDrawerGroup { title: string; items: FeatureDrawerItem[]; }

export const TEEN_MORE_GROUPS: FeatureDrawerGroup[] = [
  { title: 'RETURN TO YOUR CORE TOOLS', items: [
    { emoji: '🎙️', label: 'Voice Bip', route: 'voiceBip', description: 'Talk out loud and hear your companion respond.' },
    { emoji: '🌉', label: 'Bridge', route: 'bridge', description: 'Share intentionally with your linked parent or guardian.' },
    { emoji: '👤', label: 'Profile', route: 'profile', description: 'Your private identity and public Circle identity.' },
    { emoji: '📖', label: 'History', route: 'history', description: 'Your saved conversations and journal timeline.' },
  ] },
  { title: 'GROWTH TOOLS', items: [
    { emoji: '🌱', label: 'Bippin 2', route: 'bippin2', description: 'Body, emotions, points, and growth at your own pace.' },
    { emoji: '✅', label: 'Chores', route: 'chores', description: 'Tasks your parent set up, when a trusted connection exists.' },
    { emoji: '🔭', label: 'Discover', route: 'discover', description: 'Explore companions, topics, and experiences.' },
    { emoji: '⭐', label: 'Bip Points', route: 'points', description: 'See the private receipts from showing up for yourself.' },
  ] },
  { title: 'ACCOUNT & SAFETY', items: [
    { emoji: '🔗', label: 'Parent Link', route: 'parent-link-verify', description: 'Manage verification and the trusted connection.' },
    { emoji: '🧠', label: 'Memory & Continuity', route: 'l4', description: 'See what Bip remembers now and what stays protected until long-term memory is ready.' },
    { emoji: '⚙️', label: 'Settings', route: 'settings', description: 'Theme, companion, privacy, notifications, and account.' },
    { emoji: '🛟', label: 'Help & Safety', route: 'resources', description: 'Support, safety tools, and legal information.' },
    { emoji: '🚪', label: 'Sign out', route: 'logout', description: 'Securely sign out and clear private device state.' },
  ] },
];

export const PARENT_MORE_GROUPS: FeatureDrawerGroup[] = [
  { title: 'PARENT CONNECTION', items: [
    { emoji: '🌉', label: 'Bridge', route: 'parent-bridge', description: 'Doorbell signals, S2Tell shares, replies, and shared moments.' },
    { emoji: '🤝', label: 'Connection Hub', route: 'parent-connection', description: 'Repair, boundaries, and relationship tools.' },
    { emoji: '🌙', label: 'Pause Before Replying', route: 'calm', description: 'Regulate first, then return to Bridge.' },
  ] },
  { title: 'YOUR SUPPORT SPACE', items: [
    { emoji: '✅', label: 'Approvals', route: 'approvals', description: 'Review chore submissions and reward requests.' },
    { emoji: '🎙️', label: 'Parent Voice Bip', route: 'voicereflect', description: 'Private voice reflection and reply drafts.' },
    { emoji: '🌿', label: 'Growth Tools', route: 'growth', description: 'Repair, voice reflect, cycle awareness, and conversation guides.' },
    { emoji: '🤝', label: 'Parent Circle', route: 'circle', description: 'Parent-to-parent support and community.' },
  ] },
  { title: 'ACCOUNT & RESOURCES', items: [
    { emoji: '👤', label: 'Parent Profile', route: 'profile', description: 'Your parent-side identity and preferences.' },
    { emoji: '🔗', label: 'Parent Link', route: 'parent-link', description: 'Manage the trusted teen connection.' },
    { emoji: '⚙️', label: 'Settings', route: 'settings', description: 'Privacy, notifications, and account.' },
    { emoji: '📚', label: 'Resources', route: 'resources', description: 'Guides, support, and legal information.' },
    { emoji: '🚪', label: 'Sign out', route: 'logout', description: 'Securely sign out and clear private device state.' },
  ] },
];
