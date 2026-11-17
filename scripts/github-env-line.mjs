/**
 * Formats one `NAME=value` line for $GITHUB_ENV.
 *
 * Values can come from third-party APIs (for example the live-signup mailbox
 * provider). A CR or LF in a value would let that response inject additional
 * variables into every later workflow step, so multi-line values are refused.
 */
export function githubEnvLine(name, value) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(String(name))) throw new Error(`Invalid GITHUB_ENV name: ${name}`);
  const text = String(value ?? '');
  if (/[\r\n]/.test(text)) throw new Error(`Refusing multi-line GITHUB_ENV value for ${name}`);
  return `${name}=${text}\n`;
}
