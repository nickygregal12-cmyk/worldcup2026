# Euro 2028 / WC26 Predictor — operations runbook (written for Nicky, not for an agent)

Purpose: the steps you may need to take alone, quickly, with no agent chat open —
during a live matchday if necessary. Fill in the bracketed gaps once and keep this
somewhere you can reach from your phone.

---

## 1. Rolling back a bad deploy (Netlify — ~2 minutes)

1. Log in to Netlify → select the site (wc26predictor1 or euro28-predictor-dev).
2. Open the **Deploys** tab. Every previous deploy is listed with its time and commit.
3. Click the last deploy that was known-good → **Publish deploy**.
4. The site is now serving the old version. Nothing is lost — the bad deploy stays in
   the list and can be re-published after it is fixed.
5. Tell the build agent in the next session: "production was rolled back to deploy
   <time/commit>; the head of the branch is ahead of what is live."

When to use it: any user-visible breakage where you cannot immediately tell why.
Roll back FIRST, diagnose after. A rolled-back site is always better than a broken one.

## 2. Database backups (Supabase)

Standing setup (do once):
- Supabase dashboard → Project → Database → Backups. Free tier keeps daily backups
  for a limited window; note the retention here: [____ days].
- BEFORE any migration is applied to a project with real users: download a manual
  backup first (Database → Backups → Download, or `supabase db dump` if the agent
  provides the command in the install guide — it should).

The rehearsal (do once, then yearly): restore one backup into a scratch Supabase
project and confirm you can see real rows in league tables. Date last rehearsed:
[__________]. An untested backup is a hope, not a backup.

Hard rule for agents: no migration on a project with real users without the line
"backup taken at <time>" in the terminal evidence.

## 3. Secrets rules

- The **anon key** is public by design (it ships in the built site). Fine to use.
- The **service_role key** bypasses ALL row-level security. It is never pasted into
  any chat with any AI agent, never committed, never placed in Netlify env vars for
  the frontend. If it has ever been pasted anywhere: rotate it now
  (Supabase → Settings → API → regenerate) and note the date: [__________].
- 2FA is enabled on: GitHub [ ], Netlify [ ], Supabase [ ]. You are a team of one —
  there is no colleague who can recover a lost account.

## 4. Incident quick-checks (in order)

1. Is it just you? Open the site on phone data, not wifi.
2. Netlify → Deploys: did a deploy happen recently? If yes → Section 1, roll back.
3. Supabase → Project home: any incident banner / is the project paused? (Free-tier
   projects pause after inactivity — Restore takes ~2 minutes.)
4. status.supabase.com and netlifystatus.com — if the platform is down, there is
   nothing to fix; post in the league group chat and wait.
5. If none of the above: screenshot what users see, note the time, start a fresh
   agent session with the current repo zip and the screenshot.

## 5. Uptime monitoring (do once)

Create a free monitor (e.g. UptimeRobot) on the live site URL with email/phone
alerts. You should learn the site is down from a robot, not from a league member.
Monitor created: [ ]  Alert destination: [__________]

## 6. Stage acceptance — the eyes-on rule

Every stage close-out must include a "verify with your eyes" checklist from the
agent: 3–6 concrete things to click on the deployed site and what you should see,
in both light and dark theme where visuals changed. You cannot review the code;
you can absolutely review the behaviour — and the Home contrast bug proves your
eyes catch what 70 audits missed. No checklist, no close-out.

The visual tier now does the screenshotting for you: `npm run visual:diff` produces
`visual-artifacts/conformance-report/index.html` — every contracted page next to its
approved prototype at three widths with a pixel-diff overlay. Open that file for the
side-by-side portion of a review batch instead of taking screenshots by hand. It is
advisory input to your eyes, never a pass/fail verdict.

### 6a. Blessing visual baselines (owner act)

Once you re-approve a page's prototype, bless its screenshots so the hard pixel gate
arms for that page:

1. `npm run visual:seed` (canonical local data) then `npm run visual:capture`.
2. Review `npm run visual:diff` output.
3. `npm run visual:bless -- --pages <keys> --note "<who approved and why>"` — the note
   is mandatory and recorded in `visual-baselines/BLESS-LOG.md`.
4. Commit `visual-baselines/` and `visual-tests/visual-run-record.json` together.

From then on any pixel drift on a blessed page fails `npm run check:visual`, and the
main gate's `audit:visual-freshness` refuses commits that change visual files without
the visual tier having been re-run. Re-blessing over a red gate is a contract
amendment — say so in the note.

## 7. Independent review — the second-agent rule

The agent that built a stage never marks its own homework. Before deploy-and-close,
a SEPARATE session receives the repo zip + the stage doc and answers one question:
"Does the change match the recorded scope — nothing more, nothing less?" Paste its
verdict into the stage evidence.

## 8. Privacy basics (real users, UK)

- The app shows a one-page privacy note: what is stored (email, display name,
  predictions), where (Supabase, EU region: [confirm ____]), and how to ask for
  deletion. In place: [ ]
- You can delete a member's account and data on request within a few days, and the
  admin tooling supports it (or a recorded SQL snippet exists for it). In place: [ ]
- No analytics or trackers you could not explain to the league in one sentence.

## 9. Tournament-day readiness (before any live matchday)

- Quota check: Supabase free-tier limits (concurrent connections, bandwidth) and
  Netlify bandwidth against ~65 users hitting the site at kick-off. Checked: [ ]
- The uptime monitor (Section 5) is live.
- The rollback steps (Section 1) have been rehearsed once on the dev site: [ ]
- You know the last known-good deploy of the live site before the matchday starts.
