# Daily Intentions — Product and Privacy Contract

**Surface:** Teen User Room  
**Purpose:** Turn the teen's own recent signals into a tiny, editable three-item checklist without making the app feel like surveillance.

## Product contract

- The card belongs only in the **User Room**, the teen's personal command center.
- It does not appear in Raylene, Rylane, Cloud, Night, Parent, Circle, or Bridge spaces.
- The output is a maximum of three short actions, designed to feel achievable rather than corrective.
- The teen can complete, refresh, collapse, personalize, downgrade to basic signals, or turn the feature off.
- A new checklist is generated only when today's checklist is missing or the teen explicitly changes mode or taps refresh. It is not silently regenerated after every conversation.

## Modes

### Basic — default

Uses only:

- the current mood label;
- whether the teen journaled today;
- whether Comfort was used today;
- whether Voice Bip was used today.

It does not inspect journal or companion text.

### Personalized — explicit opt-in

May inspect, in application memory, up to three recent **user-authored** Pages entries addressed to Raylene, Rylane, Cloud, or Night.

The deterministic local rules look only for broad needs such as rest, calming down, focus, connection, self-kindness, or a next step. They never copy or summarize the teen's wording.

### Off

Clears today's local and cloud checklist. The User Room keeps a small control pill so the teen can reopen the choice.

## Data boundary

The generation step runs locally in the Expo client. It does not call OpenAI, the companion reply endpoint, a Cloudflare Worker, a Supabase Edge Function, analytics, or a parent service.

The only durable fields are:

- date and position;
- final generic checklist label;
- broad category;
- broad source kind and source label;
- optional companion key;
- generation version;
- completed and dismissed state.

The system must never persist in `daily_intentions`:

- journal or chat text;
- excerpts or quotations;
- companion replies;
- voice or video transcripts;
- Circle content;
- Bridge or parent summaries;
- safety evidence;
- names, email addresses, or Bip IDs.

## Access boundary

- `daily_intentions` is restricted to permanent authenticated accounts.
- Row Level Security requires `auth.uid() = user_id` for select, insert, update, and delete.
- `anon` has no table privilege.
- Parent and guardian relationships provide no read path.
- Local cache keys are scoped to the permanent account ID to prevent account-switch leakage.

## Trust copy

The card and privacy sheet must say what is happening in plain language:

- “Helpful, not watching you.”
- “Checked on this device.”
- “No quotes saved.”
- “Never shown to parents.”

Do not use claims such as “AI knows what you need,” “we noticed you,” or “based on everything you do.”

## Release gates

A release fails when:

- the card appears outside the Teen User Room;
- personalized mode is enabled without an explicit teen choice;
- raw private content is added to the schema or repository payload;
- generation calls a remote AI or backend endpoint;
- anonymous or parent access is introduced;
- a checklist silently refreshes after every companion interaction;
- turning the feature off leaves today's checklist behind;
- account switching can expose another account's local checklist.
