> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 2 — Reconciled prediction and lock contracts

Status: **approved for revised Migration 005 design**

## Prediction meaning

- Group and knockout score predictions always mean the score after 90 minutes plus added time.
- A knockout prediction separately records the advancing team and decision method: normal time, extra time or penalties.
- Penalty shoot-out scores are never predicted for match-score points.
- Exact point values remain provisional and come from `src/config/scoringConfig.js`.

## Submit and Edit

Submit is a reversible user-side review mode.

- Predictions continue to use the same always-live rows.
- Submission does not copy or snapshot data.
- Submission does not affect eligibility or scoring.
- Saved but unsubmitted predictions count at lock.
- Edit Predictions returns to editing before the global lock.

## Saving

The intended interface is quiet autosave. The server contract remains a complete atomic bundle with optimistic revision checking. Partial and stale writes are rejected.

## Locking

There are three deliberate timing rules:

1. Prediction content locks globally at the first tournament kick-off.
2. Joker placement can move only between matches that have not kicked off.
3. An audited grace window can exceptionally permit one user to edit one unstarted match until a stated expiry.

The global lock is monotonic and cannot be reopened by changing fixture data.

## Jokers

Jokers are a core feature.

- A joker applies the central ruleset multiplier to eligible points from one match.
- The server enforces caps and kick-off timing.
- A joker on a started match is fixed.
- Exact group and knockout caps remain visibly unresolved until approved.
- Legacy confidence fields are not jokers.

## Bracket contexts

- Guest/explore: browser-only, editable, unscored.
- Signed-in predicted: stored, scored and frozen under the contracts above.
- Live: derived from real results and read-only to ordinary users.

All contexts must use one canonical resolver. Predicted and live brackets are never blended.
