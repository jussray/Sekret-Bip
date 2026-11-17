import type { DoorbellEvent } from './doorbell';
import type { SafetyEvent } from './safety';

export type NotificationAudience = 'teen' | 'parent';
export type NotificationCategory = 'updates' | 'safety' | 'circle' | 'parent_bridge';

export interface NotificationEvent {
  notificationId: string;
  audience: NotificationAudience;
  category: NotificationCategory;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  route?: string;
  sourceEvent?: SafetyEvent | DoorbellEvent;
}
