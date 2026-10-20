import { useAppContext } from '@/context/AppContext';
import { parentNavigateTo } from '@/parent/navigation';
import { ParentSekretCoachScreen } from '@/parent/features/sekret/ParentSekretCoachScreen';

export default function ParentSekretRoute() {
  const { parentMood } = useAppContext();
  return (
    <ParentSekretCoachScreen
      setScreen={parentNavigateTo}
      parentMood={parentMood}
      BottomNav={null}
    />
  );
}
