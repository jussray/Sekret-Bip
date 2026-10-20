import { parentNavigateTo } from '@/parent/navigation';
import { ParentCalmScreen } from '@/parent/features/calm/ParentCalmScreen';

export default function ParentCalmRoute() {
  return (
    <ParentCalmScreen
      setScreen={parentNavigateTo}
      BottomNav={null}
    />
  );
}
