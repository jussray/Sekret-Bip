const OFF_VALUES = new Set(['', 'off', 'disabled', '0', 'false']);
const TARGET_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,95}$/;
const REASON_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,63}$/;

/**
 * Founder operation kill-switch contract.
 *
 * Authority is supplied only by trusted runtime configuration. Request bodies,
 * headers, URLs, product-user text, retrieved content, and model output are
 * never accepted as switch state.
 *
 * FOUNDER_OPERATION_KILL_SWITCH syntax:
 *   off                                  -> allow
 *   all                                  -> block every guarded operation
 *   scope:<scope>                        -> block a whole scope
 *   op:<operation>                       -> block one stable operation id
 *   scope:<scope>,op:<operation>,...     -> combine targets
 *
 * Any non-empty malformed configuration fails closed as `all` so a typo can
 * never create a false impression that the emergency brake is engaged.
 */
export function parseFounderOperationKillSwitch(rawValue) {
  const raw = String(rawValue ?? '').trim().toLowerCase();
  if (OFF_VALUES.has(raw)) {
    return { engaged: false, invalid: false, targets: [] };
  }

  const tokens = raw.split(',').map((value) => value.trim()).filter(Boolean);
  if (tokens.length === 0) {
    return { engaged: false, invalid: false, targets: [] };
  }

  const targets = [];
  for (const token of tokens) {
    if (token === 'all') {
      targets.push('all');
      continue;
    }
    const separator = token.indexOf(':');
    if (separator <= 0) {
      return { engaged: true, invalid: true, targets: ['all'] };
    }
    const kind = token.slice(0, separator);
    const id = token.slice(separator + 1);
    if ((kind !== 'scope' && kind !== 'op') || !TARGET_PATTERN.test(id)) {
      return { engaged: true, invalid: true, targets: ['all'] };
    }
    targets.push(`${kind}:${id}`);
  }

  return { engaged: true, invalid: false, targets: [...new Set(targets)] };
}

export function founderKillSwitchReason(rawReason) {
  const reason = String(rawReason ?? '').trim().toLowerCase();
  return REASON_PATTERN.test(reason) ? reason : 'founder_pause';
}

export function evaluateFounderOperationKillSwitch({ rawValue, rawReason, scope, operation }) {
  if (!TARGET_PATTERN.test(scope) || !TARGET_PATTERN.test(operation)) {
    throw new Error('invalid_guard_identity');
  }

  const parsed = parseFounderOperationKillSwitch(rawValue);
  const blocked = parsed.engaged && (
    parsed.invalid
    || parsed.targets.includes('all')
    || parsed.targets.includes(`scope:${scope}`)
    || parsed.targets.includes(`op:${operation}`)
  );

  return {
    blocked,
    engaged: parsed.engaged,
    invalidConfiguration: parsed.invalid,
    scope,
    operation,
    reason: founderKillSwitchReason(rawReason),
    targets: parsed.targets,
  };
}

export function stableHttpOperationId(method, pathname) {
  const verb = String(method || 'GET').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'unknown';
  const route = String(pathname || '/')
    .toLowerCase()
    .replace(/^\/+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72) || 'root';
  return `http:${verb}:${route}`;
}
