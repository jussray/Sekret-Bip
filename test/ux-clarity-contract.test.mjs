import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Room keeps cinematic hotspots but exposes an explicit shortcut guide', async () => {
  const teenRoom = await read('app/(teen)/room.tsx');
  const parentRoom = await read('app/(parent)/room.tsx');
  const guide = await read('components/rooms/RoomExploreGuide.tsx');

  assert.match(teenRoom, /RoomExploreGuide side="teen"/);
  assert.match(parentRoom, /RoomExploreGuide side="parent"/);
  assert.match(guide, /What can I tap\?/);
  assert.match(guide, /Room shortcuts/);
  assert.match(guide, /Tap objects in the room, or use a shortcut here\./);
  assert.match(guide, /accessibilityLabel=\{open \? 'Hide room shortcuts' : 'Show room shortcuts'\}/);
});

test('Parent Room unlocks relationship routes only from server-backed link authority', async () => {
  const parentRoom = await read('app/(parent)/room.tsx');

  assert.match(parentRoom, /resolveParentEntryState\(\)/);
  assert.match(parentRoom, /state\.state === 'ready'/);
  assert.match(parentRoom, /linkState !== 'linked'/);
  assert.match(parentRoom, /linkState === 'linked'[\s\S]*RoomExploreGuide/s);
  assert.match(parentRoom, /Couldn’t verify your link\./);
  assert.match(parentRoom, /Retry private link check/);
  assert.doesNotMatch(parentRoom, /AsyncStorage\.getItem\('linked_teen_id'\)/);
});

test('More does not duplicate destinations already owned by primary navigation or Bippin 2', async () => {
  const purposes = await read('src/constants/screenPurpose.ts');
  const teenDrawer = purposes.slice(
    purposes.indexOf('export const TEEN_MORE_GROUPS'),
    purposes.indexOf('export const PARENT_MORE_GROUPS'),
  );
  const parentDrawer = purposes.slice(purposes.indexOf('export const PARENT_MORE_GROUPS'));

  assert.doesNotMatch(teenDrawer, /label: 'Bip Points'/);
  assert.doesNotMatch(parentDrawer, /label: 'Bridge'/);
  assert.doesNotMatch(parentDrawer, /label: 'Parent Circle'/);
  assert.match(teenDrawer, /label: 'Bippin 2'.*points/s);
});

test('first-run age setup uses person-facing language instead of implementation jargon', async () => {
  const welcome = await read('app/(onboarding)/welcome.tsx');
  const visibleCopy = welcome.slice(welcome.indexOf('return ('), welcome.indexOf('const styles'));

  assert.match(visibleCopy, /Find your/);
  assert.match(visibleCopy, /right Bip space/);
  assert.match(visibleCopy, /Choose your age range/);
  assert.match(visibleCopy, /We do not ask for a raw ID, selfie, video, or full birth date here\./);
  assert.doesNotMatch(visibleCopy, /age bucket/i);
  assert.doesNotMatch(visibleCopy, /assurance status/i);
  assert.doesNotMatch(visibleCopy, /account side/i);
});

test('Live Parent Bridge distinguishes provider failure from a successful empty read', async () => {
  const route = await read('app/(parent)/bridge.tsx');
  const screen = await read('src/features/bridge/ParentBridgeSummaryScreen.tsx');
  const inbox = await read('src/features/bridge/ParentBridgeSummaryInbox.tsx');
  const responseCard = await read('components/bridge/ParentBridgeResponseRequestCard.tsx');
  const sharedThread = await read('components/bridge/ParentBridgeSharedThread.tsx');
  const service = await read('src/services/parentBridgeSummaryService.ts');

  assert.match(route, /ParentBridgeSummaryScreen/);
  assert.match(screen, /ParentBridgeResponseRequestCard/);
  assert.match(screen, /ParentBridgeSharedThread/);
  assert.match(screen, /ParentBridgeSummaryInbox/);
  assert.match(inbox, /accessibilityLabel="Retry loading Bridge summaries"/);
  assert.match(responseCard, /fetchBridgeSignalsResult/);
  assert.match(responseCard, /Couldn’t load the latest support request/);
  assert.match(responseCard, /Retry loading Bridge response request/);
  assert.match(sharedThread, /useLinkedBridge\(\)/);
  assert.match(sharedThread, /fetchParentSentNotesResult\(linked\.linkedTeenId\)/);
  assert.match(sharedThread, /We won’t call it empty while a Bridge read is failing/);
  assert.match(sharedThread, /sendParentNote\(linked\.linkedTeenId, body\)/);
  assert.match(sharedThread, /filter\(entry => entry\.mood_tag === 's2tell'\)/);
  assert.match(service, /Couldn’t load Bridge Summaries right now\. Try again\./);
  assert.doesNotMatch(service, /message: requestError\.message/);
  assert.doesNotMatch(service, /message: summaryError\.message/);
  assert.doesNotMatch(service, /message: viewError\.message/);
});

