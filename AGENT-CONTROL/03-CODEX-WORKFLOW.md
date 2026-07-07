# Codex Workflow

## Pre-Flight Checklist

Run the task's requested pre-flight first. When no explicit checklist is supplied, confirm:

- current working directory
- current branch
- `git status --short`
- recent commit context when relevant
- the specific files and docs needed for the task

Stop if the worktree state conflicts with the task.

## Stop Conditions

Stop and report on instruction conflicts, dirty-worktree risk, unapproved migrations, production config risk, secrets exposure, missing proof for completion, or any task that would require broadening scope.

## Command Discipline

- Prefer focused read-only inspection before edits.
- Do not run broad tests or `npm run check` unless requested or appropriate for the stage.
- Do not run destructive commands.
- Do not use `sudo`.
- Do not use `npm audit fix --force`.
- Do not use `git add .`.

## Diff Inspection Rule

Before final reporting, inspect the relevant diff. Confirm only intended files changed.

## Commits

No commits unless Nicky explicitly approves them.

## Copy-Back

Every task ends with the fixed copy-back report in `AGENT-CONTROL/04-COPY-BACK-REPORT.md`.

## Visual Approval

UI/layout work requires human visual approval. Browser checks can support the review, but Nicky's layout-sensitive approval remains required.
