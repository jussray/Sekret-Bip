export type ConfirmationResendOutcome = 'invalid' | 'throttled' | 'failed' | 'accepted';
export function createConfirmationResend(now?: () => number): {
  remainingMs(): number;
  request(rawEmail: string, send: (email: string) => Promise<{ error: unknown }>): Promise<ConfirmationResendOutcome>;
};
