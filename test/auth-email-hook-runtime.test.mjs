import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('supabase/functions/send-auth-email/index.ts', 'utf8');
const executable = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness(provider = async () => new Response('{}', { status: 200 })) {
  const sent = [];
  let handler;
  const env = {
    SEND_EMAIL_HOOK_SECRET: 'v1,whsec_testonly',
    RESEND_API_KEY: 'test-only',
    AUTH_FROM_EMAIL: 'hello@sekretbip.net',
    SUPABASE_URL: 'https://example.supabase.co',
  };
  class MockWebhook {
    constructor(secret) {
      assert.equal(secret, 'testonly');
    }
    verify(body, headers) {
      if (headers['webhook-id'] !== 'signed') throw new Error('invalid signature');
      return JSON.parse(body);
    }
  }
  const context = {
    exports: {},
    require(id) {
      if (id.includes('standardwebhooks')) return { Webhook: MockWebhook };
      if (id.startsWith('jsr:')) return {};
      throw new Error('Unexpected import: ' + id);
    },
    Deno: {
      env: { get: (key) => env[key] },
      serve(fn) { handler = fn; },
    },
    console: { error() {} },
    URL,
    Request,
    Response,
    AbortSignal,
    fetch: async (url, options) => {
      assert.equal(url, 'https://api.resend.com/emails');
      sent.push({ ...JSON.parse(options.body), headers: options.headers });
      return provider(sent.length, options);
    },
  };
  vm.runInNewContext(executable, context, { timeout: 1000 });
  assert.equal(typeof handler, 'function');
  return {
    sent,
    async invoke(payload, signed = true) {
      return handler(new Request('https://example.supabase.co/functions/v1/send-auth-email', {
        method: 'POST',
        headers: { 'webhook-id': signed ? 'signed' : 'invalid' },
        body: JSON.stringify(payload),
      }));
    },
  };
}

function payload(action, override = {}) {
  return {
    user: { id: 'user-001', email: 'old@example.org', ...override.user },
    email_data: {
      email_action_type: action,
      token_hash: 'hash-normal',
      token: '123456',
      token_hash_new: '',
      token_new: '',
      redirect_to: 'https://app.sekretbip.net/auth/callback',
      ...override.email_data,
    },
  };
}

test('signed signup builds a confirmation link for the authenticated account address', async () => {
  const h = harness();
  const response = await h.invoke(payload('signup'));
  assert.equal(response.status, 200);
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].to, 'old@example.org');
  assert.match(h.sent[0].text, /Verification code: 123456/);
  const link = h.sent[0].text.match(/https:\/\/[^\s]+/)[0];
  const url = new URL(link);
  assert.equal(url.pathname, '/auth/v1/verify');
  assert.equal(url.searchParams.get('token'), 'hash-normal');
  assert.equal(url.searchParams.get('type'), 'signup');
});

test('secure email change sends distinct correctly paired codes and hashes', async () => {
  const h = harness();
  const response = await h.invoke(payload('email_change', {
    user: { new_email: 'new@example.org' },
    email_data: { token_hash_new: 'old-address-hash', token_hash: 'new-address-hash', token: '111111', token_new: '222222' },
  }));
  assert.equal(response.status, 200);
  assert.equal(h.sent.length, 2);
  assert.equal(h.sent[0].to, 'old@example.org');
  assert.equal(h.sent[1].to, 'new@example.org');
  assert.match(h.sent[0].text, /111111/);
  assert.doesNotMatch(h.sent[0].text, /222222/);
  assert.match(h.sent[1].text, /222222/);
  assert.doesNotMatch(h.sent[1].text, /111111/);
  assert.equal(new URL(h.sent[0].text.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token'), 'old-address-hash');
  assert.equal(new URL(h.sent[1].text.match(/https:\/\/[^\s]+/)[0]).searchParams.get('token'), 'new-address-hash');
  assert.notEqual(h.sent[0].headers['Idempotency-Key'], h.sent[1].headers['Idempotency-Key']);
});

test('single-token email change goes only to the new address', async () => {
  const h = harness();
  const response = await h.invoke(payload('email_change', { user: { new_email: 'new@example.org' } }));
  assert.equal(response.status, 200);
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].to, 'new@example.org');
  assert.match(h.sent[0].text, /123456/);
});

test('missing new email fails closed without sending any token', async () => {
  const h = harness();
  const response = await h.invoke(payload('email_change'));
  assert.equal(response.status, 400);
  assert.equal(h.sent.length, 0);
});

test('repeated notification sends have no permanently colliding idempotency key', async () => {
  const h = harness();
  const notice = payload('password_changed_notification', {
    email_data: { token_hash: '', token: '' },
  });
  assert.equal((await h.invoke(notice)).status, 200);
  assert.equal((await h.invoke(notice)).status, 200);
  assert.equal(h.sent.length, 2);
  assert.equal(h.sent[0].headers['Idempotency-Key'], undefined);
  assert.doesNotMatch(h.sent[0].text, /auth\/v1\/verify/);
});

test('invalid signature blocks provider access', async () => {
  const h = harness();
  const response = await h.invoke(payload('signup'), false);
  assert.equal(response.status, 401);
  assert.equal(h.sent.length, 0);
});

test('provider rejection on second email returns retryable failure', async () => {
  const h = harness(async (index) => new Response('{}', { status: index === 2 ? 503 : 200 }));
  const response = await h.invoke(payload('email_change', {
    user: { new_email: 'new@example.org' },
    email_data: { token_hash_new: 'old-hash', token_hash: 'new-hash' },
  }));
  assert.equal(response.status, 502);
  assert.equal(h.sent.length, 2);
});

test('provider requests include a bounded cancellation signal', async () => {
  let checked = 0;
  const h = harness(async (_index, options) => {
    assert.equal(typeof options.signal?.throwIfAborted, 'function');
    assert.equal(options.signal.aborted, false);
    checked += 1;
    return new Response('{}', { status: 200 });
  });
  const response = await h.invoke(payload('signup'));
  assert.equal(response.status, 200);
  assert.equal(checked, 1);
});

test('secure email change dispatches to both addresses concurrently', async () => {
  let finishFirst;
  const first = new Promise((resolve) => { finishFirst = resolve; });
  const h = harness(async (index) => index === 1 ? first : new Response('{}', { status: 200 }));
  const pending = h.invoke(payload('email_change', {
    user: { new_email: 'new@example.org' },
    email_data: { token_hash_new: 'old-hash', token_hash: 'new-hash' },
  }));
  try {
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(h.sent.length, 2);
  } finally {
    finishFirst(new Response('{}', { status: 200 }));
  }
  assert.equal((await pending).status, 200);
});
