import { parentNavigateTo } from '@/parent/navigation';
import { ParentRepairScreen } from '@/parent/features/repair/ParentRepairScreen';

export default function ParentRepairRoute() {
  return (
    <ParentRepairScreen
      setScreen={parentNavigateTo}
      BottomNav={null}
    />
  );
}
