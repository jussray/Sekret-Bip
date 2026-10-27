# Bip Jr — preserved original welcome prototype

This is the original softer, younger-coded welcome concept. It remains intact as **Bip Jr** so the earlier visual direction is not lost.

## Current canon

The current teen Se'kret Bip welcome is in [`../teen-welcome/`](../teen-welcome/):

- **Night** on the left, **Suhana** centered, and **Sy** on the right;
- parents/guardians above, with **Cloud** lower/front in headphones and a hush gesture;
- polished purple-cosmic app UI, `Enter ♡`, and the full five-part bottom navigation.

The legacy character arrangement inside this preserved prototype is historical reference only; it is not the current character canon.

## Included

- original `Enter ♡` Teen/Parent flow;
- bottom navigation for Home, Family, Enter, Moments, and More;
- responsive mobile-first layout, keyboard focus states, and reduced-motion support;
- no authentication, persistence, production routing, or Expo runtime changes.

## Run locally

Serve this directory with any static file server and open `index.html`. For example:

```bash
python3 -m http.server 4173
```

This directory is intentionally isolated from the Expo app so the visual concept can be reviewed and iterated before implementation decisions are merged into the product runtime.
