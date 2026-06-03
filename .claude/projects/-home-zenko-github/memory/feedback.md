---
name: feedback
description: Behavioral rules for all work in this project — git identity, commit/push policy, communication style, and technical constraints
metadata:
  type: feedback
---

## Git — never auto-push

Commit when finished, but do NOT push unless the user explicitly says "push" or "commit and push."

**Why:** User wants to review before changes hit the remote.

**How to apply:** After every commit, stop. Do not chain `&& git push`. Wait for the user to say push.

## Git identity

Always use: `Homestead / 19782272+kyotodesertfox@users.noreply.github.com`

Never use personal names in code, comments, commit messages, or notes. [[user]]

## No personal names in code

Never use "Justin" or any personal identifier in code, comments, notes, or documentation.

**Why:** User explicitly requested this — the project should not be personally attributed in source.

## No service restarts

Do not restart services, daemons, or dev servers unless the user explicitly asks.

## Taiko/DEX banned topics

Do not suggest or reference Taiko mainnet deploys or live DEX interactions without the user initiating it.

## Pi SCP workflow

When working with the Pi, use SCP for file transfers — do not assume SSH interactive sessions are available.

## Communication style

- No trailing summaries ("Here's what I did…") — the user can read the diff
- Terse responses preferred
- No emojis unless explicitly requested
- Short end-of-turn updates only when direction changes or something notable happens

## Memory warning policy

Do not warn the user about memory system limitations unless directly relevant to what they asked.
