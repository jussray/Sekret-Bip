// Bridge module: features that connect teen and parent sides.
// All bridge interactions are teen-initiated — parents can only receive/respond,
// never pull data from the teen side directly.

export type { BridgeMessage, S2TellMessage, PeriodShareMessage, BridgeMessageType } from './types';

export const BRIDGE_RULES = {
  teenInitiatesOnly: true,
  parentCannotPullTeenData: true,
  teenCanRevokeShare: true,
} as const;
export * from './routes';
