---
description: Recover from an interrupted session — reconcile the tree against the intended scope, run the check suite, then stop for owner confirmation.
argument-hint: [what the interrupted session was supposed to be doing]
allowed-tools: Bash(git fetch *), Bash(git status *), Bash(git log *), Bash(git diff *), Bash(npm run check)
disable-model-invocation: true
---

# Resume after an interrupted session

A previous session in this working tree died mid-work. Your job right now is **diagnosis, not
repair**. Do not continue the interrupted work, do not "finish off" a half-done edit, and do not
commit anything until the owner has confirmed what you found.

## Intended scope of the interrupted session

$ARGUMENTS

If that scope line is empty, say so and ask the owner what the session was meant to be doing
before going any further — without it you cannot tell intended work from an unrelated mess.

## Tree state (already gathered — read it, don't re-run it)

Fetched from origin:

!`git fetch origin 2>&1 | tail -3; echo "(fetch complete)"`

Working tree:

!`git status --short`

Recent history:

!`git log --oneline -8`

Local vs origin for this branch:

!`git status --short --branch | head -1; git log --oneline --left-right --boundary @{upstream}...HEAD 2>/dev/null | head -10 || echo "(no upstream tracking branch)"`

## What to do

1. **Reconcile the tree against the intended scope above.** For every uncommitted or untracked
   file, state which bucket it falls in:
   - **In scope** — plausibly part of the interrupted work.
   - **Out of scope** — nothing to do with it. This is the dangerous bucket. Per CLAUDE.md §0.2,
     another session writing to this tree is a stop-and-report condition; say so plainly rather
     than absorbing the file into your own work.
   - **Unclear** — you cannot tell. List it; do not guess.

2. **Say whether the work is committed, and whether it is pushed.** Unpushed commits are the
   thing that gets lost. Call out explicitly if HEAD is ahead of origin.

3. **Run the check suite exactly as it is:** `npm run check`. Do not modify, skip, narrow, or
   "temporarily relax" any audit to make it pass — the suite is a ratchet (Constitution §5.8) and
   loosening it to get green is a violation, not a fix. Report **green or red**. If red, quote the
   failing audit and its message verbatim; do not begin fixing it.

4. **STOP.** Present a short recovery summary:
   - what the tree contains, bucketed as above
   - committed / pushed status
   - check suite: green or red (with the failing audit if red)
   - your recommended next step, as a proposal

   Then wait for the owner to confirm before doing any further work. Ending your turn here is the
   correct outcome — an unprompted "so I went ahead and fixed it" is the failure mode this command
   exists to prevent.
