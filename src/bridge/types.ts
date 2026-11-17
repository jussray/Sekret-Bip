// Shared types for the bridge channel between teen and parent sides.
// Bridge features only activate when the teen explicitly initiates sharing.

export type BridgeMessageType =
  | 's2tell'          // Teen writes something to tell parent (moderated reveal)
  | 'period-share'    // Teen opts to share cycle prediction with parent
  | 'memory-share'    // Teen shares a specific memory with parent
  | 'feeling-share';  // Teen sends a mood/feeling to parent

export interface BridgeMessage {
  id: number;
  type: BridgeMessageType;
  fromSide: 'teen';
  toSide: 'parent';
  payload: Record<string, unknown>;
  sentAt: string;
  readByParent: boolean;
}

export interface S2TellMessage extends BridgeMessage {
  type: 's2tell';
  payload: {
    text: string;
    anonymous?: boolean;
  };
}

export interface PeriodShareMessage extends BridgeMessage {
  type: 'period-share';
  payload: {
    nextPrediction: string | null;
  };
}
