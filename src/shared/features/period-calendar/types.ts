export type DayKey = string; // "YYYY-M-D"
export type ISODay = string; // "YYYY-MM-DD"

export type MarkedDays = Record<DayKey, 'period'>;

export interface CycleData {
  markedDays: MarkedDays;
  lastPeriodStart: string | null;
}

export interface SharedPeriodDay {
  isoDay: ISODay;
  sharedByTeen: true;
}
