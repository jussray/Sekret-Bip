/** Local UX cooldown; server-side Supabase limits remain authoritative. No account data is retained. */
export function createConfirmationResend(now = Date.now) {
  let nextAllowedAt = 0;
  let inFlight = false;
  return {
    remainingMs() { return Math.max(0, nextAllowedAt - now()); },
    async request(rawEmail, send) {
      const email = rawEmail.trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'invalid';
      if (inFlight || now() < nextAllowedAt) return 'throttled';
      inFlight = true;
      nextAllowedAt = now() + 60_000;
      try {
        const result = await send(email);
        return result?.error ? 'failed' : 'accepted';
      } catch {
        return 'failed';
      } finally {
        inFlight = false;
      }
    },
  };
}
