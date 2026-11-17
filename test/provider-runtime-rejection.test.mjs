import test from 'node:test';
import assert from 'node:assert/strict';

import { invokeBipProvider } from '../worker/provider-runtime.ts';

// Rejection-path tests for worker/provider-runtime.ts (additive; no runtime
// change). Every case must fail BEFORE any network call: the recording fetch
// stands in for the provider endpoint and must never be invoked.

const ENV = {
  MODEL_API_KEY: 'test-key-never-sent',
  BIP_MUSE_MODEL: 'muse-spark-1.3',
};

function recordingFetch(calls) {
  return async (...args) => {
    calls.push(args);
    throw new Error('network must not be called');
  };
}

test("source 'user' is rejected as user_content_not_authorized pre-network", async () => {
  const calls = [];
  await assert.rejects(
    invokeBipProvider(ENV, { provider: 'muse', prompt: 'hello', source: 'user' }, recordingFetch(calls)),
    { message: 'user_content_not_authorized' },
  );
  assert.equal(calls.length, 0);
});

test("source 'parent' is rejected as user_content_not_authorized pre-network", async () => {
  const calls = [];
  await assert.rejects(
    invokeBipProvider(ENV, { provider: 'muse', prompt: 'hello', source: 'parent' }, recordingFetch(calls)),
    { message: 'user_content_not_authorized' },
  );
  assert.equal(calls.length, 0);
});

test("sensitivity 'crisis' is rejected as sensitive_context_not_authorized pre-network", async () => {
  const calls = [];
  await assert.rejects(
    invokeBipProvider(
      ENV,
      { provider: 'muse', prompt: 'hello', source: 'founder', sensitivity: 'crisis' },
      recordingFetch(calls),
    ),
    { message: 'sensitive_context_not_authorized' },
  );
  assert.equal(calls.length, 0);
});
