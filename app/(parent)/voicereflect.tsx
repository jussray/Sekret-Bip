import { parentNavigateTo } from '@/parent/navigation';
import { ParentVoiceReflectionScreen } from '@/parent/features/voice/ParentVoiceReflectionScreen';

export default function ParentVoiceReflectRoute() {
  return (
    <ParentVoiceReflectionScreen
      setScreen={parentNavigateTo}
      BottomNav={null}
    />
  );
}
