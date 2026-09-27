import upstream from '../worker/voice-entry';
import {
  emitReciprocalTelemetry,
  observeFetchRequest,
  syntheticFetchResponse,
} from './reciprocal-ingress.mjs';

export * from '../worker/voice-entry';

const edge = {
  ...upstream,
  async fetch(request: Request, env: Record<string, unknown>, ctx: { waitUntil?: (promise: Promise<unknown>) => void }) {
    const observation = await observeFetchRequest(request, env, 'sekret-backend');
    emitReciprocalTelemetry(observation, ctx);
    const hallway = syntheticFetchResponse(observation);
    if (hallway) return hallway;
    if (!upstream.fetch) throw new Error("Se'kret Bip upstream fetch is unavailable");
    return upstream.fetch.call(upstream, request, env as never, ctx as never);
  },
};

export default edge;