test('Parent-linked hooks fail closed before relationship authority is re-established', async () => {
  const linkedTeen = await read('src/hooks/useLinkedTeen.ts');
  const linkedBridge = await read('src/hooks/useLinkedBridge.ts');

  assert.match(linkedTeen, /const clearLinkedSnapshot = useCallback\(\(\) => \{/);
  assert.match(linkedTeen, /setLinkedTeenId\(null\);[\s\S]*setIsLinked\(false\);[\s\S]*setSharedJournal\(\[\]\);[\s\S]*setSharedMoods\(\[\]\);[\s\S]*setSignals\(\[\]\);/);
  assert.match(linkedTeen, /setIsLoading\(true\);[\s\S]*setLoadError\(false\);[\s\S]*clearLinkedSnapshot\(\);[\s\S]*resolveParentEntryState\(\)/);
  assert.match(linkedTeen, /if \(!signalResult\.ok \|\| !summaryResult\.ok \|\| !journalResult\.ok \|\| !moodResult\.ok\) \{[\s\S]*clearLinkedSnapshot\(\);[\s\S]*setLoadError\(true\);/);
  assert.match(linkedBridge, /fetchBridgeSharesResult\(teenId\)/);
  assert.match(linkedBridge, /setShares\(\[\]\);[\s\S]*setShareLoading\(true\);[\s\S]*setShareLoadError\(false\);/);
  assert.match(linkedBridge, /if \(!result\.ok\) \{[\s\S]*setShares\(\[\]\);[\s\S]*setShareLoadError\(true\);/);
  assert.match(linkedBridge, /loadError: linked\.loadError \|\| shareLoadError/);
});

test('Teen Bridge sends intentional S2Tell text and never treats read failure as empty history', async () => {
  const screen = await read('screens/BridgeScreen.tsx');
  const shares = await read('src/features/bridge/bridgeShareCompat.ts');
  const compat = await read('src/utils/parentBridgeCompat.ts');

  assert.match(screen, /sendS2TellShare\(\{[\s\S]*text,[\s\S]*tone: convMode \?\? undefined,[\s\S]*shareType,/);
  assert.match(screen, /if \(!shared\) \{[\s\S]*Nothing was marked as delivered/);
  assert.match(screen, /sendBridgeSignal\(\{ shareType, convMode, charKey \}\)/);
  assert.match(screen, /The S2Tell message reached Bridge, but the support signal could not be recorded/);
  assert.match(screen, /fetchBridgeSignalsResult\(myId\)/);
  assert.match(screen, /fetchBridgeSharesResult\(myId\)/);
  assert.match(screen, /fetchParentNotesResult\(\)/);
  assert.match(screen, /Couldn’t verify the complete Bridge history/);
  assert.match(screen, /!historyHasError && !historyLoading && historyItems\.length === 0/);
  assert.match(screen, /const ok = await markParentNoteSeen\(note\.id\)/);
  assert.match(shares, /export async function fetchBridgeSharesResult/);
  assert.match(shares, /if \(error\) return \{ ok: false, shares: \[\], reason: 'query-failed' \}/);
  assert.match(compat, /Promise<BridgeSignalWriteResult>/);
  assert.match(compat, /if \(error\) return \{ ok: false, reason: 'insert-failed' \}/);
  assert.match(compat, /fetchParentSentNotesResult\(teenUserId\?: string\)/);
  assert.match(compat, /if \(teenUserId\) query = query\.eq\('teen_user_id', teenUserId\)/);
});

test('Legacy ParentBridgeScreen is not the routed parent Bridge authority', async () => {
  const route = await read('app/(parent)/bridge.tsx');
  assert.doesNotMatch(route, /@screens\/ParentBridgeScreen|screens\/ParentBridgeScreen/);
});
