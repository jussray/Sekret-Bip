#!/usr/bin/env node
import { evaluateFounderOperationKillSwitch } from '../shared/founder-operation-kill-switch.js';

const [scope, operation] = process.argv.slice(2);
if (!scope || !operation) {
  console.error('FOUNDER_OPERATION_GATE_USAGE_ERROR');
  process.exit(64);
}

let decision;
try {
  decision = evaluateFounderOperationKillSwitch({
    rawValue: process.env.FOUNDER_OPERATION_KILL_SWITCH,
    rawReason: process.env.FOUNDER_OPERATION_KILL_SWITCH_REASON,
    scope,
    operation,
  });
} catch {
  console.error('FOUNDER_OPERATION_GATE_INVALID_ID');
  process.exit(64);
}

if (decision.blocked) {
  // Keep founder pause logs machine-readable without echoing operation IDs,
  // environment-provided reasons, or any other caller-controlled values.
  console.error('FOUNDER_OPERATION_PAUSED');
  process.exit(75);
}

console.log('FOUNDER_OPERATION_ALLOWED');
