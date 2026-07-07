# STAGE-WELCOME-PAGE-CONTRACT — Welcome page visual contract (draft)

Status: draft candidate — not yet approved. Recorded for review before any implementation work begins.
Type: docs/reference-prototype only. No runtime UI, routes, Auth, Supabase writes, scoring, resolver behaviour or migrations are touched by this stage.

## Purpose and scope

This stage proposes a new Welcome page: a one-time (or easily revisitable) screen shown to a player immediately after their first sign-in, before they have made any predictions. Its only job is to make the very next action obvious — what the app is for, in three short steps, and one clear place to go next. It is not a rules reference and not a feature tour; How to Play and Home already own that ground.

## Deliberate exclusions

The Welcome page does not add:

- a feature tour of the app — Home, Bracket, Leagues, Match Centre and Results already exist as their own destinations and are not summarised here;
- scoring rules, point values or lock-time detail — that is How to Play's job, and duplicating it here would risk drifting out of sync with the same central scoring configuration How to Play already reads live;
- a leagues explainer or invite/join flow — Leagues is reachable once a player is oriented, not before, and league mechanics are a separate concern from "what is this app";
- settings, account or admin content of any kind;
- a guest/sign-up pitch — this page is shown only after a player has already signed in, so unlike Home's signed-out state it never needs to persuade anyone to create an account;
- persistent bottom navigation — this is a focused, single-path screen with exactly two ways forward (start predicting, or read the rules first), not a browsable destination a player lands on repeatedly.

## Approved content (once this contract is signed off)

1. A short, warm headline welcoming the player — no generic filler.
2. Exactly three short steps, in plain language: predict match outcomes, earn points, compare against friends and leagues. This mirrors the three basics named in the product brief precisely. A fourth step (jokers, bracket mechanics, lock timing) was deliberately left out as scoring-mechanic depth that belongs to How to Play, not this screen — adding a fourth step here would be exactly the kind of "explain everything" scope creep this page exists to avoid.
3. One unmistakable primary call-to-action — "Start your predictions" — routing to the Groups predictor entry point. It is the largest, highest-contrast touch target on the page.
4. One clearly secondary, lower-visual-weight link to How to Play, for anyone who wants the full rules before starting. Styled as plain text, not a button, so it cannot compete with the primary action.

## Routing

- **From:** shown once a player completes their first sign-in (or sign-up), before they reach Home or make any prediction. Not shown to guests (who have not signed in), and not shown to a returning signed-in player who has already completed it — subject to the open question below.
- **To — primary path:** the Groups predictor entry point (the same destination Home's "Your predictions" card and the bottom-nav Groups tab open).
- **To — secondary path:** the How to Play destination.

## Open question — shown once, or reachable again later?

Two options were considered:

- **Shown once only**, gated behind a flag set the first time a player reaches Home or completes sign-up, and never shown again automatically or on demand.
- **Shown once automatically, but also reachable again on demand** — for example, a small "Getting started" link surfaced from Account or More, for a player who wants the orientation screen back later (for instance, after a long gap between signing up and predictions actually opening).

**Recommendation: the second option.** A one-time-only screen with no way back means a player who dismisses it too quickly, or who returns after a long gap, has no lightweight way to re-orient themselves short of reading the full How to Play page. Making it reachable again costs very little — it is a static, cheap screen with no personalised state — and fits the app's existing pattern of layering a fast, low-commitment surface in front of a deeper reference surface, rather than only offering one or the other.

This is a recommendation only. The actual decision — and, if reachable again, exactly where in Account/More it would live and what it should be called there — needs explicit review and is not decided by this stage.

## Safety and non-goals

This stage is docs/reference-prototype only. It does not change:

- runtime UI or routes;
- Auth configuration or the sign-in/sign-up flow;
- Supabase schema, RPCs, RLS or service-role use;
- scoring engine or resolver behaviour;
- migrations. Active migrations remain 18; Migration 019 is not created.

## Implementation note

A later implementation stage may build the Welcome page from this contract once Nicky approves it or an explicitly merged variant, per the Design Charter's visual-contract rules. That stage must resolve the open question above, wire the two navigation targets to their real routes, decide exactly what "first sign-in" means as a trigger condition, and add acceptance coverage — none of which is proven or gated by this drafting stage.

Marker record: warm one-time headline, no generic filler; exactly three steps (predict, score, compare); one primary CTA to the Groups predictor entry point; one secondary lower-weight link to How to Play; no feature tour, scoring breakdown, leagues explainer, settings or admin content; no persistent bottom navigation; shown-once-vs-reachable-again left as an open decision.
