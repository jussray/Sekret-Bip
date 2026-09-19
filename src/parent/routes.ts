export const PARENT_ROUTES = {
  room:           '/(parent)/room',
  pages:          '/(parent)/pages',
  circle:         '/(parent)/circle',
  bridge:         '/(parent)/bridge',
  voiceBip:       '/(parent)/voicebip',
  more:           '/(parent)/more',
  settings:       '/(parent)/settings',
  calm:           '/(parent)/calm',
  s2tell:         '/(parent)/s2tell',
  repair:         '/(parent)/repair',
  voiceReflect:   '/(parent)/voicereflect',
  periodCalendar: '/(parent)/period-calendar',
  sekret:         '/(parent)/sekret',
  profile:        '/(parent)/profile',
  growth:         '/(parent)/growth',
  resources:      '/(parent)/resources',
  approvals:      '/(parent)/approvals',
  bipJr:          '/(parent)/bip-jr',
} as const;

export type ParentRouteKey = keyof typeof PARENT_ROUTES;
