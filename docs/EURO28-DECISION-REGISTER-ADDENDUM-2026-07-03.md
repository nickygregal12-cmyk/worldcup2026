# EURO 2028 PREDICTOR
## Decision Register Addendum — 3 July 2026
### Reconciled for Stage 13F-K3 staging acceptance and Admin close-out

## Confirmed decisions

1. One global Original Predictor lock. Per-league lock modes and prediction snapshots are rejected.
2. Daily Questions are rejected.
3. Extra tournament picks belong inside the Original Predictor, lock globally, use no joker, score through the central versioned ruleset and never affect KO Predictor points. The final list is total tournament goals, top scorer and highest-scoring team. Each is worth 20 points. Total goals awards full points to every equally nearest prediction; official joint winners are accepted for the scorer and team picks. None is a tournament tiebreaker. The player selector activates only when the official player pool exists in Stage 17A.
4. Share Card is deferred to the end of the product/design roadmap. It is built only if final design identifies a natural location and genuine value.
5. PWA and push notifications are carried as one Euro-native feature in Stage 18C. They ship only if installation, service-worker lifecycle, consent, preferences, unsubscribe and delivery are demonstrably functional.
6. Offline players are carried as managed private-league participants with secure account claim in Stage 16E.
7. Lucky Dip is carried into the Euro Groups Predictor without odds or inherited WC26 code.
8. Odds and weather are rejected from the core Match Centre. A trustworthy live minute may be supported if reliable canonical/provider data exists.
9. Guest predictions persist automatically in the same browser. Signup must detect the local draft and offer a safe one-tap account transfer; the local copy is not cleared before confirmed server save.
10. Normal users do not need JSON file import/export controls. A portable recovery tool may exist only if separately justified and kept outside the main onboarding journey.
11. Admin remains server-authorised and must also be invisible in presentation to non-admins.
12. Full-site information architecture is an explicit product requirement. Every approved capability must have a clear primary entry point, contextual entry points and direct/deep-link behaviour where appropriate.
13. Player insight reads canonical awarded point rows only. Original and KO stories stay separate. There is no separate group-position category, subjective toughest-call score or historical-rank claim without a canonical contract. Authorised other-player detail reuses the existing Original global-lock and KO fixture-release privacy boundaries through read-only Migration 017.
14. Stage 16 opens with Stage 16A provisional teams, synthetic users and deterministic scenario seeding against Euro staging only. The batch includes exactly 24 provisional teams, nineteen approved deterministic personas, populated Original/KO journeys, large/tiny/multiple/no-league cases, an independent expected-points oracle and exact marker-safe teardown.
15. Synthetic accounts require both the reserved `@synthetic.euro28.test` domain and `synthetic_euro28: true` auth metadata. Service-role credentials and shared passwords remain local and uncommitted.
16. Submitted and unsubmitted users with identical predictions must score identically. Original and KO Predictor points remain separate in every scenario. Joker caps, engineered ties, partial/no-entry states, bracket survival/death and KO advancing/method variants are mandatory.
17. Seed → validate → teardown → zero residue → reseed is a non-negotiable acceptance path. Real users, administrators, tournament configuration and staging controls must remain untouched.
18. The real irreversible global lock must never be triggered during shared-staging simulation. A separately packaged staging-effective database-time contract is approved in principle, provided it fails closed outside the provisional Euro staging tournament and changes no scoring or resolver rule.
19. A separately packaged privacy-safe synthetic badge contract is approved in principle. Authorised reads may expose only `is_synthetic`; another user's email and raw auth metadata must never be exposed.
20. Stage 13G is one holistic information-architecture and coherent-interface pass. Nothing may be bolted onto a convenient page without a designed destination and contextual owner.
21. More is a curated phase-aware destination. Before KO readiness it may contain a KO explainer teaser but not unresolved fixtures or active prediction controls. Home gives the later competition only modest secondary prominence until readiness.
22. Upcoming fixtures order by next real kick-off and completed results order most-recent-first. Group-stage views support shared By group and By date presentations, defaulting by tournament phase while respecting manual choice.
23. Tournament is a key destination. Its scoring, joker, lock, sharing and competition-separation guide renders from versioned contracts/configuration so visible rules cannot drift.
24. Any player name opens one shared authorised player overview. Any team name uses `TeamLabel`. Existing privacy rules apply independently to each overview section.
25. League invites use one-tap copy and rich previews. Static Euro metadata is mandatory; dynamic per-league title/description with a static Euro image is approved. Member names, standings, owner email and predictions are never preview metadata.
26. Stage 13G follows Stage 13F-K. Stage 16A seeding interleaves after Stage 13G-C, and Stage 13G-D uses that cast for whole-app coherence and Scotland profile proof. Stage 13P-A begins only after Stage 13G acceptance.
27. Fixture schedule editing is owner-only and covers scheduled date, kick-off, venue and schedule status. It never edits participant identity, group membership, match numbering, fixture code, resolver slots or knockout allocation.
28. Fixture writes require a persisted optimistic `fixture_revision`, valid venue membership, pending/unscored result state, permitted match status, date/time consistency and a non-empty audit note.
29. Whole-tournament scoring reconciliation is owner-only, note-gated, feature-controlled and replacement-based. It calls the existing canonical recalculation path with all matches, preserves run history and never merges Original/KO totals.
30. Migration 018 is approved for Stage 13F-K1 only. It may add fixture revision/read/write contracts, full reconciliation, readiness output and two append-only event values. It adds no tournament-pick storage, official players, participant assignment, scoring values, manual point edits, resolver change, external provider or new Admin role.
31. Stage 13F-K2 creates the single Tournament Picks Admin readiness home. Executable outcome entry, persistence, official player references, scoring and player-facing consumption remain Stage 17A.
32. Stage 13F-K is delivered as K0 documents, K1 database, K2 frontend and K3 staging acceptance. Stage 13G-A cannot begin before K3 closes.
33. Migration 018 implements the accepted K1 contract from `b6c7ddc`: optimistic fixture revision, protected venue/match reads, owner-only fixture scheduling, owner-only full reconciliation and readiness evidence.
34. The only new event values are `fixture_schedule_updated` and `tournament_points_reconciled`. Migration 018 also restores the already accepted `team_profile_updated` value accidentally omitted by Migration 016 while preserving both Time & Phase values.
35. Stage 13F-K1 changes no frontend, participant assignment, resolver rule, scoring value, tournament-pick persistence, manual point edit, provider integration or Admin role.

