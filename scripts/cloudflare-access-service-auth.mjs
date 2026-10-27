function safeString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function resolveCloudflareAccessServiceAuth(env = process.env) {
  const clientId = safeString(env.CLOUDFLARE_ACCESS_CLIENT_ID);
  const clientSecret = safeString(env.CLOUDFLARE_ACCESS_CLIENT_SECRET);

  if (!clientId && !clientSecret) {
    return {
      configured: false,
      headers: /** @type {Record<string, string>} */ ({}),
    };
  }

  if (!clientId || !clientSecret) {
    throw new Error(
      'Cloudflare Access service auth is incomplete: CLOUDFLARE_ACCESS_CLIENT_ID and CLOUDFLARE_ACCESS_CLIENT_SECRET must be configured together.',
    );
  }

  return {
    configured: true,
    headers: /** @type {Record<string, string>} */ ({
      'CF-Access-Client-Id': clientId,
      'CF-Access-Client-Secret': clientSecret,
    }),
  };
}
