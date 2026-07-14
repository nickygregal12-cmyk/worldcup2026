---
description: Stage preflight — run the CLAUDE.md §0 session-opening checks and restate the reporting, checkpoint and commit obligations for a piece of staged work.
argument-hint: [stage id/name, e.g. DOC-CONSTITUTION]
allowed-tools: Bash(git pull *), Bash(git fetch *), Bash(git status *), Bash(git log *)
disable-model-invocation: true
---

# Stage preflight — $ARGUMENTS

These are the standing obligations from CLAUDE.md for this stage. They are not optional and they
are not a summary you may reinterpret — where this conflicts with your task brief, CLAUDE.md wins
and you report the conflict rather than resolving it silently.

## 1. Verify the tree before you touch anything (§0.1)

Already gathered:

!`git pull 2>&1 | tail -3`

!`git status --short`

!`git log --oneline -5`

Now **check the brief's premises against what you just read.** If the brief assumes files, counts,
or commits that the tree does not actually show — **STOP and report the discrepancy before doing
any work.** Sessions in this repo have repeatedly acted on stale trees. Verify; do not trust.

If files are changing that you did not change, another session is writing to this tree (§0.2):
stop and report that too.

## 2. Report path — written BEFORE your chat reply

Save the report to:

**`reports/REPORT-$ARGUMENTS-!`date +%F`.md`**

`reports/` is **gitignored** (§2). It never travels between machines and no other session can see
it. The report is written to disk *before* you produce your closing chat reply, and the Copy-Back
Report in that reply is the only channel that actually reaches Nicky — so it must stand alone.

The report must include an **advisory findings** section: anything logically inconsistent,
confusing, or improvable that you noticed. Report it for owner decision; never act on it
unilaterally (§3).

## 3. Checkpoint commits, pushed at natural boundaries

Sessions have died mid-work. **Nothing sits unpushed.** At each natural boundary, commit and push.

- **Never `git add .` or `git add -A`** — stage files explicitly by name (§0.4). A PreToolUse hook
  in this repo blocks the "add everything" forms outright; if you hit it, that is the rule working.
- Push after your work is committed, in the same session, unless told otherwise (§0.3).

## 4. Scope discipline (§3)

Do exactly the scoped task. Side-findings are **logged as notes in the report**, not fixed
opportunistically. Prefer surgical fixes over rewrites. Pushback on a weak instruction is welcome;
silently reinterpreting one is not.

If the work changes anything user-visible, note which pages changed so they join the owner's visual
review queue.

## 5. Green at the end

`npm run check` must be green before you close out. The suite is a **ratchet** — never loosen,
skip, or narrow an audit to make it pass (Constitution §5.8; exceptions require an explicit owner
decision recorded in the code and the commit). If it is red and you cannot fix it within scope,
report red — do not disguise it.

---

Confirm you have read the above and state the tree's condition, then begin the stage task.