36. Stage 13F-K2 is frontend-only and retains exactly 18 migrations. It connects only the accepted Migration 018 fixture, reconciliation and readiness contracts.
37. Owner-only fixture and complete-reconciliation actions are absent for results administrators; ordinary users remain unaware of Admin through the accepted route gate.
38. Fixture kick-off input is interpreted in the selected venue timezone, not the browser timezone, and every write retains optimistic `fixture_revision` conflict handling.
39. The Tournament Picks section is a dependency/readiness hand-off only. It contains no fake outcome controls before Stage 17A.
40. Audit filters and expandable detail are read-only views over append-only events; they cannot mutate or delete evidence.
41. Stage 13F-K3 adds no product UI, runtime capability, database object or migration. It is the staging evidence and governing-document close-out for the accepted K1/K2 contracts.
42. K3 fixture evidence must reuse one fixture's exact persisted date, kick-off, venue and schedule status inside a transaction, prove optimistic revision and append-only audit behaviour, then rollback and verify the exact original state. No invented shared-staging kick-off may be saved.
43. K3 uses three distinct real staging accounts: owner, results administrator and ordinary member. Ordinary users remain unaware of Admin; results administrators retain result operations but no fixture or whole-tournament reconciliation action.
44. The irreversible real global lock is prohibited during K3. Complete reconciliation is accepted through one explicit owner UI run with an exact note, completed scoring run and separate Original/KO totals.
45. Stage 13F-K closes only after linked database gates, role walkthroughs, reconciliation verification, full repository/deployed gates and clean alignment. Stage 13G-A is next.

## Pending approvals

- Whether a portable advanced guest-backup tool is retained outside the normal journey.
- Tournament-pick persistence/outcome design remains Stage 17A. Migration 018 is implemented only for Stage 13F-K fixture/reconciliation/readiness operations and preserves the accepted Team Profile and Time & Phase audit values. Managed participants, Stage 13G-C invite-safe/synthetic reads and Stage 16 staging-effective time still require their own exact scopes, tests and migration decisions.
