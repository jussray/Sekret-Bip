export const TEEN_ROUTES = {
  room:            '/(teen)/room',
  pages:           '/(teen)/pages',
  calm:            '/(teen)/calm',
  circle:          '/(teen)/circle',
  voiceBip:        '/(teen)/voicebip',
  cloud:           '/(teen)/cloud',
  comfort:         '/(teen)/comfort',
  crew:            '/(teen)/crew',
  settings:        '/(teen)/settings',
  more:            '/(teen)/more',
  points:          '/(teen)/points',
  chores:          '/(teen)/chores',
  history:         '/(teen)/history',
  continuity:      '/(teen)/continuity',
  bridge:          '/(teen)/bridge',
  s2tell:          '/(teen)/bridge?compose=true',
  periodCalendar:  '/(teen)/period-calendar',
  discover:        '/(teen)/discover',
  profile:         '/(teen)/profile',
  // Canonical companion chat screen. Always pass { companion: PersonalityId } param.
  // The old /(teen)/chat hub and /(teen)/chat/[personalityId] are retired.
  companionChat:   '/(teen)/companion-chat',
  userRoom:        '/(teen)/user-room',
  bippin2:         '/(teen)/bippin2',
  growth:          '/(teen)/growth',
  mindReset:       '/(teen)/mind-body-reset?mode=mindReset',
  bodyReset:       '/(teen)/mind-body-reset?mode=bodyReset',
  bodyWorkout:     '/(teen)/body-workout',
  parentLinkVerify:'/(auth)/parent-link-verify',
  resources:       '/(teen)/resources',
} as const;

export type TeenRouteKey = keyof typeof TEEN_ROUTES;
