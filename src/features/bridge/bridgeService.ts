import { fetchParentNotes, sendParentNote } from '@/utils/parentBridgeCompat';
import {
  fetchBridgeShares,
  sendS2TellShare,
  type BridgeShare,
} from '@/features/bridge/bridgeShareCompat';
import { fetchLinkedTeenId } from '@/utils/parentLink';

export type BridgeMessageKind = 's2tell' | 'reply';

export interface BridgeMessage {
  id: string;
  kind: BridgeMessageKind;
  body: string;
  createdAt: string;
  from: 'teen' | 'parent';
}

export async function sendTeenBridgeMessage(
  body: string,
  kind: BridgeMessageKind = 's2tell',
  tone?: string,
): Promise<boolean> {
  if (kind !== 's2tell') return false;
  return sendS2TellShare({ text: body, tone });
}

export async function sendParentBridgeMessage(
  teenUserId: string,
  body: string,
  kind: BridgeMessageKind = 'reply',
): Promise<boolean> {
  if (kind !== 'reply') return false;
  return sendParentNote(teenUserId, body);
}

export async function fetchTeenBridgeThread(): Promise<BridgeMessage[]> {
  const notes = await fetchParentNotes();
  return notes.map(note => ({
    id: note.id,
    kind: 'reply' as const,
    body: note.content,
    createdAt: note.sent_at,
    from: 'parent' as const,
  }));
}

export async function fetchParentBridgeThread(): Promise<BridgeMessage[]> {
  const teenId = await fetchLinkedTeenId();
  if (!teenId) return [];
  const shares: BridgeShare[] = await fetchBridgeShares(teenId);
  return shares.map(share => ({
    id: String(share.id),
    kind: 's2tell' as const,
    body: share.payload.rewrite ?? share.payload.text ?? '',
    createdAt: share.shared_at,
    from: 'teen' as const,
  }));
}
