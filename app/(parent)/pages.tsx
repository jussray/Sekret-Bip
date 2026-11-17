import { ParentPagesScreen } from '@screens/ParentPagesScreen';
import { useAppContext } from '@/context/AppContext';
import { router } from 'expo-router';
import { routeForSide } from '@/shared/routes';

export default function ParentPagesRoute() {
  const {
    parentMood,
    parentRoomStyle,
    parentPagesDraft,
    setParentPagesDraft,
    parentPagesEntries,
    parentOracleProfile,
    completeParentOracleSession,
    saveParentPageEntry,
  } = useAppContext();

  return (
    <ParentPagesScreen
      mood={parentMood}
      parentRoomStyle={parentRoomStyle === 'dad' ? 'dad' : 'mom'}
      draft={parentPagesDraft}
      setDraft={setParentPagesDraft}
      entries={parentPagesEntries}
      onSave={saveParentPageEntry}
      oracleProfile={parentOracleProfile ?? undefined}
      onCompleteOracleSession={completeParentOracleSession}
      setScreen={(screen: string) => router.push(routeForSide('parent', screen) as any)}
      BottomNav={null}
    />
  );
}
