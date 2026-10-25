import assert from 'node:assert/strict';
import test from 'node:test';

// Node >= 22.6 type-stripping imports the TS runtime directly.
import { bipProviderStates, invokeBipProvider } from '../worker/provider-runtime.ts';

const KEY = 'TEST-KEY-NOT-A-REAL-SECRET';
const okFetch = () => {
  const impl = async () => new Response(JSON.stringify({
    id: 'resp_123', status: 'completed', output_text: 'bounded answer',
  }), { status: 200, headers: { 'content-type': 'application/json' } });
  impl.calls = 0;
  const wrapped = async (...args) => { wrapped.calls++; return impl(...args); };
  wrapped.calls = 0;
  return wrapped;
};

test('muse is not advertised with a non-allow-listed BIP_MUSE_MODEL', async () => {
  const env = { MODEL_API_KEY: KEY, BIP_MUSE_MODEL: 'muse-spark-9.9' };
  assert.equal(bipProviderStates(env).muse.state, 'ABSENT');
  const fetchImpl = okFetch();
  await assert.rejects(
    () => invokeBipProvider(env, { provider: 'muse', prompt: 'hi', source: 'founder' }, fetchImpl),
    /not configured/,
  );
  assert.equal(fetchImpl.calls, 0);
});

test('allow-listed model (explicit or default) keeps muse integrated', async () => {
  assert.equal(bipProviderStates({ MODEL_API_KEY: KEY, BIP_MUSE_MODEL: 'muse-spark-1.2' }).muse.state, 'INTEGRATED');
  assert.equal(bipProviderStates({ MODEL_API_KEY: KEY }).muse.state, 'INTEGRATED');
  const result = await invokeBipProvider(
    { MODEL_API_KEY: KEY, BIP_MUSE_MODEL: 'muse-spark-1.2' },
    { provider: 'muse', prompt: 'hi', source: 'founder' },
    okFetch(),
  );
  assert.equal(result.state, 'INTEGRATED');
  assert.equal(result.model, 'muse-spark-1.2');
});
