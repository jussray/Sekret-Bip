import { TEEN_ROUTES } from '@/teen/routes';
import { PARENT_ROUTES } from '@/parent/routes';

export const SIDE_ROOTS = {
  teen: TEEN_ROUTES.room,
  parent: PARENT_ROUTES.room,
} as const;

function missingRoute(side: 'teen' | 'parent', key: string): string {
  if (__DEV__) {
    console.warn(`[navigation] Unknown ${side} route key: ${key}. Opening More instead.`);
  }
  return side === 'parent' ? PARENT_ROUTES.more : TEEN_ROUTES.more;
}

export function routeForSide(side: 'teen' | 'parent' | null | undefined, key: string): string {
  if (key === 'logout') return '/(auth)/logout';

  if (side === 'parent') {
    const parentMap: Record<string, string> = {
      home: PARENT_ROUTES.room,
      room: PARENT_ROUTES.room,
      'parent-room': PARENT_ROUTES.room,
      pages: PARENT_ROUTES.pages,
      parentPages: PARENT_ROUTES.pages,
      circle: PARENT_ROUTES.circle,
      parentCircle: PARENT_ROUTES.circle,
      bridge: PARENT_ROUTES.bridge,
      parentBridge: PARENT_ROUTES.bridge,
      'parent-bridge': PARENT_ROUTES.bridge,
      voiceBip: PARENT_ROUTES.voiceBip,
      voicebip: PARENT_ROUTES.voiceBip,
      'parent-voicebip': PARENT_ROUTES.voiceBip,
      settings: PARENT_ROUTES.settings,
      more: PARENT_ROUTES.more,
      calm: PARENT_ROUTES.calm,
      s2tell: PARENT_ROUTES.s2tell,
      repair: PARENT_ROUTES.repair,
      voiceReflect: PARENT_ROUTES.voiceReflect,
      voicereflect: PARENT_ROUTES.voiceReflect,
      periodCalendar: PARENT_ROUTES.periodCalendar,
      coach: PARENT_ROUTES.room,
      sekret: PARENT_ROUTES.sekret,
      profile: PARENT_ROUTES.profile,
      growth: PARENT_ROUTES.growth,
      'parent-growth': PARENT_ROUTES.growth,
      approvals: PARENT_ROUTES.approvals,
      'parent-approvals': PARENT_ROUTES.approvals,
      connection: PARENT_ROUTES.bridge,
      parentConnection: PARENT_ROUTES.bridge,
      'parent-connection': PARENT_ROUTES.bridge,
      messages: PARENT_ROUTES.bridge,
      resources: PARENT_ROUTES.resources,
      insights: PARENT_ROUTES.more,
      'parent-insights': PARENT_ROUTES.more,
      points: PARENT_ROUTES.more,
      memories: PARENT_ROUTES.profile,
      cloud: PARENT_ROUTES.calm,
      comfort: PARENT_ROUTES.calm,
    };
    return parentMap[key] ?? missingRoute('parent', key);
  }

  const teenMap: Record<string, string> = {
    home: TEEN_ROUTES.room,
    room: TEEN_ROUTES.room,
    pages: TEEN_ROUTES.pages,
    calm: TEEN_ROUTES.calm,
    circle: TEEN_ROUTES.circle,
    sekret: '/(teen)/sekret',
    companionPicker: '/(teen)/sekret',
    voiceBip: TEEN_ROUTES.voiceBip,
    voicebip: TEEN_ROUTES.voiceBip,
    cloudThoughts: TEEN_ROUTES.cloud,
    cloud: TEEN_ROUTES.cloud,
    comfort: TEEN_ROUTES.comfort,
    crew: TEEN_ROUTES.circle,
    settings: TEEN_ROUTES.settings,
    more: TEEN_ROUTES.more,
    points: TEEN_ROUTES.points,
    chores: TEEN_ROUTES.chores,
    history: TEEN_ROUTES.history,
    continuity: TEEN_ROUTES.continuity,
    memory: TEEN_ROUTES.continuity,
    l4: TEEN_ROUTES.continuity,
    bridge: TEEN_ROUTES.bridge,
    parentBridge: TEEN_ROUTES.bridge,
    s2tell: TEEN_ROUTES.s2tell,
    periodCalendar: TEEN_ROUTES.periodCalendar,
    discover: TEEN_ROUTES.discover,
    profile: TEEN_ROUTES.profile,
    userRoom: TEEN_ROUTES.room,
    'parent-link-verify': TEEN_ROUTES.parentLinkVerify,
    parentLinkVerify: TEEN_ROUTES.parentLinkVerify,
    write: TEEN_ROUTES.pages,
    goals: TEEN_ROUTES.points,
    memories: TEEN_ROUTES.profile,
    music: TEEN_ROUTES.calm,
    rewards: TEEN_ROUTES.points,
    vibeLab: TEEN_ROUTES.room,
    bippin2: TEEN_ROUTES.bippin2,
    growth: TEEN_ROUTES.growth,
    mindReset: TEEN_ROUTES.mindReset,
    bodyReset: TEEN_ROUTES.bodyReset,
    resources: TEEN_ROUTES.resources,
  };
  return teenMap[key] ?? missingRoute('teen', key);
}
