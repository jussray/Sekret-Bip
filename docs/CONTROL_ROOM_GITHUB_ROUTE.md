# Control Room GitHub Route and Repository Checkout

Use this capability when a local runtime has no Se’kret Bip checkout or cannot prove that GitHub is reachable.

## Commands

Inspect the current checkout and GitHub route without cloning or fetching:

```bash
npm run control-room:github-status
```

Ensure the fixed `jussray/Sekret-Bip` checkout exists, verify its `origin`, prove a GitHub network route, and fetch remote refs:

```bash
npm run control-room:github-route
```

To place the checkout in a specific directory, set `CONTROL_ROOM_REPO_DIR`:

```bash
CONTROL_ROOM_REPO_DIR=/work/Sekret-Bip npm run control-room:github-route
```

The script prefers an authenticated GitHub CLI route (`gh repo clone` and `gh api`). When `gh` is unavailable or unauthenticated, it falls back to normal Git HTTPS transport and the machine’s existing credential helper. Tokens are never placed in clone URLs or written to the report.

## Mutation boundary

The route may:

- create the target directory only when it is absent or empty;
- clone only `jussray/Sekret-Bip`;
- verify the `origin` repository;
- run `git fetch --prune origin` when requested;
- write `reports/control-room/github-route-latest.json`.

It must not:

- overwrite a non-empty directory;
- accept an arbitrary repository from the browser;
- run `git pull`, `checkout`, `switch`, `reset`, `merge`, `rebase`, `push`, or force operations;
- expose GitHub credentials to Expo public variables, browser code, logs, or reports;
- claim this route changes the network policy of a sandbox that blocks outbound GitHub access.

A blocked report is evidence that the current runtime still lacks checkout, credentials, or network access. It is not evidence of a repository defect.
