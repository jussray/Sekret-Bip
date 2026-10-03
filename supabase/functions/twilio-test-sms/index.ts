import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RETIREMENT = Object.freeze({
  error: "function_retired",
  function: "twilio-test-sms",
  replacement: "provider-scoped test tooling outside production Edge Functions",
});

Deno.serve(() => new Response(JSON.stringify(RETIREMENT), {
  status: 410,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  },
}));
