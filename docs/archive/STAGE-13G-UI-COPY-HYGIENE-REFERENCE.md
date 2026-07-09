> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-UI-COPY-HYGIENE-REF — User-facing copy hygiene and spec-echo reference

Status: reference recorded / implementation scheduled.

## Source references

- Uploaded reference script recorded at `docs/reference-prototypes/check-user-facing-spec-echo.mjs`.
- Expanded brief recorded at `docs/reference-prototypes/euro28-stage13g-expanded-agent-prompt.md`.

## Problem to solve

Two copy-quality failures have repeatedly appeared in user-facing UI:

1. Admin/dev/build-internal vocabulary leaking into ordinary player surfaces.
2. Full sentences from internal docs or decision records being pasted verbatim into UI and then frozen by exact-string audit markers.

The spec-echo script checks user-facing JS/JSX text against normalised sentences from `docs/*.md` so product copy does not become a verbatim copy of internal spec prose.

## Important upload gap

The expanded brief names three files:

- `check-user-facing-copy-hygiene.mjs`
- `user-facing-copy-hygiene-policy.mjs`
- `check-user-facing-spec-echo.mjs`

Only `check-user-facing-spec-echo.mjs` was present in this upload. The spec-echo script imports `user-facing-copy-hygiene-policy.mjs`, so it must not be wired into `npm run check` alone. The next implementation should either attach the missing two files or recreate them deliberately before wiring the audits.

## Implementation rules for Stage 13G-UI-HYGIENE-1

- Add both user-facing copy audits to `scripts/` only when all dependencies are present.
- Add scripts to `package.json` and wire them into `npm run check` near architecture governance.
- Rewrite flagged UI sentences as player-facing copy, not internal rule prose.
- Where existing audits hardcode prose as markers, extract shared named constants and point audits at constants/structure instead of duplicated user-facing sentences.
- Update `docs/STAGE-13G-C-CLOSEOUT-HANDOVER.md` so it refers to the constant, not exact prose.
- Record the principle in the Design Charter and Agent Rules.

## Product-copy principle

User-facing surfaces carry zero admin, dev or build-internal language and never echo spec/decision-doc prose verbatim. Copy is written for the player reading it, not lifted from the requirement that produced it.
