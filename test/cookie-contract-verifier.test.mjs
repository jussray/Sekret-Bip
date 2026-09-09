import assert from 'node:assert/strict';
import test from 'node:test';

import { hasCookieUse } from '../scripts/verify-cookie-contract.mjs';

test('cookie contract detects browser, server, object, and tuple cookie operations', () => {
  const forbidden = [
    'const value = document.cookie;',
    'const value = document?.cookie;',
    'const value = document["cookie"];',
    'const value = document?.["cookie"];',
    'document.cookie = "session=abc";',
    'await cookieStore.get("session");',
    'await cookieStore?.set("session", "abc");',
    'response.headers.set("Set-Cookie", value);',
    'response.headers.append("set-cookie", value);',
    'res.setHeader("Set-Cookie", value);',
    'new Response(body, { headers: { "Set-Cookie": value } });',
    'new Response(body, { headers: [["Set-Cookie", value]] });',
    'new Headers([["Set-Cookie", value]]);',
    'setCookie("session", value);',
  ];

  for (const source of forbidden) {
    assert.equal(hasCookieUse(source), true, `expected forbidden cookie use: ${source}`);
  }
});

test('cookie contract ignores comments, diagnostic strings, and non-cookie state', () => {
  const allowed = [
    'await SecureStore.setItemAsync("session", value);',
    'await AsyncStorage.getItem("session");',
    'response.headers.set("Cache-Control", "no-store");',
    'new Response(body, { headers: { "Content-Type": "application/json" } });',
    '// Never use document.cookie here',
    'const note = "document.cookie is forbidden";',
    'const diagnostic = \'{ "Set-Cookie": "redacted" }\';',
    'const tupleExample = "[[\\\"Set-Cookie\\\", value]]";',
  ];

  for (const source of allowed) {
    assert.equal(hasCookieUse(source), false, `unexpected cookie match: ${source}`);
  }
});
