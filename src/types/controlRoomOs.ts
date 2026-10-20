export type ControlRoomHealth = 'healthy' | 'warning' | 'offline';

export type ControlRoomMissionId =
  | 'launch-bip'
  | 'continue-yesterday'
  | 'verify-local'
  | 'verify-frontend'
  | 'ship-release'
  | 'recover-system';

export type ControlRoomMissionCategory = 'launch' | 'verify' | 'release' | 'recovery' | 'planning';

export type ControlRoomMission = {
  id: ControlRoomMissionId;
  title: string;
  category: ControlRoomMissionCategory;
  founderPrompt: string;
  primaryAction: string;
  localAgentMission?: string;
  recoveryPath?: string;
  requiresNetwork: boolean;
};

export type ControlRoomWorker = {
  id: string;
  label: string;
  health: ControlRoomHealth;
  capabilities: string[];
  fallbackWorkerId?: string;
  localFirst: boolean;
};

export type ControlRoomConnector = {
  id: string;
  label: string;
  health: ControlRoomHealth;
  capabilities: string[];
  fallback: string;
  availableMissions: ControlRoomMissionId[];
  requiresAuthentication: boolean;
};
