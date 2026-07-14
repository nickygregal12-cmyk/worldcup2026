# Stage 13C — Original Bracket and KO Predictor match centre

## Status

Frontend-only Stage 13C package built from the verified Stage 13B checkpoint `78882dd`. The database remains at fourteen migrations and no Supabase push is required.

## Permanent Original Predictor bracket

The Bracket destination remains permanent throughout the tournament. It displays the user's pre-tournament predicted knockout path in an explicit **Predicted context**.

Each of the fifteen knockout matches is winner-only:

- choose the team that advances;
- do not enter a score;
- do not choose normal time, extra time or penalties;
- do not place a joker;
- progression points remain part of the Original Predictor only.

The view uses the canonical predicted resolver and shared `<TeamLabel>` component. Unresolved participants display their source slot rather than pretending to be a confirmed team. Global lock, review mode and authorised match-specific grace retain the existing contracts.

## Separate KO Predictor match centre

The KO Predictor is presented as a separate **Real fixture context** and only displays fixtures whose two participants are confirmed.

For each available real knockout match, the user predicts:

- the 90-minute score;
- the team that advances;
- normal time, extra time or penalties;
- whether one of the five KO Predictor jokers applies.

Penalty shoot-out scores are never predicted. A non-draw 90-minute score permits only `normal_time`; a draw permits `extra_time` or `penalties`.

The match centre shows separate KO progress, points and rank. It uses the existing `save_my_ko_prediction_bundle` RPC and competition-specific points services. Original Predictor picks and points are never read into or combined with it.

## Presentation boundary

Predicted and real-fixture contexts have different semantic surface, border and text tokens. The distinction is expressed with text, icons and colour—not colour alone. Both experiences support light and dark themes, keyboard focus, reduced motion, loading/empty/error handling from their existing controller boundaries and responsive layouts at 380, 768 and 1200 pixels.

## Visual baselines

Twelve reference images are stored in `docs/design-baselines/stage13c/`:

- Original Bracket: mobile, tablet and desktop in light and dark;
- KO Predictor: mobile, tablet and desktop in light and dark.

## Quality gates

`npm run audit:knockout-experiences` verifies:

- winner-only Original Bracket controls;
- absence of score, method and joker inputs from that bracket;
- full KO Predictor control set;
- separate points/service boundary;
- hidden unresolved real fixtures;
- shared TeamLabel and ScoreInput use;
- context styling and responsive baselines;
- no Migration 015.

The audit is included in `npm run check` with the full regression suite and production build.
