import '@/utils/api';

declare module '@/utils/api' {
  interface SekretBrainResponse {
    /** Optional runtime style budget returned by compatible Worker responses. */
    questionBudget?: number;
  }
}

export {};
