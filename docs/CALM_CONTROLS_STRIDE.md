# Calm controls completion stride

## Reality

The canonical Teen Calm route already rendered a polished landing screen, but the visible `choose` and `edit plan` controls had empty press handlers. The companion heart also used button styling without an action, and the Calm Picks labels implied audio experiences while every card opened the breathing route.

## Repair

- replace the fake mood action with a live selected-mood status;
- add three local Calm Plan presets with accessible selected state;
- keep checklist completion local to the current screen session;
- make all visible controls at least 44 points tall where relevant;
- convert the decorative companion heart to a noninteractive view;
- rename Calm Picks so each card truthfully describes the breathing destination;
- display canonical companion names Suhana and Sy while retaining legacy asset identifiers internally;
- replace the absolute `private` chip with `personal space` wording.

## Boundary

Repository UI and tests only. This stride does not add persistence, remote writes, parent visibility, sharing, notifications, audio licensing, deployment, database changes, credentials, paid capacity, or external-platform mutations.

## Rollback

Revert the Calm controls PR and rerun its exact-head gate. No database, account, credential, deployment, or user-data rollback is required.
