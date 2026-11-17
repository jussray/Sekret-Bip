import { parentNavigateTo } from '@/parent/navigation';
import { ParentS2TellInboxScreen } from '@/parent/features/s2tell/ParentS2TellInboxScreen';

export default function ParentS2TellRoute() {
  return (
    <ParentS2TellInboxScreen
      setScreen={parentNavigateTo}
      BottomNav={null}
    />
  );
}
