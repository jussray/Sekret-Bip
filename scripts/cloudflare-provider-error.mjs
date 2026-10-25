/**
 * Safe Cloudflare failure evidence. Provider messages, statusText, request paths,
 * tokens and response bodies are untrusted and must never reach a CI log or
 * retained artifact. Preserve only bounded numeric diagnostic fields.
 */
function providerCodes(payload) {
  return (Array.isArray(payload?.errors) ? payload.errors : [])
    .map((item) => item?.code)
    .filter((code) => Number.isInteger(code) && code >= 0 && code <= 999999)
    .slice(0, 8);
}

function httpStatus(status) {
  return Number.isInteger(status) && status >= 100 && status <= 599 ? status : null;
}

const SAFE_OPERATIONS = new Set([
  'token-verify',
  'workers-scripts-read',
  'workers-ci-read',
]);

export function cloudflareRequestFailure(payload, status, operation = null) {
  const codes = providerCodes(payload);
  const safeStatus = httpStatus(status);
  const safeOperation = SAFE_OPERATIONS.has(operation) ? operation : null;
  const summary = `CLOUDFLARE_PROVIDER_REQUEST_FAILED status=${safeStatus ?? 'unknown'}`
    + (codes.length ? ` codes=${codes.join(',')}` : '')
    + (safeOperation ? ` operation=${safeOperation}` : '');
  const error = new Error(summary);
  error.auditCode = 'CLOUDFLARE_PROVIDER_REQUEST_FAILED';
  error.providerStatus = safeStatus;
  error.providerCodes = codes;
  error.providerOperation = safeOperation;
  return error;
}

export function cloudflareHasErrorCode(error, code) {
  return Array.isArray(error?.providerCodes) && error.providerCodes.includes(code);
}

export function safeCloudflareErrorReason(error) {
  // Never parse Error.message: even uppercase-looking tokens can be secret.
  const reason = error?.auditCode === 'CLOUDFLARE_PROVIDER_REQUEST_FAILED'
    ? 'CLOUDFLARE_PROVIDER_REQUEST_FAILED'
    : 'CLOUDFLARE_OPERATION_FAILED';
  const status = httpStatus(error?.providerStatus);
  const codes = (Array.isArray(error?.providerCodes) ? error.providerCodes : [])
    .filter((code) => Number.isInteger(code) && code >= 0 && code <= 999999)
    .slice(0, 8);
  return reason
    + (status === null ? '' : ` status=${status}`)
    + (codes.length ? ` codes=${codes.join(',')}` : '')
    + (SAFE_OPERATIONS.has(error?.providerOperation) ? ` operation=${error.providerOperation}` : '');
}
