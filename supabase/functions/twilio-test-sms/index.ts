import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RETIREMENT = Object.freeze({
  retired: true,
  function: "twilio-test-sms",
  reason: "test_only_surface_not_permitted_in_production",
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
