# Visual Review Rules

- UI/layout stages require manual visual review.
- Visual review should not be left until the very end.
- Preferred order: code change, focused tests, quick browser visual check, docs/audits, full checks, final visual review.
- Visual contracts in `docs/reference-prototypes/` are binding references but not production code.
- Do not port prototype HTML/CSS directly into `src/`.
- Playwright must not be claimed unless actually installed and wired.
- Visual approval by Nicky remains required for layout-sensitive changes.
