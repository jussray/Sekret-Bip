import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(path.resolve('screens/BridgeScreen.tsx'), 'utf8');

test('legacy Bridge confirmation tells the truth about the metadata-only signal', () => {
  assert.match(
    source,
    /they'll see that you reached out — not the words you typed\. you did something brave 💜/,
  );
  assert.doesNotMatch(source, /they'll see it as a gentle note/);

  const handlerStart = source.indexOf('const handleSend = async () =>');
  const handlerEnd = source.indexOf('const heroCopy =', handlerStart);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);

  const handler = source.slice(handlerStart, handlerEnd);
  const sendCall = handler.match(/sendBridgeSignal\(\{([\s\S]*?)\}\)/)?.[1] ?? '';
  assert.match(sendCall, /\bshareType\b/);
  assert.match(sendCall, /\bconvMode\b/);
  assert.match(sendCall, /\bcharKey\b/);
  assert.doesNotMatch(sendCall, /\bmessage\b/);
});
