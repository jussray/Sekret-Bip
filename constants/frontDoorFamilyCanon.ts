import type { ImageSourcePropType } from 'react-native';

/**
 * Front-door display references, pixel-cropped from the founder-supplied art.
 * These are NOT generated lookalikes, chat identities or age/consent authority.
 * Do not substitute faces, expose journals, or treat public display as permission
 * for an AI video provider to use a character.
 */
const FAMILY_MEDIA = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3IxeW2mjocxEfjgv8ruzYWLYsaB/';

export type FamilyMemberId =
  | 'dad' | 'mom' | 'sy' | 'night' | 'suhana' | 'cloud'
  | 'bip-jr-1' | 'bip-jr-2' | 'bip-jr-3' | 'bip-jr-4';

export interface FrontDoorFamilyMember {
  id: FamilyMemberId;
  name: string;
  role: string;
  row: 'parents' | 'companions' | 'children';
  portrait: ImageSourcePropType;
}

// Ja remains available in the companion registry but is intentionally absent
// from this family welcome composition per the founder's latest direction.
export const FRONT_DOOR_FAMILY: readonly FrontDoorFamilyMember[] = [
  { id: 'dad', name: 'Dad', role: 'The Guardian', row: 'parents',
    portrait: { uri: FAMILY_MEDIA + '3ed8144c-588c-4999-af7e-82894d365807.jpg' } },
  { id: 'mom', name: 'Mom', role: 'The Heart', row: 'parents',
    portrait: { uri: FAMILY_MEDIA + '8a04e10c-94a2-4e96-8371-fc0446282f0c.jpg' } },
  { id: 'sy', name: 'Sy', role: 'The Builder', row: 'companions',
    portrait: { uri: FAMILY_MEDIA + '29437f93-1125-4709-b45d-96adbfa6373d.jpg' } },
  { id: 'night', name: 'Night', role: 'The Watcher', row: 'companions',
    portrait: { uri: FAMILY_MEDIA + '3bc2de31-4d86-4ea0-ba85-2d6604ebffad.jpg' } },
  { id: 'suhana', name: 'Suhana', role: 'The Center', row: 'companions',
    portrait: { uri: FAMILY_MEDIA + 'd1d06578-7161-4175-a4e9-95dcbc284361.jpg' } },
  { id: 'cloud', name: 'Cloud', role: 'The Calm', row: 'companions',
    portrait: { uri: FAMILY_MEDIA + '3dfd0df8-241d-4399-afc3-a825ea7df486.jpg' } },
  { id: 'bip-jr-1', name: 'Bip Jr. 1', role: 'The Spark', row: 'children',
    portrait: { uri: FAMILY_MEDIA + '2e6c4a37-8d12-4efb-9304-74b28a2ee6e2.jpg' } },
  { id: 'bip-jr-2', name: 'Bip Jr. 2', role: 'The Giggle', row: 'children',
    portrait: { uri: FAMILY_MEDIA + '346baba4-0d64-450c-8464-6bbc3c1eeff3.jpg' } },
  { id: 'bip-jr-3', name: 'Bip Jr. 3', role: 'The Dreamer', row: 'children',
    portrait: { uri: FAMILY_MEDIA + '663fe261-8aea-4792-8408-ad0587941934.jpg' } },
  { id: 'bip-jr-4', name: 'Bip Jr. 4', role: 'The Explorer', row: 'children',
    portrait: { uri: FAMILY_MEDIA + 'dba1ccbe-4518-45a1-a53d-ad8fe0aa1e85.jpg' } },
];

export const FRONT_DOOR_FAMILY_ORDER: readonly FamilyMemberId[] = FRONT_DOOR_FAMILY.map(member => member.id);
