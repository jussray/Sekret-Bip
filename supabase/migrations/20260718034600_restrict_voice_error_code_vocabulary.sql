begin;

alter table public.voice_events
  drop constraint if exists voice_events_error_code_vocabulary;

alter table public.voice_events
  add constraint voice_events_error_code_vocabulary
  check (
    not (payload ? 'error_code')
    or (
      jsonb_typeof(payload -> 'error_code') = 'string'
      and payload ->> 'error_code' in (
        'AUTH_REQUIRED',
        'AUTH_EXPIRED',
        'PERMISSION_DENIED',
        'DEVICE_UNAVAILABLE',
        'NETWORK_OFFLINE',
        'NETWORK_TIMEOUT',
        'RATE_LIMITED',
        'PROVIDER_UNAVAILABLE',
        'TRANSCRIPTION_FAILED',
        'REPLY_FAILED',
        'SYNTHESIS_FAILED',
        'PLAYBACK_FAILED',
        'CANCELLED',
        'INVALID_PAYLOAD',
        'INTERNAL_ERROR',
        'UNKNOWN'
      )
    )
  );

comment on constraint voice_events_error_code_vocabulary on public.voice_events is
  'Allows only approved internal operational error codes. Relays must map provider or client errors to this finite vocabulary before insertion; user-authored or upstream free-form strings are prohibited.';

commit;
