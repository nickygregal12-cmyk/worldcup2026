> **ARCHIVED 2026-07-10** — historical stage evidence / completed spec. Superseded as working guidance by the living document set indexed in `AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md`. Content preserved verbatim below; audit scripts may still assert markers in this file.

# Stage 13G-H2 — Product-facing alignment and reference-asset decision

## Status

Accepted as a docs and audit alignment batch before the next product build.

No application route, component, scoring rule, resolver rule, database policy or migration is changed by H2.

## Scope

Stage 13G-H2 freezes the next product-facing direction before build work starts. It exists to prevent broad rewrites and to make sure the next batches are small, inspectable and aligned with the actual product state.

H2 covers:

- the official UEFA EURO 2028 logo/reference-asset decision;
- the leagues FPL-style reference pattern evaluation;
- dedicated player view route contract direction;
- Tournament Picks player-facing entry scheduling;
- guest signup import prompt direction;
- the recommended next tight build order.

## Safety rules preserved

- WC26 production project `ouhxawizadnwrhrjppld` stays blocked.
- Euro staging project remains `gcfdwobpnanjchcnvdco`.
- Active migrations remain 18.
- No Migration 019 is created.
- No service-role credential, local env secret or production key is committed.
- Original Predictor and KO Predictor remain separate competitions.
- No `git add .`, no `sudo`, no `npm audit fix --force`.

## Official UEFA EURO 2028 logo decision

Decision: **drop for now**.

The official UEFA EURO 2028 logo, trophy rendering, tournament wordmark and wider UEFA competition identity are not approved as deployable application assets for this project unless explicit usage permission/licence is obtained and recorded later. This also applies to copies labelled as public domain, open licence, free download or unofficial web image, because the underlying tournament marks can still create trademark/affiliation risk.

Reasoning:

- the app needs an independent app mark, not official tournament branding;
- using the official logo as the app logo, header mark, favicon, Open Graph image or primary visual identity could wrongly imply official UEFA affiliation;
- the Design Charter already reserves custom assets for a future independent app mark;
- avoiding the asset keeps the project safer and does not block the next product batch.

Permitted direction:

- keep the product name and copy plain and descriptive;
- use the existing semantic design tokens;
- create a future independent app mark if needed;
- take only high-level inspiration from football energy, host-nation colour contrast and match-night atmosphere;
- do not trace, crop, recolour, darken, simplify or restyle the official UEFA logo into a near-copy.

## Leagues reference pattern evaluation

The WC26/FPL-style screenshot is reference only. It must not be copied. Each adopted pattern must improve on the reference and must fit the Euro design system.

| Pattern | H2 decision | Reasoning | Build guard |
|---|---|---|---|
| Glanceable rank story | adopt-improved | A league table should feel like a race, not a plain database table. Rank, points, competition scope and current user context should be readable in one glance. | Use existing standings data first. Do not add decoration that obscures table reading. |
| Rank movement up/down | adapt | Movement is valuable only if there is a reliable previous scoring-run snapshot. Fake movement would damage trust. | Show movement only after a real previous-rank source exists. Until then use neutral copy or omit the movement column. |
| Top-three treatment | adopt-improved | Top positions should feel special, but the project has a no-emoji-icons rule and gold is reserved for meaningful roles. | Use designed rank chips or tier treatment. Do not use medal emoji. Do not use trophy/UEFA imagery. |
| Viewer own row anchoring | adopt-improved | A player should instantly find themselves in a league. | Use the shared player identity primitive and an accessible YOU treatment. For long tables, add an anchored self summary if needed. |
| Gap to leader | adopt-improved | “37 behind leader” gives casual players immediate race context. | Calculate from the same competition-scoped standings list. Leader says “Leader”; tied leader says “Level with leader”. Never combine Original and KO points. |
| Copy the reference layout | drop | The screenshot proves useful interaction patterns only. Copying its visual layout would not fit the Euro design rules. | Build natively in Euro tokens, components and copy. |

## Dedicated player view route direction

The accepted product direction remains a dedicated player view, but H2 does not build it.

Future route contract to assess in the implementation batch:

- `#/player/:userId` for player overview;
- `#/player/:userId/head-to-head?against=me` for direct comparison;
- `#/player/:userId/points` for the points breakdown.

Implementation guardrails:

- player-name activation uses the shared player identity primitive;
- self identity remains non-interactive where opening the same player would be circular;
- pre-lock and private prediction states must explain what is hidden and why;
- Original evidence and KO Predictor evidence remain separate;
- route registration, access-map updates and route-integrity audit changes must happen in the same build commit.

## Tournament Picks player-facing entry direction

Tournament Picks contract/admin readiness is functional. Ordinary player entry remains partial.

H2 decision: do **not** move Tournament Picks player entry into this docs/audit batch.

Recommended schedule:

- keep the entry surface scheduled for Stage 17A unless Nicky explicitly accepts moving it earlier;
- if moved earlier, build it as an Original Predictor surface only;
- include total tournament goals, top scorer and highest-scoring team;
- use the central ruleset values and one global lock;
- no jokers and no KO Predictor points.

## Guest signup import direction

The next small product-facing build should be the guest import prompt and signed-in copy sweep.

Accepted copy contract:

- prompt: “Import your saved Euro 2028 predictions?”
- helper copy mentions group scores, bracket and KO Predictor draft found on this device;
- primary action: “Import predictions to my account”;
- secondary action: “Start fresh”;
- signed-in account copy must not mention “browser draft”.

This is the recommended first build after H2 because the engine already exists and the change is narrow, player-facing and easy to verify.

## Recommended next build order

1. Stage 13G-C1 — guest import prompt and signed-in copy sweep.
2. Stage 13G-C2 — leagues rank-story presentation using only existing trustworthy standings data.
3. Stage 13G-C/D — dedicated player view, H2H and points-breakdown routes.
4. Tournament Picks player entry only if its schedule move is explicitly accepted.
5. Stage 15/16 only after the product-facing alignment work is no longer carrying unresolved route/copy promises.

## Acceptance evidence

H2 acceptance requires:

- this document added;
- governing roadmap/register/ledger updated;
- third-party asset guidance updated to reject the official UEFA logo as a deployable asset without permission;
- `audit:h2-product-alignment` added to `npm run check`;
- active migrations still 18;
- no Migration 019;
- no deployable official UEFA EURO 2028 logo asset in `public/` or `src/assets/`.
