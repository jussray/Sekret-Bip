import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const vscode = readJson('.vscode/mcp.json');
const cursor = readJson('.cursor/mcp.json');
const routing = readJson('config/mcp-skill-routing.json');

const cloudflareServers = [
  'cloudflare',
  'cloudflare-docs',
  'cloudflare-bindings',
  'cloudflare-builds',
  'cloudflare-observability',
];

test('VS Code and Cursor use their supported MCP root keys', () => {
  assert.ok(vscode.servers && typeof vscode.servers === 'object');
  assert.equal(vscode.mcpServers, undefined);
  assert.ok(cursor.mcpServers && typeof cursor.mcpServers === 'object');
});

test('every IDE Cloudflare MCP is present in both clients', () => {
  for (const name of cloudflareServers) {
    assert.ok(vscode.servers[name], `VS Code missing ${name}`);
    assert.ok(cursor.mcpServers[name], `Cursor missing ${name}`);
  }
});

test('mutation-capable Cloudflare MCPs activate Bip guardrail skills', () => {
  for (const name of ['cloudflare', 'cloudflare-bindings']) {
    const skills = routing.servers[name]?.skills ?? [];
    assert.ok(skills.includes('bip-worker-guardian'), `${name} must load bip-worker-guardian`);
    assert.ok(skills.includes('bip-privacy-redteam'), `${name} must load bip-privacy-redteam`);
    assert.ok(skills.includes('bip-release-gate'), `${name} must load bip-release-gate`);
    assert.match(routing.servers[name]?.boundary ?? '', /explicit founder approval/i);
  }
});