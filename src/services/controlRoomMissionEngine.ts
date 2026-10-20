import {
  CONTROL_ROOM_CONNECTORS,
  CONTROL_ROOM_MISSIONS,
  CONTROL_ROOM_NOTIFICATION_DESTINATION,
  CONTROL_ROOM_WORKERS,
} from '@/config/controlRoomOs';
import type { ControlRoomConnector, ControlRoomMission, ControlRoomWorker } from '@/types/controlRoomOs';

type ControlRoomOperatingModel = {
  missions: ControlRoomMission[];
  workers: ControlRoomWorker[];
  connectors: ControlRoomConnector[];
  notificationDestination: string;
  primaryMission: ControlRoomMission;
  localAgentMissions: ControlRoomMission[];
  degradedConnectors: ControlRoomConnector[];
};

export function loadControlRoomOperatingModel(): ControlRoomOperatingModel {
  const localAgentMissions = CONTROL_ROOM_MISSIONS.filter((mission) => mission.localAgentMission);
  const degradedConnectors = CONTROL_ROOM_CONNECTORS.filter((connector) => connector.health !== 'healthy');

  return {
    missions: CONTROL_ROOM_MISSIONS,
    workers: CONTROL_ROOM_WORKERS,
    connectors: CONTROL_ROOM_CONNECTORS,
    notificationDestination: CONTROL_ROOM_NOTIFICATION_DESTINATION,
    primaryMission: CONTROL_ROOM_MISSIONS[0],
    localAgentMissions,
    degradedConnectors,
  };
}
