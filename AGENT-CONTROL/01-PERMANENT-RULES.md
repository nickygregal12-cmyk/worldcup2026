# Permanent Rules

## Project Identity

- Project: Euro 2028 Predictor.
- Product owner: Nicky.
- Use British English in code-facing copy, docs and UI text.
- Build for mobile-first casual users.

## Product Invariants

- Original Predictor and KO Predictor must stay separate.
- There is one canonical resolver.
- Scoring lives centrally.
- Guest mode is browser-only and unscored.
- Admin is invisible to non-admins.
- Privacy gates are absolute.
- Public signup must not open unless explicitly approved.
- Fake/simulated results must never affect official data or real points.
- WC26 production is blocked.
- Do not invent tournament data.

## Safety Rules

- No secrets in repo or prompts.
- No `sudo`.
- No `npm audit fix --force`.
- No `git add .`.
- Do not commit unless explicitly approved.
