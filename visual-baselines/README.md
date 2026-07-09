# Visual regression baselines

This directory holds the **blessed** screenshots the hard visual-regression gate
(`npm run check:visual`) compares against. It is deliberately **empty of PNGs right
now**: several reference prototypes are mid-amendment awaiting owner re-approval, and a
baseline blessed against an unapproved contract would enforce the wrong picture.

## The blessing workflow (owner act, never a side effect)

1. Re-approve the prototype/contract for the page (recorded in the Decision Register per
   the usual visual-contract process).
2. `npm run visual:capture` — deterministic screenshots of the built app (and prototypes)
   at 390/820/1280 against the canonical local dataset with a frozen clock.
3. `npm run visual:diff` — open `visual-artifacts/conformance-report/index.html` and
   eyeball the built page against its contract (advisory, replaces manual side-by-sides).
4. When satisfied:
   `npm run visual:bless -- --pages <keys> --note "<who approved this and why>"`
   The note is mandatory and appended to `BLESS-LOG.md`; the freshness run-record updates.
5. Commit `visual-baselines/` and `visual-tests/visual-run-record.json` together.

From the first blessed PNG onward, `npm run check:visual` fails on any pixel drift beyond
the anti-flake threshold (see `visual-tests/visual.config.mjs`), and the main check chain's
`audit:visual-freshness` fails whenever visual-affecting files change without the visual
tier having been re-run. Re-blessing over a failing gate is a contract amendment and must
say so in the note.
